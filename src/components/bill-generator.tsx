"use client";

import { useState } from "react";
import { FileText, Plus, Printer, Trash2 } from "lucide-react";

import { ProductSalePicker } from "@/components/product-sale-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductRecord, ShopDetails } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type BillLine = {
  key: string;
  productId: string;
  title: string;
  sku: string;
  quantity: number;
  unitPrice: number;
};

function todayLabel() {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date());
}

export function BillGenerator({ products, shop }: { products: ProductRecord[]; shop: ShopDetails }) {
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [lines, setLines] = useState<BillLine[]>([]);
  const billNumber = `MPT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  const total = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

  const pickProduct = (product: ProductRecord) => {
    setSelectedProduct(product);
    setQuery(product.title);
    setUnitPrice(product.sellingPrice);
    setQuantity(1);
  };

  const addLine = () => {
    if (!selectedProduct) {
      return;
    }

    setLines((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        productId: selectedProduct.id,
        title: selectedProduct.title,
        sku: selectedProduct.sku,
        quantity: Math.max(1, quantity),
        unitPrice: Math.max(0, unitPrice)
      }
    ]);
    setSelectedProduct(null);
    setQuery("");
    setQuantity(1);
    setUnitPrice(0);
  };

  return (
    <div className="grid gap-4">
      <Card className="no-print">
        <CardHeader>
          <CardTitle>Bill Items</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="billCustomer">Customer name</Label>
              <Input id="billCustomer" value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="Optional" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="billPhone">Phone</Label>
              <Input id="billPhone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-[1fr_120px_140px_auto]">
            <ProductSalePicker products={products} query={query} onQueryChange={setQuery} onSelect={pickProduct} />
            <Input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
            <Input type="number" min={0} step="0.01" value={unitPrice} onChange={(event) => setUnitPrice(Number(event.target.value))} />
            <Button type="button" onClick={addLine} disabled={!selectedProduct}>
              <Plus />
              Add
            </Button>
          </div>

          <div className="grid gap-2 rounded-lg border p-2">
            {lines.length ? (
              lines.map((line) => (
                <div key={line.key} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md bg-muted/40 p-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{line.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {line.quantity} x {formatCurrency(line.unitPrice)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatCurrency(line.quantity * line.unitPrice)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">Add products to generate a bill.</div>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Bill total</p>
              <p className="text-2xl font-semibold">{formatCurrency(total)}</p>
            </div>
            <Button type="button" disabled={!lines.length} onClick={() => window.print()}>
              <Printer />
              Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="print-area">
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">{shop.name}</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">{shop.address}</p>
              <p className="text-sm text-muted-foreground">Contact: {shop.contact}</p>
            </div>
            <div className="text-sm sm:text-right">
              <p className="font-semibold">Bill</p>
              <p className="text-muted-foreground">{billNumber}</p>
              <p className="text-muted-foreground">{todayLabel()}</p>
            </div>
          </div>

          <div className="grid gap-1 border-b py-4 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Customer:</span> {customer || "Walk-in"}
            </p>
            <p>
              <span className="text-muted-foreground">Phone:</span> {phone || "-"}
            </p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Item</th>
                  <th className="py-2 pr-3 font-medium">Qty</th>
                  <th className="py-2 pr-3 font-medium">Rate</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.key} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      <p className="font-medium">{line.title}</p>
                      <p className="text-xs text-muted-foreground">{line.sku}</p>
                    </td>
                    <td className="py-2 pr-3">{line.quantity}</td>
                    <td className="py-2 pr-3">{formatCurrency(line.unitPrice)}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(line.quantity * line.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex justify-end">
            <div className="min-w-44 rounded-lg bg-muted/50 p-3 text-right">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{formatCurrency(total)}</p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">Thank you for your business.</p>
        </CardContent>
      </Card>
    </div>
  );
}
