import type { ActivityRecord, ProductRecord } from "@/lib/types";
import { calculateMarginPercent } from "@/lib/utils";

const now = new Date();

export const demoProducts: ProductRecord[] = [
  {
    id: "demo-cutting-blade",
    title: "Rainbow Cutting Blade 4 inch",
    sku: "MPT-0001",
    brand: "Rainbow",
    category: "Cutting Blades",
    description: "Fast-moving cutting blade stock.",
    costPrice: 35,
    sellingPrice: 55,
    marginPercent: calculateMarginPercent(35, 55),
    quantity: 80,
    reorderLevel: 5,
    imageUrl: null,
    isMachine: false,
    defaultRentDeposit: null,
    defaultDailyRent: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  },
  {
    id: "demo-drill-bit-set",
    title: "Masonry Drill Bit Set",
    sku: "MPT-0002",
    brand: "MPT",
    category: "Drill Bits",
    description: "Consumable drill bit set for retail sales.",
    costPrice: 180,
    sellingPrice: 280,
    marginPercent: calculateMarginPercent(180, 280),
    quantity: 24,
    reorderLevel: 6,
    imageUrl: null,
    isMachine: false,
    defaultRentDeposit: null,
    defaultDailyRent: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  },
  {
    id: "demo-dewalt-saw-machine",
    title: "DeWalt Circular Saw",
    sku: "MCH-0001",
    brand: "DeWalt",
    category: "Saws",
    description: "Premium saw model for contractor orders.",
    costPrice: 0,
    sellingPrice: 0,
    marginPercent: 0,
    quantity: 2,
    reorderLevel: 4,
    imageUrl: null,
    isMachine: true,
    defaultRentDeposit: 3000,
    defaultDailyRent: 600,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  },
  {
    id: "demo-stanley-kit-machine",
    title: "Stanley Rotary Hammer Kit",
    sku: "MCH-0002",
    brand: "Stanley",
    category: "Hammers",
    description: "Kit bundle for masonry work.",
    costPrice: 0,
    sellingPrice: 0,
    marginPercent: 0,
    quantity: 1,
    reorderLevel: 3,
    imageUrl: null,
    isMachine: true,
    defaultRentDeposit: 2500,
    defaultDailyRent: 500,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  }
];

export const demoActivity: ActivityRecord[] = [
  {
    id: "demo-log-1",
    productId: "demo-cutting-blade",
    productTitle: "Rainbow Cutting Blade 4 inch",
    type: "Product Created",
    quantity: 80,
    note: "Demo data shown until the local database is connected.",
    createdAt: now.toISOString()
  },
  {
    id: "demo-log-2",
    productId: "demo-dewalt-saw-machine",
    productTitle: "DeWalt Circular Saw",
    type: "Machine Created",
    quantity: 1,
    note: "Critical stock example.",
    createdAt: new Date(now.getTime() - 1000 * 60 * 60).toISOString()
  }
];
