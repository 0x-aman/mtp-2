"use client";

import Dexie, { type Table } from "dexie";

import { defaultDisplaySettings } from "@/lib/app-config";
import type {
  ActivityRecord,
  DashboardMetrics,
  DisplaySettings,
  InventoryDataset,
  ProductFormOptions,
  ProductFormSuggestion,
  ProductRecord,
  RentableMachineRecord,
  RentalDataset,
  RentalMetrics,
  RentalRecord,
  SaleRecord,
  SalesDataset,
  SalesMetrics
} from "@/lib/types";

export const LOCAL_DATA_CHANGED_EVENT = "mpt-local-data-changed";

type LocalSettingsRecord = DisplaySettings & {
  id: "app";
  updatedAt: string;
};

type LocalMetaRecord = {
  key: string;
  value: unknown;
  updatedAt: string;
};

export type LocalSnapshot = {
  version: 1;
  exportedAt: string;
  deviceId: string;
  products: ProductRecord[];
  sales: SaleRecord[];
  rentals: RentalRecord[];
  activity: ActivityRecord[];
  settings: DisplaySettings;
};

export type LocalBackupStatus = {
  deviceId: string;
  persistent: boolean | null;
  lastBackupAt: string | null;
  lastBackupError: string | null;
};

export type CloudSnapshotUpdate = {
  snapshot: LocalSnapshot;
  contentHash: string;
  localContentHash: string;
  deviceId: string;
  exportedAt: string;
  updatedAt: string | null;
};

type LatestCloudSnapshotResponse = {
  ok?: boolean;
  snapshot?: LocalSnapshot;
  dataHash?: string;
  deviceId?: string;
  updatedAt?: string;
};

function snapshotHasBusinessData(snapshot: LocalSnapshot) {
  return Boolean(
    snapshot.products.length ||
      snapshot.sales.length ||
      snapshot.rentals.length ||
      snapshot.activity.length
  );
}

class MptLocalDb extends Dexie {
  products!: Table<ProductRecord, string>;
  sales!: Table<SaleRecord, string>;
  rentals!: Table<RentalRecord, string>;
  activity!: Table<ActivityRecord, string>;
  settings!: Table<LocalSettingsRecord, string>;
  meta!: Table<LocalMetaRecord, string>;

  constructor() {
    super("mpt-local-first-db");

    this.version(1).stores({
      products: "id, sku, title, brand, category, quantity, isMachine, updatedAt, createdAt",
      sales: "id, saleDate, paymentMode, createdAt, updatedAt",
      rentals: "id, productId, status, startedAt, closedAt, createdAt, updatedAt",
      activity: "id, productId, type, createdAt",
      settings: "id",
      meta: "key"
    });
  }
}

let dbInstance: MptLocalDb | null = null;
let backupTimer: number | null = null;

export function getLocalDb() {
  if (typeof window === "undefined") {
    throw new Error("The browser database is only available in the browser.");
  }

  dbInstance ??= new MptLocalDb();

  return dbInstance;
}

export function notifyLocalDataChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(LOCAL_DATA_CHANGED_EVENT));
}

function nowIso() {
  return new Date().toISOString();
}

function sortProducts(products: ProductRecord[]) {
  return [...products].sort((a, b) => {
    const updatedDistance = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

    if (updatedDistance !== 0) {
      return updatedDistance;
    }

    return a.title.localeCompare(b.title);
  });
}

