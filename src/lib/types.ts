export type ProductRecord = {
  id: string;
  title: string;
  sku: string;
  brand: string | null;
  category: string | null;
  description: string | null;
  costPrice: number;
  sellingPrice: number;
  marginPercent: number;
  quantity: number;
  reorderLevel: number;
  imageUrl: string | null;
  isMachine: boolean;
  defaultRentDeposit: number | null;
  defaultDailyRent: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ActivityRecord = {
  id: string;
  productId: string | null;
  productTitle: string | null;
  type: string;
  quantity: number | null;
  note: string | null;
  createdAt: string;
};

export type DashboardMetrics = {
  totalProducts: number;
  inventoryValue: number;
  potentialRevenue: number;
  expectedProfit: number;
  lowStockProducts: number;
};

export type InventoryDataset = {
  products: ProductRecord[];
  activity: ActivityRecord[];
  metrics: DashboardMetrics;
  databaseReady: boolean;
  error?: string;
};

export type ProductFormSuggestion = {
  title: string;
  sku: string;
  brand: string | null;
  category: string | null;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  reorderLevel: number;
  isMachine: boolean;
  defaultRentDeposit: number | null;
  defaultDailyRent: number | null;
};

export type RentableMachineRecord = {
  id: string;
  title: string;
  sku: string;
  brand: string | null;
  category: string | null;
  quantity: number;
  defaultRentDeposit: number | null;
  defaultDailyRent: number | null;
  openRentals: number;
  availableForRent: number;
};

export type RentalRecord = {
  id: string;
  productId: string | null;
  machineTitle: string;
  machineSku: string;
  customerName: string | null;
  customerPhone: string | null;
  deposit: number;
  dailyRent: number;
  startedAt: string;
  closedAt: string | null;
  calendarDays: number | null;
  rentTotal: number | null;
  depositBalance: number | null;
  status: "OPEN" | "CLOSED";
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RentalMetrics = {
  machineCount: number;
  availableMachines: number;
  openRentals: number;
  depositsHeld: number;
};

export type RentalDataset = {
  machines: RentableMachineRecord[];
  rentals: RentalRecord[];
  metrics: RentalMetrics;
  databaseReady: boolean;
  error?: string;
};

export type ProductFormOptions = {
  brands: string[];
  categories: string[];
  products: ProductFormSuggestion[];
  skus: string[];
  titles: string[];
};

export type OcrExtraction = {
  title: string;
  brand: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  confidence: number;
};

export type ActionResult<T = undefined> = {
  ok: boolean;
  message: string;
  data?: T;
  fieldErrors?: Record<string, string[]>;
};
