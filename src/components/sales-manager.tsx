"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, IndianRupee, Loader2, Minus, Pencil, Plus, ReceiptText, Trash2, TrendingUp, WandSparkles, X } from "lucide-react";
import { toast } from "sonner";

import { createSaleAction, deleteSaleAction, updateSaleAction } from "@/app/actions/sales";
import { ProductSalePicker } from "@/components/product-sale-picker";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DisplaySettings, ProductRecord, SaleRecord, SalesMetrics } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

type DraftLine = {
  key: string;
  productId: string;
  productTitle: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  stock: number;
};

type BulkLinePreview = {
  key: string;
  input: string;
  product: ProductRecord | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  status: "ok" | "error";
  message: string;
  usedDefaultPrice: boolean;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function saleDateInputValue(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function dateKey(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatLogTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function saleItemCount(sale: SaleRecord) {
  return sale.lines.reduce((total, line) => total + line.quantity, 0);
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreProduct(product: ProductRecord, query: string) {
  const normalizedQuery = normalizeSearch(query);

  if (!normalizedQuery) {
    return 0;
  }

  const target = normalizeSearch([product.title, product.sku, product.brand, product.category].filter(Boolean).join(" "));
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  let score = target.includes(normalizedQuery) ? 50 + normalizedQuery.length : 0;

  for (const token of queryTokens) {
    const tokenScore = target
      .split(" ")
      .reduce((best, targetToken) => {
        if (targetToken === token) {
          return Math.max(best, 16);
        }

        if (targetToken.startsWith(token)) {
          return Math.max(best, 10);
        }

        if (targetToken.includes(token)) {
          return Math.max(best, 5);
        }

        return best;
      }, 0);

    if (!tokenScore) {
      return 0;
    }

    score += tokenScore;
  }

  return score + queryTokens.length * 8;
}

function rankedProducts(products: ProductRecord[], query: string, limit: number) {
  return products
    .map((product) => ({
      product,
      score: scoreProduct(product, query)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.product.title.localeCompare(b.product.title))
    .slice(0, limit)
    .map((item) => item.product);
}

function findBestProduct(products: ProductRecord[], query: string) {
  return rankedProducts(products, query, 1)[0] ?? null;
}

function parseBulkSaleInput(text: string, products: ProductRecord[], existingLines: DraftLine[]): BulkLinePreview[] {
  const reservedQuantities = new Map<string, number>();

  for (const line of existingLines) {
    reservedQuantities.set(line.productId, (reservedQuantities.get(line.productId) ?? 0) + line.quantity);
  }

  return text
    .split(/[\n,]+/)
    .map((input, index): BulkLinePreview | null => {
      const trimmed = input.trim();

      if (!trimmed) {
        return null;
      }

      const quantityMatch = trimmed.match(/^(\d+)\s*x\s*/i);
      const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;
      const withoutQuantity = trimmed.replace(/^(\d+)\s*x\s*/i, "").trim();
      const priceMatch = withoutQuantity.match(/@\s*(\d+(?:\.\d+)?)/);
      const productQuery = withoutQuantity.replace(/@\s*\d+(?:\.\d+)?\s*$/, "").trim();
      const product = findBestProduct(products, productQuery);
      const usedDefaultPrice = !priceMatch;
      const unitPrice = priceMatch ? Number(priceMatch[1]) : product?.sellingPrice ?? 0;
      let message = "";

      if (!productQuery) {
        message = "Add a product name.";
      } else if (!product) {
        message = "No matching product found.";
      } else if (!Number.isFinite(quantity) || quantity < 1) {
        message = "Quantity must be at least 1.";
      } else if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        message = "Price must be 0 or more.";
      } else {
        const requestedQuantity = (reservedQuantities.get(product.id) ?? 0) + quantity;
        reservedQuantities.set(product.id, requestedQuantity);

        if (product.quantity <= 0) {
          message = "Out of stock.";
        } else if (requestedQuantity > product.quantity) {
          message = `Stock only ${product.quantity}; selected ${requestedQuantity}.`;
        }
      }

      return {
        key: `${index}-${trimmed}`,
        input: trimmed,
        product,
        quantity,
        unitPrice,
        lineTotal: quantity * unitPrice,
        status: message ? "error" : "ok",
        message: message || `Matched ${product?.title}${usedDefaultPrice ? " at default price" : ""}.`,
        usedDefaultPrice
      };
    })
    .filter((item): item is BulkLinePreview => Boolean(item));
}

function bulkClauseRange(text: string, cursor: number) {
  const safeCursor = Math.min(Math.max(cursor, 0), text.length);
  const beforeCursor = text.slice(0, safeCursor);
  const previousSeparator = Math.max(beforeCursor.lastIndexOf(","), beforeCursor.lastIndexOf("\n"));
  const start = previousSeparator >= 0 ? previousSeparator + 1 : 0;
  const afterCursor = text.slice(safeCursor);
  const nextSeparator = afterCursor.search(/[,\n]/);
  const end = nextSeparator >= 0 ? safeCursor + nextSeparator : text.length;

  return {
    start,
    end,
    clause: text.slice(start, end)
  };
}

function bulkProductQueryFromClause(clause: string) {
  return clause
    .split("@")[0]
    .replace(/^\s*\d+\s*x\s*/i, "")
    .trim();
}

function bulkClauseWithProduct(clause: string, productTitle: string) {
  const prefix = clause.match(/^(\s*(?:\d+\s*x\s*)?)/i)?.[1] ?? "";
  const suffix = clause.match(/(\s*@\s*\d*(?:\.\d*)?\s*)$/)?.[1] ?? "";

  return {
    value: `${prefix}${productTitle}${suffix}`,
    cursorOffset: prefix.length + productTitle.length
  };
}

function SalesLogCard({
  sale,
  showMargin,
  onEdit,
  onDelete,
  isDeleting
}: {
  sale: SaleRecord;
  showMargin: boolean;
  onEdit: (sale: SaleRecord) => void;
  onDelete: (sale: SaleRecord) => void;
  isDeleting: boolean;
}) {
  return (
    <article className="grid gap-3 border-b bg-background px-3 py-3 last:border-0 sm:px-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{formatLogTime(sale.saleDate)}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge variant="secondary">{sale.paymentMode}</Badge>
            <Badge variant="outline">{saleItemCount(sale)} items</Badge>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="text-right">
            <p className="font-semibold">{formatCurrency(sale.subtotal)}</p>
            {showMargin ? <p className="text-xs text-emerald-600">Profit {formatCurrency(sale.grossProfit)}</p> : null}
          </div>
          <div className="flex gap-1">
            <Button type="button" size="icon" variant="ghost" className="size-8" onClick={() => onEdit(sale)}>
              <Pencil className="size-4" />
              <span className="sr-only">Edit sale</span>
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(sale)}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              <span className="sr-only">Delete sale</span>
            </Button>
          </div>
        </div>
      </div>
      <div className="grid gap-1.5 text-sm">
        {sale.lines.map((line) => (
          <div key={line.id} className="grid grid-cols-[1fr_auto] gap-3">
            <span className="min-w-0 truncate">
              {line.productTitle} <span className="text-muted-foreground">x {line.quantity}</span>
            </span>
            <span className="font-medium">{formatCurrency(line.lineTotal)}</span>
          </div>
        ))}
      </div>
      {sale.note ? <p className="rounded-md bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground">{sale.note}</p> : null}
    </article>
  );
}

export function SalesManager({
  products,
  sales,
  metrics,
  displaySettings
}: {
  products: ProductRecord[];
  sales: SaleRecord[];
  metrics: SalesMetrics;
  displaySettings: DisplaySettings;
}) {
  const router = useRouter();
  const bulkTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [bulkText, setBulkText] = useState("");
  const [bulkCursor, setBulkCursor] = useState(0);
  const [saleDate, setSaleDate] = useState(todayInputValue());
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI">("CASH");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const subtotal = lines.reduce((total, line) => total + line.quantity * line.unitPrice, 0);
  const profit = lines.reduce((total, line) => total + line.quantity * (line.unitPrice - line.unitCost), 0);
  const draftStockByProduct = useMemo(() => {
    return lines.reduce((stocks, line) => {
      stocks.set(line.productId, Math.max(stocks.get(line.productId) ?? 0, line.stock));
      return stocks;
    }, new Map<string, number>());
  }, [lines]);
  const productsForDraft = useMemo(
    () =>
      products.map((product) =>
        draftStockByProduct.has(product.id) ? { ...product, quantity: draftStockByProduct.get(product.id)! } : product
      ),
    [draftStockByProduct, products]
  );
  const selectedProductReservedQuantity = selectedProduct
    ? lines
        .filter((line) => line.productId === selectedProduct.id)
        .reduce((total, line) => total + line.quantity, 0)
    : 0;
  const selectedProductStockLimit = selectedProduct
    ? draftStockByProduct.get(selectedProduct.id) ?? selectedProduct.quantity
    : null;
  const selectedProductRemainingQuantity =
    selectedProductStockLimit === null ? null : selectedProductStockLimit - selectedProductReservedQuantity;
  const bulkPreview = useMemo(() => parseBulkSaleInput(bulkText, productsForDraft, lines), [bulkText, productsForDraft, lines]);
  const bulkHasErrors = bulkPreview.some((item) => item.status === "error");
  const bulkTotal = bulkPreview.reduce((total, item) => (item.status === "ok" ? total + item.lineTotal : total), 0);
  const bulkSuggestions = useMemo(() => {
    if (!bulkText.trim()) {
      return [];
    }

    const range = bulkClauseRange(bulkText, bulkCursor);
    const cursorInsideClause = bulkText.slice(range.start, bulkCursor);

    if (cursorInsideClause.includes("@")) {
      return [];
    }

    const productQuery = bulkProductQueryFromClause(range.clause);

    if (productQuery.length < 2) {
      return [];
    }

    return rankedProducts(productsForDraft, productQuery, 6);
  }, [bulkCursor, bulkText, productsForDraft]);
  const groupedSales = useMemo(() => {
    return sales.reduce<Array<{ key: string; sales: SaleRecord[]; revenue: number; profit: number; items: number }>>((groups, sale) => {
      const key = dateKey(sale.saleDate);
      const group = groups.find((item) => item.key === key);
      const items = saleItemCount(sale);

      if (group) {
        group.sales.push(sale);
        group.revenue += sale.subtotal;
        group.profit += sale.grossProfit;
        group.items += items;
      } else {
        groups.push({ key, sales: [sale], revenue: sale.subtotal, profit: sale.grossProfit, items });
      }

      return groups;
    }, []);
  }, [sales]);

  const pickProduct = (product: ProductRecord) => {
    setSelectedProduct(product);
    setQuery(product.title);
    setUnitPrice(product.sellingPrice);
    setQuantity(1);
  };

  const updateQuantity = (value: number) => {
    const nextQuantity = Math.max(1, Math.floor(Number.isFinite(value) ? value : 1));

    if (selectedProductRemainingQuantity !== null && selectedProductRemainingQuantity > 0) {
      setQuantity(Math.min(nextQuantity, selectedProductRemainingQuantity));
      return;
    }

    setQuantity(nextQuantity);
  };

  const incrementQuantity = () => {
    updateQuantity(quantity + 1);
  };

  const decrementQuantity = () => {
    updateQuantity(quantity - 1);
  };

  const updateDraftLineQuantity = (lineKey: string, nextQuantity: number) => {
    setLines((current) =>
      current.map((line) => {
        if (line.key !== lineKey) {
          return line;
        }

        const otherQuantity = current
          .filter((item) => item.key !== line.key && item.productId === line.productId)
          .reduce((total, item) => total + item.quantity, 0);
        const maxQuantity = Math.max(1, line.stock - otherQuantity);

        return {
          ...line,
          quantity: Math.min(maxQuantity, Math.max(1, Math.floor(Number.isFinite(nextQuantity) ? nextQuantity : 1)))
        };
      })
    );
  };

  const addLine = () => {
    if (!selectedProduct) {
      toast.error("Choose a product.");
      return;
    }

    if (quantity < 1) {
      toast.error("Quantity must be at least 1.");
      return;
    }

    const stockLimit = selectedProductStockLimit ?? selectedProduct.quantity;

    if (selectedProductReservedQuantity + quantity > stockLimit) {
      toast.error(`${selectedProduct.title} only has ${stockLimit} in stock.`);
      return;
    }

    setLines((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        productId: selectedProduct.id,
        productTitle: selectedProduct.title,
        productSku: selectedProduct.sku,
        quantity,
        unitPrice,
        unitCost: selectedProduct.costPrice,
        stock: stockLimit
      }
    ]);
    setQuery("");
    setSelectedProduct(null);
    setQuantity(1);
    setUnitPrice(0);
  };

  const applyBulkSuggestion = (product: ProductRecord) => {
    const cursor = bulkTextareaRef.current?.selectionStart ?? bulkText.length;
    const range = bulkClauseRange(bulkText, cursor);
    const nextClause = bulkClauseWithProduct(range.clause, product.title);
    const nextText = `${bulkText.slice(0, range.start)}${nextClause.value}${bulkText.slice(range.end)}`;
    const nextCursor = range.start + nextClause.cursorOffset;

    setBulkText(nextText);
    setBulkCursor(nextCursor);
    requestAnimationFrame(() => {
      bulkTextareaRef.current?.focus();
      bulkTextareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const addBulkLines = () => {
    if (!bulkText.trim()) {
      toast.error("Type sale items first.");
      return;
    }

    if (!bulkPreview.length || bulkHasErrors) {
      toast.error("Fix highlighted text sale items.");
      return;
    }

    setLines((current) => [
      ...current,
      ...bulkPreview.map((item) => ({
        key: crypto.randomUUID(),
        productId: item.product!.id,
        productTitle: item.product!.title,
        productSku: item.product!.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost: item.product!.costPrice,
        stock: item.product!.quantity
      }))
    ]);
    setBulkText("");
    setBulkCursor(0);
    toast.success("Text sale added.");
  };

  const resetSaleForm = () => {
    setQuery("");
    setSelectedProduct(null);
    setQuantity(1);
    setUnitPrice(0);
    setBulkText("");
    setBulkCursor(0);
    setSaleDate(todayInputValue());
    setPaymentMode("CASH");
    setNote("");
    setLines([]);
    setEditingSaleId(null);
  };

  const startEditSale = (sale: SaleRecord) => {
    const productMap = new Map(products.map((product) => [product.id, product]));
    const originalQuantityByProduct = sale.lines.reduce((quantities, line) => {
      if (line.productId) {
        quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.quantity);
      }

      return quantities;
    }, new Map<string, number>());
    const nextLines: DraftLine[] = [];

    for (const line of sale.lines) {
      if (!line.productId) {
        toast.error("This sale has a removed product and cannot be edited safely.");
        return;
      }

      const product = productMap.get(line.productId);

      if (!product) {
        toast.error(`${line.productTitle} is no longer in inventory.`);
        return;
      }

      nextLines.push({
        key: crypto.randomUUID(),
        productId: product.id,
        productTitle: product.title,
        productSku: product.sku,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        unitCost: product.costPrice,
        stock: product.quantity + (originalQuantityByProduct.get(product.id) ?? 0)
      });
    }

    setEditingSaleId(sale.id);
    setSaleDate(saleDateInputValue(sale.saleDate));
    setPaymentMode(sale.paymentMode);
    setNote(sale.note ?? "");
    setLines(nextLines);
    setBulkText("");
    setBulkCursor(0);
    setQuery("");
    setSelectedProduct(null);
    setQuantity(1);
    setUnitPrice(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteSale = (sale: SaleRecord) => {
    const confirmed = window.confirm("Delete this sale log and restore its stock?");

    if (!confirmed) {
      return;
    }

    setDeletingSaleId(sale.id);
    startTransition(async () => {
      const result = await deleteSaleAction(sale.id);

      setDeletingSaleId(null);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);

      if (editingSaleId === sale.id) {
        resetSaleForm();
      }

      router.refresh();
    });
  };

  const saveSale = () => {
    if (!lines.length) {
      toast.error("Add at least one product.");
      return;
    }

    startTransition(async () => {
      const payload = {
        saleDate,
        paymentMode,
        note,
        lines: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice
        }))
      };
      const result = editingSaleId
        ? await updateSaleAction({
            saleId: editingSaleId,
            ...payload
          })
        : await createSaleAction(payload);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      resetSaleForm();
      router.refresh();
    });
  };

  return (
    <div className="grid gap-4">
      <div className={cn("grid gap-2", displaySettings.showMargin ? "grid-cols-2 xl:grid-cols-4" : "grid-cols-2 xl:grid-cols-3")}>
        <StatCard title="Today" value={formatCurrency(metrics.todayRevenue)} icon={IndianRupee} tone="green" compact />
        <StatCard title="Items" value={String(metrics.todayItems)} icon={ReceiptText} tone="blue" compact />
        {displaySettings.showMargin ? (
          <StatCard title="Profit" value={formatCurrency(metrics.todayProfit)} icon={TrendingUp} tone="orange" compact />
        ) : null}
        <StatCard title="Month" value={formatCurrency(metrics.monthRevenue)} icon={CalendarDays} tone="neutral" compact />
      </div>

      <Card>
        <CardHeader className="grid gap-2 space-y-0 sm:flex sm:items-center sm:justify-between">
          <div>
            <CardTitle>{editingSaleId ? "Edit Sale" : "Quick Sale"}</CardTitle>
            {editingSaleId ? <p className="text-sm text-muted-foreground">Editing an existing day log.</p> : null}
          </div>
          {editingSaleId ? (
            <Button type="button" variant="outline" size="sm" onClick={resetSaleForm}>
              <X />
              Cancel Edit
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="relative grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="bulkSaleText">Fast entry</Label>
              {bulkPreview.length ? <span className="text-xs font-medium">{formatCurrency(bulkTotal)}</span> : null}
            </div>
            <Textarea
              ref={bulkTextareaRef}
              id="bulkSaleText"
              value={bulkText}
              onChange={(event) => {
                setBulkText(event.target.value);
                setBulkCursor(event.target.selectionStart);
              }}
              onClick={(event) => setBulkCursor(event.currentTarget.selectionStart)}
              onKeyUp={(event) => setBulkCursor(event.currentTarget.selectionStart)}
              onKeyDown={(event) => {
                if (event.key === "Tab" && bulkSuggestions[0]) {
                  event.preventDefault();
                  applyBulkSuggestion(bulkSuggestions[0]);
                  return;
                }

                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  addBulkLines();
                }
              }}
              placeholder="1x cobra blade @250, 3x drill bit @150"
              className="min-h-20 font-mono text-sm sm:min-h-16"
            />
            {bulkSuggestions.length ? (
              <div className="max-h-60 overflow-auto rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-md">
                {bulkSuggestions.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className="grid w-full grid-cols-[1fr_auto] gap-2 rounded-sm px-2 py-2 text-left outline-none hover:bg-muted"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyBulkSuggestion(product)}
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
                ))}
              </div>
            ) : null}

            {bulkPreview.length ? (
              <div className="grid gap-1 rounded-lg border p-2 text-xs">
                {bulkPreview.map((item) => (
                  <div
                    key={item.key}
                    className={cn(
                      "grid grid-cols-[1fr_auto] gap-2 rounded-md px-2 py-1.5",
                      item.status === "error" ? "bg-red-50 text-red-700" : "bg-muted/40"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {item.product ? item.product.title : item.input}
                        <span className="font-normal text-muted-foreground"> x {item.quantity}</span>
                      </p>
                      <p className="truncate text-muted-foreground">{item.message}</p>
                    </div>
                    <span className="font-semibold">{formatCurrency(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="grid gap-2 sm:flex sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Use comma or new line: 2x product name @250. @ sets sold price; omit @ for default. Type a few letters, Tab picks first suggestion.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={addBulkLines} disabled={!bulkText.trim()}>
                <WandSparkles />
                Add from Text
              </Button>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-[1fr_120px_140px_auto]">
            <ProductSalePicker products={productsForDraft} query={query} onQueryChange={setQuery} onSelect={pickProduct} />
            <div className="grid grid-cols-[2.5rem_1fr_2.5rem] overflow-hidden rounded-md border border-input bg-background">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 rounded-none"
                onClick={decrementQuantity}
                disabled={quantity <= 1}
              >
                <Minus />
                <span className="sr-only">Decrease quantity</span>
              </Button>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => updateQuantity(Number(event.target.value))}
                placeholder="Qty"
                className="h-10 rounded-none border-0 text-center focus-visible:ring-0"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 rounded-none"
                onClick={incrementQuantity}
                disabled={selectedProductRemainingQuantity !== null && selectedProductRemainingQuantity <= quantity}
              >
                <Plus />
                <span className="sr-only">Increase quantity</span>
              </Button>
            </div>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={unitPrice}
              onChange={(event) => setUnitPrice(Number(event.target.value))}
              placeholder="Sold price"
            />
            <Button type="button" onClick={addLine} className="w-full">
              <Plus />
              Add
            </Button>
          </div>

          {selectedProduct ? (
            <p className="text-xs text-muted-foreground">
              Selected {selectedProduct.sku}. Stock {selectedProduct.quantity}. Default price {formatCurrency(selectedProduct.sellingPrice)}.
            </p>
          ) : null}

          {lines.length ? (
            <div className="grid gap-2 rounded-lg border p-2">
              {lines.map((line) => (
                <div key={line.key} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md bg-muted/40 p-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{line.productTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {line.quantity} x {formatCurrency(line.unitPrice)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => updateDraftLineQuantity(line.key, line.quantity - 1)}
                      disabled={line.quantity <= 1}
                    >
                      <Minus className="size-4" />
                      <span className="sr-only">Decrease</span>
                    </Button>
                    <span className="w-5 text-center text-xs font-semibold">{line.quantity}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => updateDraftLineQuantity(line.key, line.quantity + 1)}
                    >
                      <Plus className="size-4" />
                      <span className="sr-only">Increase</span>
                    </Button>
                    <span className="font-semibold">{formatCurrency(line.quantity * line.unitPrice)}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="saleDate">Date</Label>
              <Input id="saleDate" type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Payment</Label>
              <Select value={paymentMode} onValueChange={(value) => setPaymentMode(value as typeof paymentMode)}>
                <SelectTrigger>
                  <span>{paymentMode === "UPI" ? "UPI" : "Cash"}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="saleNote">Day note</Label>
            <Textarea id="saleNote" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note for this sale log" />
          </div>

          <div className="grid gap-2 rounded-lg bg-muted/40 p-3 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sale Total</p>
              <p className="text-xl font-semibold">{formatCurrency(subtotal)}</p>
              {displaySettings.showMargin ? <p className="text-xs text-emerald-600">Profit {formatCurrency(profit)}</p> : null}
            </div>
            <Button type="button" onClick={saveSale} disabled={isPending || !lines.length}>
              {isPending ? <Loader2 className="animate-spin" /> : <ReceiptText />}
              {editingSaleId ? "Update Sale" : "Save Sale"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Sales Logs</h2>
          <span className="text-xs text-muted-foreground">{groupedSales.length} days</span>
        </div>

        {groupedSales.length ? (
          groupedSales.map((group) => (
            <div key={group.key} className="overflow-hidden rounded-lg border bg-card">
              <div className="grid gap-2 border-b bg-muted/45 px-3 py-3 sm:flex sm:items-center sm:justify-between sm:px-4">
                <div>
                  <h3 className="text-sm font-semibold">{group.key}</h3>
                  <p className="text-xs text-muted-foreground">
                    {group.sales.length} logs · {group.items} items
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">{formatCurrency(group.revenue)}</Badge>
                  {displaySettings.showMargin ? <Badge variant="outline">Profit {formatCurrency(group.profit)}</Badge> : null}
                </div>
              </div>
              <div className="grid">
                {group.sales.map((sale) => (
                  <SalesLogCard
                    key={sale.id}
                    sale={sale}
                    showMargin={displaySettings.showMargin}
                    onEdit={startEditSale}
                    onDelete={deleteSale}
                    isDeleting={deletingSaleId === sale.id}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border px-4 py-10 text-center text-sm text-muted-foreground">No sales logged yet.</div>
        )}
      </section>
    </div>
  );
}