function sortSales(sales: SaleRecord[]) {
  return [...sales].sort((a, b) => {
    const saleDateDistance = new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime();

    if (saleDateDistance !== 0) {
      return saleDateDistance;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function sortRentals(rentals: RentalRecord[]) {
  return [...rentals].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function sortedUnique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b)
  );
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  return date;
}

function startOfWeek() {
  const date = startOfToday();
  const day = date.getDay();
  const distanceFromMonday = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - distanceFromMonday);

  return date;
}

function startOfMonth() {
  const date = startOfToday();
  date.setDate(1);

  return date;
}

function saleItemCount(sale: SaleRecord) {
  return sale.lines.reduce((total, line) => total + line.quantity, 0);
}

export function calculateLocalInventoryMetrics(products: ProductRecord[]): DashboardMetrics {
  return products.reduce(
    (metrics, product) => {
      const inventoryValue = product.costPrice * product.quantity;
      const potentialRevenue = product.sellingPrice * product.quantity;

      metrics.totalProducts += 1;
      metrics.inventoryValue += inventoryValue;
      metrics.potentialRevenue += potentialRevenue;
      metrics.expectedProfit += potentialRevenue - inventoryValue;

      if (product.quantity <= product.reorderLevel) {
        metrics.lowStockProducts += 1;
      }

      return metrics;
    },
    {
      totalProducts: 0,
      inventoryValue: 0,
      potentialRevenue: 0,
      expectedProfit: 0,
      lowStockProducts: 0
    }
  );
}

export function calculateLocalSalesMetrics(sales: SaleRecord[]): SalesMetrics {
  const today = startOfToday().getTime();
  const week = startOfWeek().getTime();
  const month = startOfMonth().getTime();

  return sales.reduce<SalesMetrics>(
    (metrics, sale) => {
      const saleTime = new Date(sale.saleDate).getTime();
      const itemCount = saleItemCount(sale);

      if (saleTime >= today) {
        metrics.todayRevenue += sale.subtotal;
        metrics.todayProfit += sale.grossProfit;
        metrics.todayItems += itemCount;
      }

      if (saleTime >= week) {
        metrics.weekRevenue += sale.subtotal;
        metrics.weekProfit += sale.grossProfit;
      }

      if (saleTime >= month) {
        metrics.monthRevenue += sale.subtotal;
        metrics.monthProfit += sale.grossProfit;
      }

      return metrics;
    },
    {
      todayRevenue: 0,
      todayProfit: 0,
      todayItems: 0,
      weekRevenue: 0,
      weekProfit: 0,
      monthRevenue: 0,
      monthProfit: 0
    }
  );
}

function calculateRentalMetrics(machines: RentableMachineRecord[], rentals: RentalRecord[]): RentalMetrics {
  const openRentals = rentals.filter((rental) => rental.status === "OPEN");

  return {
    machineCount: machines.length,
    availableMachines: machines.reduce((total, machine) => total + machine.availableForRent, 0),
    openRentals: openRentals.length,
    depositsHeld: openRentals.reduce((total, rental) => total + rental.deposit, 0)
  };
}

function productToSuggestion(product: ProductRecord): ProductFormSuggestion {
  return {
    title: product.title,
    sku: product.sku,
    brand: product.brand,
    category: product.category,
    costPrice: product.costPrice,
    sellingPrice: product.sellingPrice,
    quantity: product.quantity,
    reorderLevel: product.reorderLevel,
    isMachine: product.isMachine,
    defaultRentDeposit: product.defaultRentDeposit,
    defaultDailyRent: product.defaultDailyRent
  };
}

function buildFormOptions(products: ProductRecord[]): ProductFormOptions {
  const suggestions = products.map(productToSuggestion).sort((a, b) => a.title.localeCompare(b.title));

  return {
    brands: sortedUnique(products.map((product) => product.brand)),
    categories: sortedUnique(products.map((product) => product.category)),
    products: suggestions,
    skus: sortedUnique(products.map((product) => product.sku)),
    titles: sortedUnique(products.map((product) => product.title))
  };
}

function machineRecord(product: ProductRecord, openRentals: number): RentableMachineRecord {
  return {
    id: product.id,
    title: product.title,
    sku: product.sku,
    brand: product.brand,
    category: product.category,
    quantity: product.quantity,
    defaultRentDeposit: product.defaultRentDeposit,
    defaultDailyRent: product.defaultDailyRent,
    openRentals,
    availableForRent: Math.max(0, product.quantity - openRentals)
  };
}

function nextSkuFromProducts(products: ProductRecord[], prefix: "MPT" | "MCH") {
  const nextNumber =
    products.reduce((max, product) => {
      const value = Number(product.sku.replace(`${prefix}-`, ""));

      return product.sku.startsWith(`${prefix}-`) && Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0) + 1;

  return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
}

async function getMetaValue<T>(key: string): Promise<T | null> {
  const record = await getLocalDb().meta.get(key);

  return record ? (record.value as T) : null;
}

async function setMetaValue(key: string, value: unknown) {
  await getLocalDb().meta.put({
    key,
    value,
    updatedAt: nowIso()
  });
}

export async function getLocalDeviceId() {
  const existing = await getMetaValue<string>("deviceId");

  if (existing) {
    return existing;
  }

  const generated = crypto.randomUUID();
  await setMetaValue("deviceId", generated);

  return generated;
}

export async function getLocalDisplaySettings(): Promise<DisplaySettings> {
  const db = getLocalDb();
  const settings = await db.settings.get("app");

  if (settings) {
    return {
      showCostPrice: settings.showCostPrice,
      showMargin: settings.showMargin
    };
  }

  await db.settings.put({
    id: "app",
    ...defaultDisplaySettings,
    updatedAt: nowIso()
  });

  return defaultDisplaySettings;
}

export async function setLocalDisplaySettings(settings: DisplaySettings) {
  await getLocalDb().settings.put({
    id: "app",
    ...settings,
    updatedAt: nowIso()
  });
  notifyLocalDataChanged();
  queueLocalBackup("settings");
}

async function requestPersistentStorage() {
  if (!("storage" in navigator) || typeof navigator.storage.persist !== "function") {
    return null;
  }

  try {
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

export async function importServerDatabaseSnapshot() {
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    const response = await fetch("/api/bootstrap", {
      cache: "no-store",
      signal: controller.signal
    });
    window.clearTimeout(timeout);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(body?.message ?? "Server database import is unavailable.");
    }

    const body = (await response.json()) as { ok?: boolean; snapshot?: LocalSnapshot };

    if (!body.ok || !body.snapshot) {
      throw new Error("Server database import is unavailable.");
    }

    await importLocalSnapshot(body.snapshot, { preserveDeviceId: true });
    await setMetaValue("lastBootstrapCompletedAt", nowIso());

    return body.snapshot;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Server database import failed.");
  }
}

export async function initializeLocalDb() {
  const db = getLocalDb();
  await db.open();
  await getLocalDeviceId();
  await getLocalDisplaySettings();
  const persistent = await requestPersistentStorage();
  await setMetaValue("persistentStorage", persistent);

  return {
    persistent
  };
}

export async function getLocalInventoryDataset(): Promise<InventoryDataset> {
  await initializeLocalDb();

  const db = getLocalDb();
  const [products, activity, displaySettings] = await Promise.all([
    db.products.filter((product) => !product.isMachine).toArray(),
    db.activity.orderBy("createdAt").reverse().limit(10).toArray(),
    getLocalDisplaySettings()
  ]);
  const productRecords = sortProducts(products);

  return {
    products: productRecords,
    activity,
    metrics: calculateLocalInventoryMetrics(productRecords),
    displaySettings,
    databaseReady: true
  };
}

export async function getLocalProductFormOptions(): Promise<ProductFormOptions> {
  await initializeLocalDb();

  const products = (await getLocalDb().products.filter((product) => !product.isMachine).toArray()).sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  return buildFormOptions(products);
}

export async function getLocalProductById(id: string) {
  await initializeLocalDb();

  return (await getLocalDb().products.get(id)) ?? null;
}

export async function getLocalNextSku() {
  await initializeLocalDb();

  return nextSkuFromProducts(await getLocalDb().products.toArray(), "MPT");
}

export async function getLocalNextMachineSku() {
  await initializeLocalDb();

  return nextSkuFromProducts(await getLocalDb().products.toArray(), "MCH");
}

export async function getLocalSalesDataset(): Promise<SalesDataset> {
  await initializeLocalDb();

  const db = getLocalDb();
  const [products, sales, displaySettings] = await Promise.all([
    db.products.filter((product) => !product.isMachine).toArray(),
    db.sales.orderBy("saleDate").reverse().limit(300).toArray(),
    getLocalDisplaySettings()
  ]);
  const saleRecords = sortSales(sales);

  return {
    products,
    sales: saleRecords,
    metrics: calculateLocalSalesMetrics(saleRecords),
    displaySettings,
    databaseReady: true
  };
}

export async function getLocalMachineFormOptions() {
  await initializeLocalDb();

  const machines = await getLocalDb().products.filter((product) => product.isMachine).toArray();

  return {
    brands: sortedUnique(machines.map((machine) => machine.brand)),
    categories: sortedUnique(machines.map((machine) => machine.category))
  };
}

export async function getLocalRentalDataset(): Promise<RentalDataset> {
  await initializeLocalDb();

  const db = getLocalDb();
  const [products, rentals] = await Promise.all([
    db.products.filter((product) => product.isMachine).toArray(),
    db.rentals.orderBy("createdAt").reverse().limit(100).toArray()
  ]);
  const rentalRecords = sortRentals(rentals).sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "OPEN" ? -1 : 1;
    }

    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
  });
  const openCountByProduct = rentalRecords.reduce((counts, rental) => {
    if (rental.productId && rental.status === "OPEN") {
      counts.set(rental.productId, (counts.get(rental.productId) ?? 0) + 1);
    }

    return counts;
  }, new Map<string, number>());
  const machines = products.map((product) => machineRecord(product, openCountByProduct.get(product.id) ?? 0));

  return {
    machines,
    rentals: rentalRecords,
    metrics: calculateRentalMetrics(machines, rentalRecords),
    databaseReady: true
  };
}

