import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function calculateMarginPercent(costPrice: number, sellingPrice: number) {
  if (!Number.isFinite(costPrice) || !Number.isFinite(sellingPrice) || sellingPrice <= 0) {
    return 0;
  }

  return Number((((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(2));
}

export function getStockStatus(quantity: number, reorderLevel: number) {
  if (quantity <= 2) {
    return "critical" as const;
  }

  if (quantity <= reorderLevel) {
    return "low" as const;
  }

  return "healthy" as const;
}

export function compactDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function toCsvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function makeCsv(rows: Array<Record<string, unknown>>, columns: string[]) {
  const header = columns.map(toCsvCell).join(",");
  const body = rows.map((row) => columns.map((column) => toCsvCell(row[column])).join(","));
  return [header, ...body].join("\n");
}
