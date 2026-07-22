import { NextResponse } from "next/server";

import { defaultDisplaySettings } from "@/lib/app-config";
import { prisma } from "@/lib/db";
import { getPostgresConfigError } from "@/lib/server-db-config";
import type { ActivityRecord, DisplaySettings, ProductRecord, RentalRecord, SaleLineRecord, SaleRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

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
    paymentMode: sale.paymentMode === "UPI" ? "UPI" : "CASH",
    subtotal: Number(sale.subtotal),
    totalCost: Number(sale.totalCost),
    grossProfit: Number(sale.grossProfit),
    note: sale.note,
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
    lines: sale.lines.map(lineToRecord)
  };
}

function rentalToRecord(rental: {
  id: string;
  productId: string | null;
  machineTitle: string;
  machineSku: string;
  customerName: string | null;
  customerPhone: string | null;
  deposit: unknown;
  dailyRent: unknown;
  paymentMode: string;
  startedAt: Date;
  closedAt: Date | null;
  calendarDays: number | null;
  rentTotal: unknown;
  depositBalance: unknown;
  status: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}): RentalRecord {
  return {
    id: rental.id,
    productId: rental.productId,
    machineTitle: rental.machineTitle,
    machineSku: rental.machineSku,
    customerName: rental.customerName,
    customerPhone: rental.customerPhone,
    deposit: Number(rental.deposit),
    dailyRent: Number(rental.dailyRent),
    paymentMode: rental.paymentMode === "UPI" ? "UPI" : "CASH",
    startedAt: rental.startedAt.toISOString(),
    closedAt: rental.closedAt?.toISOString() ?? null,
    calendarDays: rental.calendarDays,
    rentTotal: rental.rentTotal == null ? null : Number(rental.rentTotal),
    depositBalance: rental.depositBalance == null ? null : Number(rental.depositBalance),
    status: rental.status === "CLOSED" ? "CLOSED" : "OPEN",
    note: rental.note,
    createdAt: rental.createdAt.toISOString(),
    updatedAt: rental.updatedAt.toISOString()
  };
}

export async function GET() {
  const configError = getPostgresConfigError();

  if (configError) {
    return NextResponse.json(
      {
        ok: false,
        message: configError
      },
      {
        status: 503
      }
    );
  }

  try {
    const [products, sales, rentals, activity, settings] = await Promise.all([
      prisma.product.findMany(),
      prisma.sale.findMany({
        include: {
          lines: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      }),
      prisma.rental.findMany(),
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
        take: 500
      }),
      prisma.appSetting.findUnique({
        where: {
          id: "app"
        }
      })
    ]);
    const displaySettings: DisplaySettings = settings
      ? {
          showCostPrice: settings.showCostPrice,
          showMargin: settings.showMargin
        }
      : defaultDisplaySettings;

    return NextResponse.json({
      ok: true,
      snapshot: {
        version: 1,
        exportedAt: new Date().toISOString(),
        deviceId: "server-bootstrap",
        products: products.map(productToRecord),
        sales: sales.map(saleToRecord),
        rentals: rentals.map(rentalToRecord),
        activity: activity.map(activityToRecord),
        settings: displaySettings
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Server bootstrap is unavailable."
      },
      {
        status: 503
      }
    );
  }
}