export async function exportLocalSnapshot(): Promise<LocalSnapshot> {
  await initializeLocalDb();

  const db = getLocalDb();
  const [products, sales, rentals, activity, settings, deviceId] = await Promise.all([
    db.products.toArray(),
    db.sales.toArray(),
    db.rentals.toArray(),
    db.activity.toArray(),
    getLocalDisplaySettings(),
    getLocalDeviceId()
  ]);

  return {
    version: 1,
    exportedAt: nowIso(),
    deviceId,
    products: sortProducts(products),
    sales: sortSales(sales),
    rentals: sortRentals(rentals),
    activity: [...activity].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    settings
  };
}

export async function importLocalSnapshot(snapshot: LocalSnapshot, options: { notify?: boolean; preserveDeviceId?: boolean } = {}) {
  if (!snapshot || snapshot.version !== 1) {
    throw new Error("Unsupported backup file.");
  }

  const db = getLocalDb();
  const deviceId = options.preserveDeviceId ? await getLocalDeviceId() : snapshot.deviceId || crypto.randomUUID();
  await db.transaction("rw", [db.products, db.sales, db.rentals, db.activity, db.settings, db.meta], async () => {
    await Promise.all([db.products.clear(), db.sales.clear(), db.rentals.clear(), db.activity.clear()]);
    await Promise.all([
      db.products.bulkPut(snapshot.products ?? []),
      db.sales.bulkPut(snapshot.sales ?? []),
      db.rentals.bulkPut(snapshot.rentals ?? []),
      db.activity.bulkPut(snapshot.activity ?? []),
      db.settings.put({
        id: "app",
        ...(snapshot.settings ?? defaultDisplaySettings),
        updatedAt: nowIso()
      }),
      setMetaValue("deviceId", deviceId)
    ]);
  });

  if (options.notify !== false) {
    notifyLocalDataChanged();
    queueLocalBackup("restore", 500);
  }
}

