import { prisma } from "@/lib/db";
import { demoActivity, demoProducts } from "@/lib/demo-data";
import type {
  ActivityRecord,
  DashboardMetrics,
  InventoryDataset,
  ProductFormOptions,
  ProductFormSuggestion,
  ProductRecord
} from "@/lib/types";

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
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString()
  };
}

function activityToRecord(log: {
  id: string;
  productId: string | null;
  type: string;
  quantity: number | null;
  note: string | null;
  createdAt: Date;
  product?: { title: string } | null;
}): ActivityRecord {
  return {
    id: log.id,
    productId: log.productId,
    productTitle: log.product?.title ?? null,
    type: log.type,
    quantity: log.quantity,
    note: log.note,
    createdAt: log.createdAt.toISOString()
  };
}

export function calculateMetrics(products: ProductRecord[]): DashboardMetrics {
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

function fallbackDataset(error?: unknown): InventoryDataset {
  return {
    products: demoProducts,
    activity: demoActivity,
    metrics: calculateMetrics(demoProducts),
    databaseReady: false,
    error: error instanceof Error ? error.message : "Database is not configured yet."
  };
}

function sortedUnique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b)
  );
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
    reorderLevel: product.reorderLevel
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

export async function getInventoryDataset(): Promise<InventoryDataset> {
  try {
    const [products, activity] = await Promise.all([
      prisma.product.findMany({
        orderBy: [{ updatedAt: "desc" }, { title: "asc" }]
      }),
      prisma.inventoryLog.findMany({
        include: {
          product: {
            select: {
              title: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 10
      })
    ]);

    const productRecords = products.map(productToRecord);

    return {
      products: productRecords,
      activity: activity.map(activityToRecord),
      metrics: calculateMetrics(productRecords),
      databaseReady: true
    };
  } catch (error) {
    return fallbackDataset(error);
  }
}

export async function getProducts() {
  const dataset = await getInventoryDataset();

  return dataset;
}

export async function getProductFormOptions(): Promise<ProductFormOptions> {
  try {
    const products = await prisma.product.findMany({
      orderBy: [{ title: "asc" }, { sku: "asc" }]
    });

    return buildFormOptions(products.map(productToRecord));
  } catch {
    return buildFormOptions(demoProducts);
  }
}

export async function getProductById(id: string) {
  try {
    const product = await prisma.product.findUnique({
      where: {
        id
      }
    });

    return product ? productToRecord(product) : null;
  } catch {
    return demoProducts.find((product) => product.id === id) ?? null;
  }
}

export async function getNextSku() {
  try {
    const products = await prisma.product.findMany({
      where: {
        sku: {
          startsWith: "MPT-"
        }
      },
      select: {
        sku: true
      }
    });

    const nextNumber =
      products.reduce((max, product) => {
        const number = Number(product.sku.replace("MPT-", ""));

        return Number.isFinite(number) ? Math.max(max, number) : max;
      }, 0) + 1;

    return `MPT-${String(nextNumber).padStart(4, "0")}`;
  } catch {
    return "MPT-0001";
  }
}
