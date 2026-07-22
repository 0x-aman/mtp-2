"use client";

import type {
  ActionResult,
  DisplaySettings,
  ProductRecord,
  RentalRecord,
  SaleLineRecord,
  SaleRecord
} from "@/lib/types";
import {
  getLocalDb,
  getLocalNextMachineSku,
  notifyLocalDataChanged,
  queueLocalBackup,
  setLocalDisplaySettings
} from "@/lib/local-db";
import { calculateMarginPercent, calculateRentalCalendarDays, formatCurrency } from "@/lib/utils";
import {
  bulkStockSchema,
  createRentalSchema,
  createSaleSchema,
  csvProductSchema,
  displaySettingsSchema,
  machineSchema,
  productSchema,
  updateSaleSchema,
  type CreateRentalInput,
  type CreateSaleInput,
  type MachineInput,
  type ProductInput,
  type SaleLineInput,
  type UpdateSaleInput
} from "@/lib/validation";

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function cleanText(value: string | null | undefined) {
  const text = value?.trim();

  return text ? text : null;
}

function parseSaleDate(value?: string | null) {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(`${value}T12:00:00`);

  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function localError<T = undefined>(error: unknown, fallback = "Browser database action failed."): ActionResult<T> {
  return {
    ok: false,
    message: error instanceof Error ? error.message : fallback
  };
}

function cleanProductInput(input: ProductInput): Omit<ProductRecord, "id" | "createdAt" | "updatedAt"> {
  return {
    title: input.title,
    sku: input.sku.toUpperCase(),
    brand: cleanText(input.brand),
    category: cleanText(input.category),
    description: cleanText(input.description),
    costPrice: input.costPrice,
    sellingPrice: input.sellingPrice,
    marginPercent: calculateMarginPercent(input.costPrice, input.sellingPrice),
    quantity: input.quantity,
    reorderLevel: input.reorderLevel,
    imageUrl: input.imageUrl || null,
    isMachine: input.isMachine,
    defaultRentDeposit: input.isMachine ? input.defaultRentDeposit : null,
    defaultDailyRent: input.isMachine ? input.defaultDailyRent : null
  };
}

function cleanMachineInput(input: MachineInput): Omit<ProductRecord, "id" | "sku" | "createdAt" | "updatedAt"> {
  return {
    title: input.title,
    brand: cleanText(input.brand),
    category: cleanText(input.category),
    description: cleanText(input.description),
    costPrice: 0,
    sellingPrice: 0,
    marginPercent: 0,
    quantity: input.quantity,
    reorderLevel: 0,
    imageUrl: input.imageUrl || null,
    isMachine: true,
    defaultRentDeposit: input.defaultRentDeposit,
    defaultDailyRent: input.defaultDailyRent
  };
}

async function assertUniqueSku(sku: string, currentProductId?: string) {
  const existing = await getLocalDb().products.where("sku").equals(sku.toUpperCase()).first();

  if (existing && existing.id !== currentProductId) {
    throw new Error("A product with this SKU already exists.");
  }
}

async function addActivity(input: Omit<import("@/lib/types").ActivityRecord, "id" | "createdAt">) {
  await getLocalDb().activity.add({
    id: makeId("activity"),
    createdAt: nowIso(),
    ...input
  });
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
    const db = getLocalDb();
    const timestamp = nowIso();
    const data = cleanProductInput({
      ...parsed.data,
      isMachine: false,
      defaultRentDeposit: 0,
      defaultDailyRent: 0
    });
    const id = makeId("product");

    await db.transaction("rw", db.products, db.activity, async () => {
      await assertUniqueSku(data.sku);
      await db.products.add({
        id,
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp
      });
      await addActivity({
        productId: id,
        productTitle: data.title,
        type: "Product Created",
        quantity: data.quantity,
        note: `${data.title} added to inventory.`
      });
    });

    notifyLocalDataChanged();
    queueLocalBackup("product-created");

    return {
      ok: true,
      message: "Product created.",
      data: {
        id
      }
    };
  } catch (error) {
    return localError(error);
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
    const db = getLocalDb();
    const data = cleanProductInput({
      ...parsed.data,
      isMachine: false,
      defaultRentDeposit: 0,
      defaultDailyRent: 0
    });

    await db.transaction("rw", db.products, db.activity, async () => {
      const current = await db.products.get(id);
      if (!current) {
        throw new Error("Product no longer exists.");
      }

      await assertUniqueSku(data.sku, id);
      await db.products.put({
        ...current,
        ...data,
        id,
        createdAt: current.createdAt,
        updatedAt: nowIso()
      });
      await addActivity({
        productId: id,
        productTitle: data.title,
        type: "Product Updated",
        quantity: data.quantity,
        note: `${data.title} details were updated.`
      });
    });

    notifyLocalDataChanged();
    queueLocalBackup("product-updated");

    return {
      ok: true,
      message: "Product updated."
    };
  } catch (error) {
    return localError(error);
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
    const db = getLocalDb();
    const timestamp = nowIso();
    const id = makeId("machine");
    const sku = await getLocalNextMachineSku();
    const data = cleanMachineInput(parsed.data);

    await db.transaction("rw", db.products, db.activity, async () => {
      await db.products.add({
        id,
        sku,
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp
      });
      await addActivity({
        productId: id,
        productTitle: data.title,
        type: "Machine Created",
        quantity: data.quantity,
        note: `${data.title} added as a rentable machine.`
      });
    });

    notifyLocalDataChanged();
    queueLocalBackup("machine-created");

    return {
      ok: true,
      message: "Machine created.",
      data: {
        id
      }
    };
  } catch (error) {
    return localError(error);
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
    const db = getLocalDb();
    const data = cleanMachineInput(parsed.data);

    await db.transaction("rw", db.products, db.activity, async () => {
      const current = await db.products.get(id);
      if (!current) {
        throw new Error("Machine no longer exists.");
      }

      await db.products.put({
        ...current,
        ...data,
        id,
        sku: current.sku,
        createdAt: current.createdAt,
        updatedAt: nowIso()
      });
      await addActivity({
        productId: id,
        productTitle: data.title,
        type: "Machine Updated",
        quantity: data.quantity,
        note: `${data.title} machine details were updated.`
      });
    });

    notifyLocalDataChanged();
    queueLocalBackup("machine-updated");

    return {
      ok: true,
      message: "Machine updated."
    };
  } catch (error) {
    return localError(error);
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  try {
    const db = getLocalDb();

    await db.transaction("rw", db.products, db.sales, db.rentals, db.activity, async () => {
      const product = await db.products.get(id);
      if (!product) {
        throw new Error("Product no longer exists.");
      }

      await db.products.delete(id);

      const sales = await db.sales.toArray();
      await db.sales.bulkPut(
        sales.map((sale) => ({
          ...sale,
          lines: sale.lines.map((line) =>
            line.productId === id
              ? {
                  ...line,
                  productId: null
                }
              : line
          )
        }))
      );

      const rentals = await db.rentals.where("productId").equals(id).toArray();
      await db.rentals.bulkPut(rentals.map((rental) => ({ ...rental, productId: null })));

      const activity = await db.activity.where("productId").equals(id).toArray();
      await db.activity.bulkPut(activity.map((item) => ({ ...item, productId: null })));

      await addActivity({
        productId: null,
        productTitle: product.title,
        type: "Product Deleted",
        quantity: product.quantity,
        note: `${product.title} (${product.sku}) was deleted.`
      });
    });

    notifyLocalDataChanged();
    queueLocalBackup("product-deleted");

    return {
      ok: true,
      message: "Product deleted."
    };
  } catch (error) {
    return localError(error);
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
    const db = getLocalDb();

    await db.transaction("rw", db.products, db.sales, db.rentals, db.activity, async () => {
      const products = await db.products.where("id").anyOf(productIds).toArray();
      await db.products.bulkDelete(productIds);

      const productIdSet = new Set(productIds);
      const sales = await db.sales.toArray();
      await db.sales.bulkPut(
        sales.map((sale) => ({
          ...sale,
          lines: sale.lines.map((line) =>
            line.productId && productIdSet.has(line.productId)
              ? {
                  ...line,
                  productId: null
                }
              : line
          )
        }))
      );

      const rentals = await db.rentals.toArray();
      await db.rentals.bulkPut(rentals.map((rental) => (rental.productId && productIdSet.has(rental.productId) ? { ...rental, productId: null } : rental)));

      await addActivity({
        productId: null,
        productTitle: null,
        type: "Product Deleted",
        quantity: products.length,
        note: `${products.length} products bulk deleted.`
      });
    });

    notifyLocalDataChanged();
    queueLocalBackup("products-deleted");

    return {
      ok: true,
      message: "Selected products deleted."
    };
  } catch (error) {
    return localError(error);
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
    const db = getLocalDb();

    await db.transaction("rw", db.products, db.activity, async () => {
      const products = await db.products.where("id").anyOf(parsed.data.productIds).toArray();
      await db.products.bulkPut(
        products.map((product) => {
          const quantity =
            parsed.data.mode === "set"
              ? parsed.data.quantity
              : parsed.data.mode === "add"
                ? product.quantity + parsed.data.quantity
                : Math.max(0, product.quantity - parsed.data.quantity);

          return {
            ...product,
            quantity,
            updatedAt: nowIso()
          };
        })
      );
      await addActivity({
        productId: null,
        productTitle: null,
        type: parsed.data.mode === "reduce" ? "Stock Reduced" : "Stock Added",
        quantity: parsed.data.quantity,
        note: `${products.length} products updated in bulk.`
      });
    });

    notifyLocalDataChanged();
    queueLocalBackup("stock-updated");

    return {
      ok: true,
      message: "Stock updated."
    };
  } catch (error) {
    return localError(error);
  }
}

async function nextSkuInTransaction(prefix = "MPT") {
  const products = await getLocalDb().products.toArray();
  const nextNumber =
    products.reduce((max, product) => {
      const value = Number(product.sku.replace(`${prefix}-`, ""));

      return product.sku.startsWith(`${prefix}-`) && Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0) + 1;

  return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
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
    const db = getLocalDb();
    let imported = 0;

    await db.transaction("rw", db.products, db.activity, async () => {
      for (const parsedRow of parsedRows) {
        if (!parsedRow.success) {
          continue;
        }

        const sku = parsedRow.data.sku?.trim() || (await nextSkuInTransaction());
        const input = productSchema.parse({
          ...parsedRow.data,
          sku,
          isMachine: false,
          defaultRentDeposit: 0,
          defaultDailyRent: 0
        });
        const timestamp = nowIso();
        const id = makeId("product");
        const data = cleanProductInput(input);

        await assertUniqueSku(data.sku);
        await db.products.add({
          id,
          ...data,
          createdAt: timestamp,
          updatedAt: timestamp
        });
        await addActivity({
          productId: id,
          productTitle: data.title,
          type: "CSV Import",
          quantity: data.quantity,
          note: `${data.title} imported from CSV.`
        });

        imported += 1;
      }
    });

    notifyLocalDataChanged();
    queueLocalBackup("csv-import");

    return {
      ok: true,
      message: `${imported} products imported.`,
      data: {
        imported
      }
    };
  } catch (error) {
    return localError(error);
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

  const imageUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Image read failed."));
    reader.readAsDataURL(file);
  });

  return {
    ok: true,
    message: "Image saved in browser storage.",
    data: {
      imageUrl
    }
  };
}

