"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, IndianRupee, Loader2, Plus, ReceiptText, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { createSaleAction } from "@/app/actions/sales";
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
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DisplaySettings, ProductRecord, SaleRecord, SalesMetrics } from "@/lib/types";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";

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

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function dateKey(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function SalesLogCard({ sale, showMargin }: { sale: SaleRecord; showMargin: boolean }) {
  return (
    <article className="grid gap-3 border-b py-3 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{formatDateTime(sale.saleDate)}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge variant="secondary">{sale.paymentMode}</Badge>
            {sale.customer ? <Badge variant="outline">{sale.customer}</Badge> : null}
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold">{formatCurrency(sale.subtotal)}</p>
          {showMargin ? <p className="text-xs text-emerald-600">Profit {formatCurrency(sale.grossProfit)}</p> : null}
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
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [saleDate, setSaleDate] = useState(todayInputValue());
  const [customer, setCustomer] = useState("");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CARD" | "OTHER">("CASH");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [isPending, startTransition] = useTransition();

  const subtotal = lines.reduce((total, line) => total + line.quantity * line.unitPrice, 0);
  const profit = lines.reduce((total, line) => total + line.quantity * (line.unitPrice - line.unitCost), 0);
  const groupedSales = useMemo(() => {
    return sales.reduce<Array<{ key: string; sales: SaleRecord[] }>>((groups, sale) => {
      const key = dateKey(sale.saleDate);
      const group = groups.find((item) => item.key === key);

      if (group) {
        group.sales.push(sale);
      } else {
        groups.push({ key, sales: [sale] });
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

  const addLine = () => {
    if (!selectedProduct) {
      toast.error("Choose a product.");
      return;
    }

    if (quantity < 1) {
      toast.error("Quantity must be at least 1.");
      return;
    }

    if (quantity > selectedProduct.quantity) {
      toast.error(`${selectedProduct.title} only has ${selectedProduct.quantity} in stock.`);
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
        stock: selectedProduct.quantity
      }
    ]);
    setQuery("");
    setSelectedProduct(null);
    setQuantity(1);
    setUnitPrice(0);
  };

  const saveSale = () => {
    if (!lines.length) {
      toast.error("Add at least one product.");
      return;
    }

    startTransition(async () => {
      const result = await createSaleAction({
        saleDate,
        customer,
        paymentMode,
        note,
        lines: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice
        }))
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setLines([]);
      setCustomer("");
      setNote("");
      setSaleDate(todayInputValue());
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
        <CardHeader>
          <CardTitle>Quick Sale</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2 md:grid-cols-[1fr_120px_140px_auto]">
            <ProductSalePicker products={products} query={query} onQueryChange={setQuery} onSelect={pickProduct} />
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              placeholder="Qty"
            />
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
                  <div className="flex items-center gap-2">
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

          <div className="grid gap-3 md:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="saleDate">Date</Label>
              <Input id="saleDate" type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Payment</Label>
              <Select value={paymentMode} onValueChange={(value) => setPaymentMode(value as typeof paymentMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="customer">Customer / note</Label>
              <Input id="customer" value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="Optional" />
            </div>
          </div>

          <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Sale note (optional)" />

          <div className="grid gap-2 rounded-lg bg-muted/40 p-3 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sale Total</p>
              <p className="text-xl font-semibold">{formatCurrency(subtotal)}</p>
              {displaySettings.showMargin ? <p className="text-xs text-emerald-600">Profit {formatCurrency(profit)}</p> : null}
            </div>
            <Button type="button" onClick={saveSale} disabled={isPending || !lines.length}>
              {isPending ? <Loader2 className="animate-spin" /> : <ReceiptText />}
              Save Sale
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sales Logs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {groupedSales.length ? (
            <div className="grid">
              {groupedSales.map((group) => (
                <section key={group.key} className="border-b px-4 py-3 last:border-0">
                  <h3 className="mb-1 text-sm font-semibold">{group.key}</h3>
                  {group.sales.map((sale) => (
                    <SalesLogCard key={sale.id} sale={sale} showMargin={displaySettings.showMargin} />
                  ))}
                </section>
              ))}
            </div>
          ) : (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">No sales logged yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
