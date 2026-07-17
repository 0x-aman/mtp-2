"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import type { ActionResult } from "@/lib/types";
import { createSaleSchema, type CreateSaleInput } from "@/lib/validation";

const revalidatedPaths = ["/", "/sales", "/analytics", "/more", "/bill"];

function parseSaleDate(value?: string | null) {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(`${value}T12:00:00`);

  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function databaseError<T = undefined>(error: unknown): ActionResult<T> {
  return {
    ok: false,
    message:
      error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Error
        ? error.message
        : "Unable to save sale."
  };
}

export async function createSaleAction(input: CreateSaleInput): Promise<ActionResult<{ id: string }>> {
  const parsed = createSaleSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the sale details.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const productIds = Array.from(new Set(parsed.data.lines.map((line) => line.productId)));
      const products = await tx.product.findMany({
        where: {
          id: {
            in: productIds
          },
          isMachine: false
        }
      });
      const productMap = new Map(products.map((product) => [product.id, product]));

      let subtotal = 0;
      let totalCost = 0;
      const lines = parsed.data.lines.map((line) => {
        const product = productMap.get(line.productId);

        if (!product) {
          throw new Error("One of the selected products no longer exists.");
        }

        if (product.quantity < line.quantity) {
          throw new Error(`${product.title} only has ${product.quantity} in stock.`);
        }

        const unitCost = Number(product.costPrice);
        const unitPrice = Number(line.unitPrice);
        const lineTotal = unitPrice * line.quantity;
        const lineCost = unitCost * line.quantity;

        subtotal += lineTotal;
        totalCost += lineCost;

        return {
          productId: product.id,
          productTitle: product.title,
          productSku: product.sku,
          quantity: line.quantity,
          unitPrice,
          unitCost,
          lineTotal,
          lineProfit: lineTotal - lineCost
        };
      });

      const created = await tx.sale.create({
        data: {
          saleDate: parseSaleDate(parsed.data.saleDate),
          customer: parsed.data.customer || null,
          paymentMode: parsed.data.paymentMode,
          subtotal,
          totalCost,
          grossProfit: subtotal - totalCost,
          note: parsed.data.note || null,
          lines: {
            create: lines
          }
        }
      });

      for (const line of lines) {
        await tx.product.update({
          where: {
            id: line.productId
          },
          data: {
            quantity: {
              decrement: line.quantity
            }
          }
        });

        await tx.inventoryLog.create({
          data: {
            productId: line.productId,
            type: "Sale",
            quantity: line.quantity,
            note: `${line.productTitle} sold at Rs ${line.unitPrice.toFixed(2)}.`
          }
        });
      }

      return created;
    });

    for (const route of revalidatedPaths) {
      revalidatePath(route);
    }

    return {
      ok: true,
      message: "Sale saved.",
      data: {
        id: sale.id
      }
    };
  } catch (error) {
    return databaseError(error);
  }
}