async function hashText(text: string) {
  if (!crypto.subtle) {
    return String(text.length);
  }

  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));

  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hashSnapshotContent(snapshot: LocalSnapshot) {
  return hashText(
    JSON.stringify({
      version: snapshot.version,
      products: snapshot.products,
      sales: snapshot.sales,
      rentals: snapshot.rentals,
      activity: snapshot.activity,
      settings: snapshot.settings
    })
  );
}

async function shouldSkipAutoBackupForIgnoredCloudUpdate(reason: string, localContentHash: string) {
  if (!["app-open", "interval", "leaving"].includes(reason)) {
    return false;
  }

  const [ignoredRemoteHash, ignoredLocalHash] = await Promise.all([
    getMetaValue<string>("ignoredCloudSnapshotHash"),
    getMetaValue<string>("ignoredCloudSnapshotLocalHash")
  ]);

  return Boolean(ignoredRemoteHash && ignoredLocalHash === localContentHash);
}

export async function getLatestCloudSnapshotUpdate(): Promise<CloudSnapshotUpdate | null> {
  await initializeLocalDb();

  try {
    const response = await fetch("/api/snapshots/latest", {
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as LatestCloudSnapshotResponse;

    if (!body.ok || !body.snapshot) {
      return null;
    }

    const [localSnapshot, localDeviceId] = await Promise.all([exportLocalSnapshot(), getLocalDeviceId()]);
    const [localContentHash, cloudContentHash] = await Promise.all([
      hashSnapshotContent(localSnapshot),
      hashSnapshotContent(body.snapshot)
    ]);
    const cloudDeviceId = body.deviceId ?? body.snapshot.deviceId;

    if (cloudDeviceId === localDeviceId || cloudContentHash === localContentHash) {
      await setMetaValue("lastSeenCloudSnapshotHash", cloudContentHash);
      return null;
    }

    const ignoredCloudHash = await getMetaValue<string>("ignoredCloudSnapshotHash");

    if (ignoredCloudHash === cloudContentHash) {
      return null;
    }

    return {
      snapshot: body.snapshot,
      contentHash: cloudContentHash,
      localContentHash,
      deviceId: cloudDeviceId,
      exportedAt: body.snapshot.exportedAt,
      updatedAt: body.updatedAt ?? null
    };
  } catch {
    return null;
  }
}

export async function importCloudSnapshotUpdate(update: CloudSnapshotUpdate) {
  await importLocalSnapshot(update.snapshot, { preserveDeviceId: true });
  await Promise.all([
    setMetaValue("lastImportedCloudSnapshotHash", update.contentHash),
    setMetaValue("lastSeenCloudSnapshotHash", update.contentHash),
    setMetaValue("ignoredCloudSnapshotHash", null),
    setMetaValue("ignoredCloudSnapshotLocalHash", null)
  ]);
}

export async function ignoreCloudSnapshotUpdate(update: CloudSnapshotUpdate) {
  await Promise.all([
    setMetaValue("ignoredCloudSnapshotHash", update.contentHash),
    setMetaValue("ignoredCloudSnapshotLocalHash", update.localContentHash)
  ]);
}

export async function syncLocalSnapshotToServer(reason = "manual") {
  const snapshot = await exportLocalSnapshot();

  if (!snapshotHasBusinessData(snapshot)) {
    await setMetaValue("lastBackupError", null);

    return true;
  }

  const serialized = JSON.stringify(snapshot);
  const dataHash = await hashSnapshotContent(snapshot);

  if (await shouldSkipAutoBackupForIgnoredCloudUpdate(reason, dataHash)) {
    return true;
  }

  try {
    const response = await fetch("/api/snapshots", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        reason,
        deviceId: snapshot.deviceId,
        snapshot,
        dataHash
      })
    });

    if (!response.ok) {
      throw new Error(`Backup failed with ${response.status}.`);
    }

    await setMetaValue("lastBackupAt", nowIso());
    await setMetaValue("lastBackupError", null);

    return true;
  } catch (error) {
    await setMetaValue("lastBackupError", error instanceof Error ? error.message : "Backup failed.");

    return false;
  }
}

export function queueLocalBackup(reason = "change", delay = 2500) {
  if (typeof window === "undefined") {
    return;
  }

  if (backupTimer) {
    window.clearTimeout(backupTimer);
  }

  backupTimer = window.setTimeout(() => {
    backupTimer = null;
    void syncLocalSnapshotToServer(reason);
  }, delay);
}

export async function getLocalBackupStatus(): Promise<LocalBackupStatus> {
  await initializeLocalDb();

  const [deviceId, persistent, lastBackupAt, lastBackupError] = await Promise.all([
    getLocalDeviceId(),
    getMetaValue<boolean>("persistentStorage"),
    getMetaValue<string>("lastBackupAt"),
    getMetaValue<string>("lastBackupError")
  ]);

  return {
    deviceId,
    persistent,
    lastBackupAt,
    lastBackupError
  };
}
