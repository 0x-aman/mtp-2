"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import type { ActionResult, ProductRecord } from "@/lib/types";
import { calculateMarginPercent } from "@/lib/utils";
import {
  bulkStockSchema,
  csvProductSchema,
  machineSchema,
  productSchema,
  type MachineInput,
  type ProductInput
} from "@/lib/validation";

const revalidatedPaths = ["/", "/products", "/rent", "/analytics", "/import/csv", "/import/ocr", "/add", "/more", "/sales", "/bill"];

function revalidateInventory() {
  for (const route of revalidatedPaths) {
    revalidatePath(route);
  }
}

function databaseError<T = undefined>(error: unknown): ActionResult<T> {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return {
      ok: false,
      message: "A product with this SKU already exists."
    };
  }

  return {
    ok: false,
    message: error instanceof Error ? error.message : "Database action failed."
  };
}

function cleanInput(input: ProductInput) {
  return {
    title: input.title,
    sku: input.sku.toUpperCase(),
    brand: input.brand || null,
    category: input.category || null,
    description: input.description || null,
    costPrice: input.costPrice,
    sellingPrice: input.sellingPrice,
    marginPercent: calculateMarginPercent(input.costPrice, input.sellingPrice),
    quantity: input.quantity,
    reorderLevel: input.reorderLevel,
    isMachine: input.isMachine,
    defaultRentDeposit: input.isMachine ? input.defaultRentDeposit : null,
    defaultDailyRent: input.isMachine ? input.defaultDailyRent : null,
    imageUrl: input.imageUrl || null
  };
}

function cleanMachineInput(input: MachineInput) {
  return {
    title: input.title,
    brand: input.brand || null,
    category: input.category || null,
    description: input.description || null,
    costPrice: 0,
    sellingPrice: 0,
    marginPercent: 0,
    quantity: input.quantity,
    reorderLevel: 0,
    isMachine: true,
    defaultRentDeposit: input.defaultRentDeposit,
    defaultDailyRent: input.defaultDailyRent,
    imageUrl: input.imageUrl || null
  };
}

async function nextSkuInTransaction(tx: Prisma.TransactionClient, prefix = "MPT") {
  const products = await tx.product.findMany({
    where: {
      sku: {
        startsWith: `${prefix}-`
      }
    },
    select: {
      sku: true
    }
  });

  const nextNumber =
    products.reduce((max, product) => {
      const value = Number(product.sku.replace(`${prefix}-`, ""));

      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0) + 1;

  return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
}

function productRecord(product: {
  id: string;
  title: string;
  sku: string;
  brand: string | null;
  category: string | null;
  description: string | null;
  costPrice: unknown;
  sellingPrice: unknown;
  marginPercent: unknown;
  quantity: number;
  reorderLevel: number;
  imageUrl: string | null;
  isMachine: boolean;
  defaultRentDeposit: unknown;
  defaultDailyRent: unknown;
  createdAt: Date;
  updatedAt: Date;
}): ProductRecord {
  return {
    id: product.id,
    title: product.title,
    sku: product.sku,
    brand: product.brand,
    category: product.category,
    description: product.description,
    costPrice: Number(product.costPrice),
    sellingPrice: Number(product.sellingPrice),
    marginPercent: Number(product.marginPercent),
    quantity: product.quantity,
    reorderLevel: product.reorderLevel,
    imageUrl: product.imageUrl,
    isMachine: product.isMachine,
    defaultRentDeposit: product.defaultRentDeposit == null ? null : Number(product.defaultRentDeposit),
    defaultDailyRent: product.defaultDailyRent == null ? null : Number(product.defaultDailyRent),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString()
  };
}

export async function createProductAction(input: ProductInput): Promise<ActionResult<{ id: string }>> {
  const parsed = productSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the highlighted product fields.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  try {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: cleanInput(parsed.data)
      });

      await tx.inventoryLog.create({
        data: {
          productId: created.id,
          type: "Product Created",
          quantity: created.quantity,
          note: `${created.title} added to inventory.`
        }
      });

      return created;
    });

    revalidateInventory();

    return {
      ok: true,
      message: "Product created.",
      data: {
        id: product.id
      }
    };
  } catch (error) {
    return databaseError(error);
  }
}

export async function updateProductAction(id: string, input: ProductInput): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the highlighted product fields.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: {
          id
        },
        data: cleanInput(parsed.data)
      });

      await tx.inventoryLog.create({
        data: {
          productId: updated.id,
          type: "Product Updated",
          quantity: updated.quantity,
          note: `${updated.title} details were updated.`
        }
      });
    });

    revalidateInventory();

    return {
      ok: true,
      message: "Product updated."
    };
  } catch (error) {
    return databaseError(error);
  }
}

export async function createMachineAction(input: MachineInput): Promise<ActionResult<{ id: string }>> {
  const parsed = machineSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the highlighted machine fields.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  try {
    const machine = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          ...cleanMachineInput(parsed.data),
          sku: await nextSkuInTransaction(tx, "MCH")
        }
      });

      await tx.inventoryLog.create({
        data: {
          productId: created.id,
          type: "Machine Created",
          quantity: created.quantity,
          note: `${created.title} added as a rentable machine.`
        }
      });

      return created;
    });

    revalidateInventory();

    return {
      ok: true,
      message: "Machine created.",
      data: {
        id: machine.id
      }
    };
  } catch (error) {
    return databaseError(error);
  }
}