async function buildSaleLines(inputLines: SaleLineInput[]) {
  const db = getLocalDb();
  const productIds = Array.from(new Set(inputLines.map((line) => line.productId)));
  const products = await db.products.where("id").anyOf(productIds).toArray();
  const productMap = new Map(products.map((product) => [product.id, product]));
  const requestedQuantityByProduct = new Map<string, number>();

  for (const line of inputLines) {
    const product = productMap.get(line.productId);

    if (!product || product.isMachine) {
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
  const lines = inputLines.map((line): Omit<SaleLineRecord, "id" | "saleId" | "createdAt"> => {
    const product = productMap.get(line.productId);

    if (!product) {
      throw new Error("One of the selected products no longer exists.");
    }

    const unitCost = product.costPrice;
    const unitPrice = line.unitPrice;
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

async function decrementSoldProducts(lines: SaleLineRecord[], logType = "Sale") {
  const db = getLocalDb();

  for (const line of lines) {
    if (!line.productId) {
      continue;
    }

    const product = await db.products.get(line.productId);
    if (product) {
      await db.products.put({
        ...product,
        quantity: Math.max(0, product.quantity - line.quantity),
        updatedAt: nowIso()
      });
    }

    await addActivity({
      productId: line.productId,
      productTitle: line.productTitle,
      type: logType,
      quantity: line.quantity,
      note: `${line.productTitle} sold at Rs ${line.unitPrice.toFixed(2)}.`
    });
  }
}

async function restoreSaleStock(lines: Array<{ productId: string | null; productTitle: string; quantity: number }>, logType: string) {
  const db = getLocalDb();

  for (const line of lines) {
    if (line.productId) {
      const product = await db.products.get(line.productId);
      if (product) {
        await db.products.put({
          ...product,
          quantity: product.quantity + line.quantity,
          updatedAt: nowIso()
        });
      }
    }

    await addActivity({
      productId: line.productId,
      productTitle: line.productTitle,
      type: logType,
      quantity: line.quantity,
      note: `${line.productTitle} sale quantity restored.`
    });
  }
}

function makeSaleRecord(input: {
  id: string;
  saleDate?: string | null;
  paymentMode: SaleRecord["paymentMode"];
  note?: string | null;
  saleData: Awaited<ReturnType<typeof buildSaleLines>>;
  createdAt?: string;
}): SaleRecord {
  const timestamp = nowIso();

  return {
    id: input.id,
    saleDate: parseSaleDate(input.saleDate).toISOString(),
    paymentMode: input.paymentMode,
    subtotal: input.saleData.subtotal,
    totalCost: input.saleData.totalCost,
    grossProfit: input.saleData.grossProfit,
    note: cleanText(input.note),
    createdAt: input.createdAt ?? timestamp,
    updatedAt: timestamp,
    lines: input.saleData.lines.map((line) => ({
      id: makeId("sale-line"),
      saleId: input.id,
      createdAt: timestamp,
      ...line
    }))
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
    const db = getLocalDb();
    const id = makeId("sale");

    await db.transaction("rw", db.products, db.sales, db.activity, async () => {
      const saleData = await buildSaleLines(parsed.data.lines);
      const sale = makeSaleRecord({
        id,
        saleDate: parsed.data.saleDate,
        paymentMode: parsed.data.paymentMode,
        note: parsed.data.note,
        saleData
      });

      await db.sales.add(sale);
      await decrementSoldProducts(sale.lines);
    });

    notifyLocalDataChanged();
    queueLocalBackup("sale-created");

    return {
      ok: true,
      message: "Sale saved.",
      data: {
        id
      }
    };
  } catch (error) {
    return localError(error, "Unable to save sale.");
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
    const db = getLocalDb();

    await db.transaction("rw", db.products, db.sales, db.activity, async () => {
      const existingSale = await db.sales.get(parsed.data.saleId);

      if (!existingSale) {
        throw new Error("Sale log no longer exists.");
      }

      await restoreSaleStock(existingSale.lines, "Sale Edit");
      const saleData = await buildSaleLines(parsed.data.lines);
      const sale = makeSaleRecord({
        id: parsed.data.saleId,
        saleDate: parsed.data.saleDate,
        paymentMode: parsed.data.paymentMode,
        note: parsed.data.note,
        saleData,
        createdAt: existingSale.createdAt
      });

      await db.sales.put(sale);
      await decrementSoldProducts(sale.lines, "Sale Edit");
    });

    notifyLocalDataChanged();
    queueLocalBackup("sale-updated");

    return {
      ok: true,
      message: "Sale updated.",
      data: {
        id: parsed.data.saleId
      }
    };
  } catch (error) {
    return localError(error, "Unable to save sale.");
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
    const db = getLocalDb();

    await db.transaction("rw", db.products, db.sales, db.activity, async () => {
      const sale = await db.sales.get(saleId);

      if (!sale) {
        throw new Error("Sale log no longer exists.");
      }

      await restoreSaleStock(sale.lines, "Sale Deleted");
      await db.sales.delete(saleId);
    });

    notifyLocalDataChanged();
    queueLocalBackup("sale-deleted");

    return {
      ok: true,
      message: "Sale deleted and stock restored."
    };
  } catch (error) {
    return localError(error, "Unable to delete sale.");
  }
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
    const db = getLocalDb();
    const id = makeId("rental");

    await db.transaction("rw", db.products, db.rentals, db.activity, async () => {
      const product = await db.products.get(parsed.data.productId);

      if (!product || !product.isMachine) {
        throw new Error("Choose a rentable machine.");
      }

      const openRentals = await db.rentals
        .where("productId")
        .equals(product.id)
        .and((rental) => rental.status === "OPEN")
        .count();

      if (openRentals >= product.quantity) {
        throw new Error(`${product.title} is not available for rent.`);
      }

      const timestamp = nowIso();
      const rental: RentalRecord = {
        id,
        productId: product.id,
        machineTitle: product.title,
        machineSku: product.sku,
        customerName: cleanText(parsed.data.customerName),
        customerPhone: cleanText(parsed.data.customerPhone),
        deposit: parsed.data.deposit,
        dailyRent: parsed.data.dailyRent,
        paymentMode: parsed.data.paymentMode,
        startedAt: timestamp,
        closedAt: null,
        calendarDays: null,
        rentTotal: null,
        depositBalance: null,
        status: "OPEN",
        note: cleanText(parsed.data.note),
        createdAt: timestamp,
        updatedAt: timestamp
      };

      await db.rentals.add(rental);
      await addActivity({
        productId: product.id,
        productTitle: product.title,
        type: "Rent Started",
        quantity: 1,
        note: `${product.title} rented with ${formatCurrency(parsed.data.deposit)} deposit by ${parsed.data.paymentMode}.`
      });
    });

    notifyLocalDataChanged();
    queueLocalBackup("rent-started");

    return {
      ok: true,
      message: "Rent started.",
      data: {
        id
      }
    };
  } catch (error) {
    return localError(error, "Rental action failed.");
  }
}

export async function closeRentalAction(id: string): Promise<ActionResult> {
  try {
    const db = getLocalDb();

    await db.transaction("rw", db.rentals, db.activity, async () => {
      const current = await db.rentals.get(id);

      if (!current) {
        throw new Error("Rent record was not found.");
      }

      if (current.status === "CLOSED") {
        throw new Error("This rent is already closed.");
      }

      const closedAt = new Date();
      const calendarDays = calculateRentalCalendarDays(current.startedAt, closedAt);
      const rentTotal = current.dailyRent * calendarDays;
      const depositBalance = current.deposit - rentTotal;
      const updated: RentalRecord = {
        ...current,
        status: "CLOSED",
        closedAt: closedAt.toISOString(),
        calendarDays,
        rentTotal,
        depositBalance,
        updatedAt: nowIso()
      };

      await db.rentals.put(updated);
      await addActivity({
        productId: current.productId,
        productTitle: current.machineTitle,
        type: "Rent Closed",
        quantity: 1,
        note: `${current.machineTitle} closed after ${calendarDays} day${calendarDays === 1 ? "" : "s"} with ${formatCurrency(rentTotal)} rent.`
      });
    });

    notifyLocalDataChanged();
    queueLocalBackup("rent-closed");

    return {
      ok: true,
      message: "Rent closed."
    };
  } catch (error) {
    return localError(error, "Rental action failed.");
  }
}

export async function updateDisplaySettingsAction(input: DisplaySettings): Promise<ActionResult<DisplaySettings>> {
  const parsed = displaySettingsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid display settings."
    };
  }

  try {
    await setLocalDisplaySettings(parsed.data);

    return {
      ok: true,
      message: "Display settings saved.",
      data: parsed.data
    };
  } catch (error) {
    return localError(error, "Unable to save display settings.");
  }
}
