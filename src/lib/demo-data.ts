import type { ActivityRecord, ProductRecord } from "@/lib/types";
import { calculateMarginPercent } from "@/lib/utils";

const now = new Date();

export const demoProducts: ProductRecord[] = [
  {
    id: "demo-bosch-drill",
    title: "Bosch Impact Drill GSB 13 RE",
    sku: "MPT-0001",
    brand: "Bosch",
    category: "Drills",
    description: "Compact corded impact drill for workshop and site use.",
    costPrice: 2500,
    sellingPrice: 3200,
    marginPercent: calculateMarginPercent(2500, 3200),
    quantity: 15,
    reorderLevel: 5,
    imageUrl: null,
    isMachine: true,
    defaultRentDeposit: 1500,
    defaultDailyRent: 350,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  },
  {
    id: "demo-makita-grinder",
    title: "Makita Angle Grinder 4 inch",
    sku: "MPT-0002",
    brand: "Makita",
    category: "Grinders",
    description: "Fast-moving grinder stock with high margin.",
    costPrice: 3000,
    sellingPrice: 4200,
    marginPercent: calculateMarginPercent(3000, 4200),
    quantity: 8,
    reorderLevel: 6,
    imageUrl: null,
    isMachine: true,
    defaultRentDeposit: 1200,
    defaultDailyRent: 300,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  },
  {
    id: "demo-dewalt-saw",
    title: "DeWalt Circular Saw",
    sku: "MPT-0003",
    brand: "DeWalt",
    category: "Saws",
    description: "Premium saw model for contractor orders.",
    costPrice: 7600,
    sellingPrice: 9500,
    marginPercent: calculateMarginPercent(7600, 9500),
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
    id: "demo-stanley-kit",
    title: "Stanley Rotary Hammer Kit",
    sku: "MPT-0004",
    brand: "Stanley",
    category: "Hammers",
    description: "Kit bundle for masonry work.",
    costPrice: 5200,
    sellingPrice: 6900,
    marginPercent: calculateMarginPercent(5200, 6900),
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
    productId: "demo-bosch-drill",
    productTitle: "Bosch Impact Drill GSB 13 RE",
    type: "Product Created",
    quantity: 15,
    note: "Demo data shown until PostgreSQL is connected.",
    createdAt: now.toISOString()
  },
  {
    id: "demo-log-2",
    productId: "demo-dewalt-saw",
    productTitle: "DeWalt Circular Saw",
    type: "Stock Reduced",
    quantity: 1,
    note: "Critical stock example.",
    createdAt: new Date(now.getTime() - 1000 * 60 * 60).toISOString()
  }
];
