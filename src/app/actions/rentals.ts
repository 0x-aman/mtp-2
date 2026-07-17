"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import type { ActionResult } from "@/lib/types";
import { calculateRentalCalendarDays, formatCurrency } from "@/lib/utils";
import { createRentalSchema, type CreateRentalInput } from "@/lib/validation";

const rentalPaths = ["/rent", "/", "/analytics"];

function revalidateRentals(productId?: string | null) {
  for (const route of rentalPaths) {
    revalidatePath(route);
  }

  if (productId) {
    revalidatePath(`/products/${productId}`);
  }
}

function databaseError<T = undefined>(error: unknown): ActionResult<T> {
  return {
    ok: false,
    message: error instanceof Error ? error.message : "Rental action failed."
  };
}

function cleanText(value: string | null | undefined) {
  const text = value?.trim();

  return text ? text : null;
}

export async function createRentalAction(input: CreateRentalInput): Promise<ActionResult<{ id: string }>> {
  const parsed = createRentalSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the highlighted rental fields.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  try {
    const rental = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: {
          id: parsed.data.productId
        },
        select: {
          id: true,
          title: true,
          sku: true,
          quantity: true,
          isMachine: true
        }
      });

      if (!product || !product.isMachine) {
        throw new Error("Choose a rentable machine.");
      }

      const openRentals = await tx.rental.count({
        where: {
          productId: product.id,
          status: "OPEN"
        }
      });

      if (openRentals >= product.quantity) {
        throw new Error(`${product.title} is not available for rent.`);
      }

      const created = await tx.rental.create({
        data: {
          productId: product.id,
          machineTitle: product.title,
          machineSku: product.sku,
          customerName: cleanText(parsed.data.customerName),
          customerPhone: cleanText(parsed.data.customerPhone),
          deposit: parsed.data.deposit,
          dailyRent: parsed.data.dailyRent,
          note: cleanText(parsed.data.note),
          status: "OPEN"
        }
      });

      await tx.inventoryLog.create({
        data: {
          productId: product.id,
          type: "Rent Started",
          quantity: 1,
          note: `${product.title} rented with ${formatCurrency(parsed.data.deposit)} deposit.`
        }
      });

      return created;
    });

    revalidateRentals(rental.productId);

    return {
      ok: true,
      message: "Rent started.",
      data: {
        id: rental.id
      }
    };
  } catch (error) {
    return databaseError(error);
  }
}

export async function closeRentalAction(id: string): Promise<ActionResult> {
  try {
    const rental = await prisma.$transaction(async (tx) => {
      const current = await tx.rental.findUnique({
        where: {
          id
        }
      });

      if (!current) {
        throw new Error("Rent record was not found.");
      }

      if (current.status === "CLOSED") {
        throw new Error("This rent is already closed.");
      }

      const closedAt = new Date();
      const calendarDays = calculateRentalCalendarDays(current.startedAt, closedAt);
      const rentTotal = Number(current.dailyRent) * calendarDays;
      const depositBalance = Number(current.deposit) - rentTotal;

      const updated = await tx.rental.update({
        where: {
          id
        },
        data: {
          status: "CLOSED",
          closedAt,
          calendarDays,
          rentTotal,
          depositBalance
        }
      });

      await tx.inventoryLog.create({
        data: {
          productId: current.productId,
          type: "Rent Closed",
          quantity: 1,
          note: `${current.machineTitle} closed after ${calendarDays} day${calendarDays === 1 ? "" : "s"} with ${formatCurrency(rentTotal)} rent.`
        }
      });

      return updated;
    });

    revalidateRentals(rental.productId);

    return {
      ok: true,
      message: "Rent closed."
    };
  } catch (error) {
    return databaseError(error);
  }
}
