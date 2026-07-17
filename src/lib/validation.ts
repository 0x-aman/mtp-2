import { z } from "zod";

const money = z.coerce
  .number({
    required_error: "Enter a price",
    invalid_type_error: "Enter a valid number"
  })
  .min(0, "Price cannot be negative");

const booleanish = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return ["1", "true", "yes", "machine", "rent", "rentable"].includes(value.trim().toLowerCase());
  }

  return Boolean(value);
}, z.boolean());

export const productSchema = z.object({
  title: z.string().trim().min(2, "Product title is required"),
  sku: z
    .string()
    .trim()
    .min(3, "SKU is required")
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers, and hyphens only"),
  brand: z.string().trim().optional().nullable(),
  category: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  costPrice: money,
  sellingPrice: money,
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative"),
  reorderLevel: z.coerce.number().int().min(0, "Reorder level cannot be negative").default(5),
  isMachine: booleanish.default(false),
  defaultRentDeposit: money.default(0),
  defaultDailyRent: money.default(0),
  imageUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => (value ? value : null))
});

export const csvProductSchema = productSchema.omit({ sku: true }).extend({
  sku: z.string().trim().optional().nullable()
});

export const machineSchema = z.object({
  title: z.string().trim().min(2, "Machine name is required"),
  brand: z.string().trim().optional().nullable(),
  category: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative"),
  defaultRentDeposit: money.default(0),
  defaultDailyRent: money.default(0),
  imageUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => (value ? value : null))
});

export const bulkStockSchema = z.object({
  productIds: z.array(z.string()).min(1, "Select at least one product"),
  mode: z.enum(["add", "reduce", "set"]),
  quantity: z.coerce.number().int().min(0, "Enter a non-negative quantity")
});

export const createRentalSchema = z.object({
  productId: z.string().min(1, "Choose a machine"),
  customerName: z.string().trim().optional().nullable(),
  customerPhone: z.string().trim().optional().nullable(),
  deposit: money,
  dailyRent: money,
  paymentMode: z.enum(["CASH", "UPI"]).default("CASH"),
  note: z.string().trim().optional().nullable()
});

export const saleLineSchema = z.object({
  productId: z.string().min(1, "Choose a product"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: money
});

export const createSaleSchema = z.object({
  saleDate: z.string().trim().optional().nullable(),
  customer: z.string().trim().optional().nullable(),
  paymentMode: z.enum(["CASH", "UPI", "CARD", "OTHER"]).default("CASH"),
  note: z.string().trim().optional().nullable(),
  lines: z.array(saleLineSchema).min(1, "Add at least one product")
});

export const displaySettingsSchema = z.object({
  showCostPrice: z.boolean(),
  showMargin: z.boolean()
});

export type ProductInput = z.infer<typeof productSchema>;
export type CsvProductInput = z.infer<typeof csvProductSchema>;
export type BulkStockInput = z.infer<typeof bulkStockSchema>;
export type MachineInput = z.infer<typeof machineSchema>;
export type CreateRentalInput = z.infer<typeof createRentalSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SaleLineInput = z.infer<typeof saleLineSchema>;
export type DisplaySettingsInput = z.infer<typeof displaySettingsSchema>;
