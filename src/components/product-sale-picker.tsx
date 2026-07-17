"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { ProductRecord } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

export function ProductSalePicker({
  products,
  query,
  onQueryChange,
  onSelect,
  placeholder = "Search product or SKU"
}: {
  products: ProductRecord[];
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (product: ProductRecord) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return products
      .filter((product) => {
        if (!normalized) {
          return true;
        }

        return [product.title, product.sku, product.brand, product.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      })
      .slice(0, 8);
  }, [products, query]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(event) => {
          onQueryChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="pl-9"
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
      />
      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-md">
          {filteredProducts.length ? (
            filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                className={cn(
                  "grid w-full grid-cols-[1fr_auto] gap-2 rounded-sm px-2 py-2 text-left outline-none hover:bg-muted",
                  product.quantity <= 0 && "text-muted-foreground"
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(product);
                  setOpen(false);
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{product.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{product.sku}</span>
                </span>
                <span className="text-right text-xs">
                  <span className="block font-medium">{formatCurrency(product.sellingPrice)}</span>
                  <span className="text-muted-foreground">Qty {product.quantity}</span>
                </span>
              </button>
            ))
          ) : (
            <div className="px-2 py-2 text-muted-foreground">No product found.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
