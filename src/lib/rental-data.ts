import { prisma } from "@/lib/db";
import { demoProducts } from "@/lib/demo-data";
import type {
  RentableMachineRecord,
  RentalDataset,
  RentalMetrics,
  RentalRecord
} from "@/lib/types";

function machineRecord(product: {
  id: string;
  title: string;
  sku: string;
  brand: string | null;
  category: string | null;
  quantity: number;
  defaultRentDeposit: unknown;
  defaultDailyRent: unknown;
  rentals?: Array<{ id: string }>;
}): RentableMachineRecord {
  const openRentals = product.rentals?.length ?? 0;

  return {
    id: product.id,
    title: product.title,
    sku: product.sku,
    brand: product.brand,
    category: product.category,
    quantity: product.quantity,
    defaultRentDeposit: product.defaultRentDeposit == null ? null : Number(product.defaultRentDeposit),
    defaultDailyRent: product.defaultDailyRent == null ? null : Number(product.defaultDailyRent),
    openRentals,
    availableForRent: Math.max(0, product.quantity - openRentals)
  };
}

function rentalRecord(rental: {
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

function calculateMetrics(machines: RentableMachineRecord[], rentals: RentalRecord[]): RentalMetrics {
  const openRentals = rentals.filter((rental) => rental.status === "OPEN");

  return {
    machineCount: machines.length,
    availableMachines: machines.reduce((total, machine) => total + machine.availableForRent, 0),
    openRentals: openRentals.length,
    depositsHeld: openRentals.reduce((total, rental) => total + rental.deposit, 0)
  };
}

function sortedUnique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b)
  );
}

function fallbackDataset(error?: unknown): RentalDataset {
  const machines = demoProducts.filter((product) => product.isMachine).map((product) =>
    machineRecord({
      ...product,
      rentals: []
    })
  );
  const rentals: RentalRecord[] = [];

  return {
    machines,
    rentals,
    metrics: calculateMetrics(machines, rentals),
    databaseReady: false,
    error: error instanceof Error ? error.message : "Database is not configured yet."
  };
}

export async function getMachineFormOptions() {
  try {
    const machines = await prisma.product.findMany({
      where: {
        isMachine: true
      },
      select: {
        brand: true,
        category: true
      },
      orderBy: [{ brand: "asc" }, { category: "asc" }]
    });

    return {
      brands: sortedUnique(machines.map((machine) => machine.brand)),
      categories: sortedUnique(machines.map((machine) => machine.category))
    };
  } catch {
    const machines = demoProducts.filter((product) => product.isMachine);

    return {
      brands: sortedUnique(machines.map((machine) => machine.brand)),
      categories: sortedUnique(machines.map((machine) => machine.category))
    };
  }
}

export async function getRentalDataset(): Promise<RentalDataset> {
  try {
    const [products, rentals] = await Promise.all([
      prisma.product.findMany({
        where: {
          isMachine: true
        },
        include: {
          rentals: {
            where: {
              status: "OPEN"
            },
            select: {
              id: true
            }
          }
        },
        orderBy: [{ title: "asc" }, { sku: "asc" }]
      }),
      prisma.rental.findMany({
        orderBy: {
          createdAt: "desc"
        },
        take: 100
      })
    ]);

    const machineRecords = products.map(machineRecord);
    const rentalRecords = rentals
      .map(rentalRecord)
      .sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === "OPEN" ? -1 : 1;
        }

        return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
      });

    return {
      machines: machineRecords,
      rentals: rentalRecords,
      metrics: calculateMetrics(machineRecords, rentalRecords),
      databaseReady: true
    };
  } catch (error) {
    return fallbackDataset(error);
  }
}