export async function updateMachineAction(id: string, input: MachineInput): Promise<ActionResult> {
  const parsed = machineSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the highlighted machine fields.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: {
          id
        },
        data: cleanMachineInput(parsed.data)
      });

      await tx.inventoryLog.create({
        data: {
          productId: updated.id,
          type: "Machine Updated",
          quantity: updated.quantity,
          note: `${updated.title} machine details were updated.`
        }
      });
    });

    revalidateInventory();

    return {
      ok: true,
      message: "Machine updated."
    };
  } catch (error) {
    return databaseError(error);
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.delete({
        where: {
          id
        }
      });

      await tx.inventoryLog.create({
        data: {
          type: "Product Deleted",
          quantity: product.quantity,
          note: `${product.title} (${product.sku}) was deleted.`
        }
      });
    });

    revalidateInventory();

    return {
      ok: true,
      message: "Product deleted."
    };
  } catch (error) {
    return databaseError(error);
  }
}

export async function bulkDeleteProductsAction(productIds: string[]): Promise<ActionResult> {
  if (!productIds.length) {
    return {
      ok: false,
      message: "Select at least one product."
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: {
          id: {
            in: productIds
          }
        },
        select: {
          title: true,
          sku: true
        }
      });

      await tx.product.deleteMany({
        where: {
          id: {
            in: productIds
          }
        }
      });

      await tx.inventoryLog.create({
        data: {
          type: "Product Deleted",
          quantity: products.length,
          note: `${products.length} products bulk deleted.`
        }
      });
    });

    revalidateInventory();

    return {
      ok: true,
      message: "Selected products deleted."
    };
  } catch (error) {
    return databaseError(error);
  }
}

export async function bulkStockUpdateAction(input: {
  productIds: string[];
  mode: "add" | "reduce" | "set";
  quantity: number;
}): Promise<ActionResult> {
  const parsed = bulkStockSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid stock update."
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: {
          id: {
            in: parsed.data.productIds
          }
        },
        select: {
          id: true,
          quantity: true
        }
      });

      for (const product of products) {
        const nextQuantity =
          parsed.data.mode === "set"
            ? parsed.data.quantity
            : parsed.data.mode === "add"
              ? product.quantity + parsed.data.quantity
              : Math.max(0, product.quantity - parsed.data.quantity);

        await tx.product.update({
          where: {
            id: product.id
          },
          data: {
            quantity: nextQuantity
          }
        });
      }

      await tx.inventoryLog.create({
        data: {
          type: parsed.data.mode === "reduce" ? "Stock Reduced" : "Stock Added",
          quantity: parsed.data.quantity,
          note: `${products.length} products updated in bulk.`
        }
      });
    });

    revalidateInventory();

    return {
      ok: true,
      message: "Stock updated."
    };
  } catch (error) {
    return databaseError(error);
  }
}

export async function bulkImportProductsAction(rows: unknown[]): Promise<ActionResult<{ imported: number }>> {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      ok: false,
      message: "No CSV rows to import."
    };
  }

  const parsedRows = rows.map((row) => csvProductSchema.safeParse(row));
  const invalidIndex = parsedRows.findIndex((row) => !row.success);

  if (invalidIndex >= 0) {
    const result = parsedRows[invalidIndex];

    return {
      ok: false,
      message: `CSV row ${invalidIndex + 1} has invalid fields.`,
      fieldErrors: result.success ? undefined : result.error.flatten().fieldErrors
    };
  }

  try {
    const imported = await prisma.$transaction(async (tx) => {
      let count = 0;

      for (const parsedRow of parsedRows) {
        if (!parsedRow.success) {
          continue;
        }

        const sku = parsedRow.data.sku?.trim() || (await nextSkuInTransaction(tx));
        const input = productSchema.parse({
          ...parsedRow.data,
          sku
        });
        const created = await tx.product.create({
          data: cleanInput(input)
        });

        await tx.inventoryLog.create({
          data: {
            productId: created.id,
            type: "CSV Import",
            quantity: created.quantity,
            note: `${created.title} imported from CSV.`
          }
        });

        count += 1;
      }

      return count;
    });

    revalidateInventory();

    return {
      ok: true,
      message: `${imported} products imported.`,
      data: {
        imported
      }
    };
  } catch (error) {
    return databaseError(error);
  }
}

export async function uploadProductImageAction(formData: FormData): Promise<ActionResult<{ imageUrl: string }>> {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return {
      ok: false,
      message: "Choose an image to upload."
    };
  }

  if (!file.type.startsWith("image/")) {
    return {
      ok: false,
      message: "Only image uploads are supported."
    };
  }

  if (file.size > 4 * 1024 * 1024) {
    return {
      ok: false,
      message: "Image must be smaller than 4 MB."
    };
  }

  const extension = path.extname(file.name).toLowerCase() || ".png";
  const fileName = `${crypto.randomUUID()}${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const uploadPath = path.join(uploadDir, fileName);

  await mkdir(uploadDir, {
    recursive: true
  });
  await writeFile(uploadPath, Buffer.from(await file.arrayBuffer()));

  return {
    ok: true,
    message: "Image uploaded.",
    data: {
      imageUrl: `/uploads/${fileName}`
    }
  };
}

export async function duplicateProductAction(product: ProductRecord): Promise<ActionResult<{ id: string }>> {
  const nextSku = await prisma.$transaction((tx) => nextSkuInTransaction(tx, product.isMachine ? "MCH" : "MPT"));

  return createProductAction({
    title: `${product.title} Copy`,
    sku: nextSku,
    brand: product.brand ?? "",
    category: product.category ?? "",
    description: product.description ?? "",
    costPrice: product.costPrice,
    sellingPrice: product.sellingPrice,
    quantity: product.quantity,
    reorderLevel: product.reorderLevel,
    isMachine: product.isMachine,
    defaultRentDeposit: product.defaultRentDeposit ?? 0,
    defaultDailyRent: product.defaultDailyRent ?? 0,
    imageUrl: product.imageUrl ?? ""
  });
}
