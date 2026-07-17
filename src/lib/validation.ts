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
  note: z.string().trim().optional().nullable()
});

export type ProductInput = z.infer<typeof productSchema>;
export type CsvProductInput = z.infer<typeof csvProductSchema>;
export type BulkStockInput = z.infer<typeof bulkStockSchema>;
export type CreateRentalInput = z.infer<typeof createRentalSchema>;
