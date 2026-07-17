import { prisma } from "@/lib/db";
import { demoProducts } from "@/lib/demo-data";
import { getDisplaySettings } from "@/lib/settings";
import type { ProductRecord, SaleLineRecord, SaleRecord, SalesDataset, SalesMetrics } from "@/lib/types";

function productToRecord(product: {
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

function lineToRecord(line: {
  id: string;
  saleId: string;
  productId: string | null;
  productTitle: string;
  productSku: string;
  quantity: number;
  unitPrice: unknown;
  unitCost: unknown;
  lineTotal: unknown;
  lineProfit: unknown;
  createdAt: Date;
}): SaleLineRecord {
  return {
    id: line.id,
    saleId: line.saleId,
    productId: line.productId,
    productTitle: line.productTitle,
    productSku: line.productSku,
    quantity: line.quantity,
    unitPrice: Number(line.unitPrice),
    unitCost: Number(line.unitCost),
    lineTotal: Number(line.lineTotal),
    lineProfit: Number(line.lineProfit),
    createdAt: line.createdAt.toISOString()
  };
}

function saleToRecord(sale: {
  id: string;
  saleDate: Date;
  paymentMode: string;
  subtotal: unknown;
  totalCost: unknown;
  grossProfit: unknown;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  lines: Array<Parameters<typeof lineToRecord>[0]>;
}): SaleRecord {
  return {
    id: sale.id,
    saleDate: sale.saleDate.toISOString(),
    paymentMode: sale.paymentMode as SaleRecord["paymentMode"],
    subtotal: Number(sale.subtotal),
    totalCost: Number(sale.totalCost),
    grossProfit: Number(sale.grossProfit),
    note: sale.note,
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
    lines: sale.lines.map(lineToRecord)
  };
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

function calculateSalesMetrics(sales: SaleRecord[]): SalesMetrics {
  const today = startOfToday().getTime();
  const week = startOfWeek().getTime();
  const month = startOfMonth().getTime();

  return sales.reduce(
    (metrics, sale) => {
      const saleTime = new Date(sale.saleDate).getTime();
      const itemCount = sale.lines.reduce((total, line) => total + line.quantity, 0);

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

function fallbackDataset(error?: unknown): SalesDataset {
  const products = demoProducts.filter((product) => !product.isMachine);

  return {
    products,
    sales: [],
    metrics: calculateSalesMetrics([]),
    displaySettings: {
      showCostPrice: true,
      showMargin: true
    },
    databaseReady: false,
    error: error instanceof Error ? error.message : "Database is not configured yet."
  };
}

export async function getSalesDataset(): Promise<SalesDataset> {
  try {
    const [products, sales, displaySettings] = await Promise.all([
      prisma.product.findMany({
        where: {
          isMachine: false
        },
        orderBy: [{ title: "asc" }, { sku: "asc" }]
      }),
      prisma.sale.findMany({
        include: {
          lines: {
            orderBy: {
              createdAt: "asc"
            }
          }
        },
        orderBy: [{ saleDate: "desc" }, { createdAt: "desc" }],
        take: 300
      }),
      getDisplaySettings()
    ]);
    const saleRecords = sales.map(saleToRecord);

    return {
      products: products.map(productToRecord),
      sales: saleRecords,
      metrics: calculateSalesMetrics(saleRecords),
      displaySettings,
      databaseReady: true
    };
  } catch (error) {
    return fallbackDataset(error);
  }
}
