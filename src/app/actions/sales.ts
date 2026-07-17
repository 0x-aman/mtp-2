"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import type { ActionResult } from "@/lib/types";
import { createSaleSchema, updateSaleSchema, type CreateSaleInput, type SaleLineInput, type UpdateSaleInput } from "@/lib/validation";

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

function revalidateSalesPaths() {
  for (const route of revalidatedPaths) {
    revalidatePath(route);
  }
}

async function buildSaleLines(tx: Prisma.TransactionClient, inputLines: SaleLineInput[]) {
  const productIds = Array.from(new Set(inputLines.map((line) => line.productId)));
  const products = await tx.product.findMany({
    where: {
      id: {
        in: productIds
      },
      isMachine: false
    }
  });
  const productMap = new Map(products.map((product) => [product.id, product]));
  const requestedQuantityByProduct = new Map<string, number>();

  for (const line of inputLines) {
    const product = productMap.get(line.productId);

    if (!product) {
      throw new Error("One of the selected products no longer exists.");
    }

    requestedQuantityByProduct.set(product.id, (requestedQuantityByProduct.get(product.id) ?? 0) + line.quantity);
  }

  for (const [productId, requestedQuantity] of requestedQuantityByProduct) {
    const product = productMap.get(productId);

    if (!product || product.quantity < requestedQuantity) {
      throw new Error(`${product?.title ?? "Product"} only has ${product?.quantity ?? 0} in stock.`);
    }
  }

  let subtotal = 0;
  let totalCost = 0;
  const lines = inputLines.map((line) => {
    const product = productMap.get(line.productId);

    if (!product) {
      throw new Error("One of the selected products no longer exists.");
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

  return {
    lines,
    subtotal,
    totalCost,
    grossProfit: subtotal - totalCost
  };
}

async function decrementSoldProducts(
  tx: Prisma.TransactionClient,
  lines: Awaited<ReturnType<typeof buildSaleLines>>["lines"],
  logType = "Sale"
) {
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
        type: logType,
        quantity: line.quantity,
        note: `${line.productTitle} sold at Rs ${line.unitPrice.toFixed(2)}.`
      }
    });
  }
}

async function restoreSaleStock(
  tx: Prisma.TransactionClient,
  lines: Array<{ productId: string | null; productTitle: string; quantity: number }>,
  logType: string
) {
  for (const line of lines) {
    if (line.productId) {
      await tx.product.updateMany({
        where: {
          id: line.productId
        },
        data: {
          quantity: {
            increment: line.quantity
          }
        }
      });
    }

    await tx.inventoryLog.create({
      data: {
        productId: line.productId,
        type: logType,
        quantity: line.quantity,
        note: `${line.productTitle} sale quantity restored.`
      }
    });
  }
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
      const saleData = await buildSaleLines(tx, parsed.data.lines);

      const created = await tx.sale.create({
        data: {
          saleDate: parseSaleDate(parsed.data.saleDate),
          customer: null,
          paymentMode: parsed.data.paymentMode,
          subtotal: saleData.subtotal,
          totalCost: saleData.totalCost,
          grossProfit: saleData.grossProfit,
          note: parsed.data.note || null,
          lines: {
            create: saleData.lines
          }
        }
      });

      await decrementSoldProducts(tx, saleData.lines);

      return created;
    });

    revalidateSalesPaths();

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

export async function updateSaleAction(input: UpdateSaleInput): Promise<ActionResult<{ id: string }>> {
  const parsed = updateSaleSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the sale details.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const existingSale = await tx.sale.findUnique({
        where: {
          id: parsed.data.saleId
        },
        include: {
          lines: true
        }
      });

      if (!existingSale) {
        throw new Error("Sale log no longer exists.");
      }

      await restoreSaleStock(tx, existingSale.lines, "Sale Edit");
      const saleData = await buildSaleLines(tx, parsed.data.lines);

      const updated = await tx.sale.update({
        where: {
          id: parsed.data.saleId
        },
        data: {
          saleDate: parseSaleDate(parsed.data.saleDate),
          customer: null,
          paymentMode: parsed.data.paymentMode,
          subtotal: saleData.subtotal,
          totalCost: saleData.totalCost,
          grossProfit: saleData.grossProfit,
          note: parsed.data.note || null,
          lines: {
            deleteMany: {},
            create: saleData.lines
          }
        }
      });

      await decrementSoldProducts(tx, saleData.lines, "Sale Edit");

      return updated;
    });

    revalidateSalesPaths();

    return {
      ok: true,
      message: "Sale updated.",
      data: {
        id: sale.id
      }
    };
  } catch (error) {
    return databaseError(error);
  }
}

export async function deleteSaleAction(saleId: string): Promise<ActionResult> {
  if (!saleId) {
    return {
      ok: false,
      message: "Choose a sale log."
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: {
          id: saleId
        },
        include: {
          lines: true
        }
      });

      if (!sale) {
        throw new Error("Sale log no longer exists.");
      }

      await restoreSaleStock(tx, sale.lines, "Sale Deleted");
      await tx.sale.delete({
        where: {
          id: saleId
        }
      });
    });

    revalidateSalesPaths();

    return {
      ok: true,
      message: "Sale deleted and stock restored."
    };
  } catch (error) {
    return databaseError(error);
  }
}
