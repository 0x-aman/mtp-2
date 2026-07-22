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

          <div className="overflow-x-auto rounded-lg border">
            {lines.length ? (
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-muted/60">
                  <tr className="text-left">
                    <th className="border-b px-2 py-2 font-medium">Item</th>
                    <th className="border-b px-2 py-2 text-center font-medium">Qty</th>
                    <th className="border-b px-2 py-2 text-right font-medium">Rate</th>
                    <th className="border-b px-2 py-2 text-right font-medium">Amount</th>
                    <th className="border-b px-2 py-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.key} className="border-b last:border-0">
                      <td className="px-2 py-2">
                        <p className="font-medium">{line.title}</p>
                        <p className="text-xs text-muted-foreground">{line.sku}</p>
                      </td>
                      <td className="px-2 py-2 text-center">{line.quantity}</td>
                      <td className="px-2 py-2 text-right">{formatCurrency(line.unitPrice)}</td>
                      <td className="px-2 py-2 text-right font-semibold">{formatCurrency(line.quantity * line.unitPrice)}</td>
                      <td className="px-2 py-2 text-right">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

      <Card className="print-area overflow-hidden">
        <CardContent className="p-0">
          <div className="border-b bg-muted/30 px-5 py-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cash Bill</p>
            <h2 className="text-2xl font-bold uppercase">{shop.name}</h2>
            <p className="mx-auto mt-1 max-w-2xl text-sm text-muted-foreground">{shop.address}</p>
            <p className="text-sm font-medium">Contact: {shop.contact}</p>
          </div>

          <div className="grid border-b text-sm sm:grid-cols-2">
            <div className="grid gap-1 border-b p-4 sm:border-b-0 sm:border-r">
              <p>
                <span className="font-medium">Bill No:</span> {billNumber}
              </p>
              <p>
                <span className="font-medium">Date:</span> {todayLabel()}
              </p>
            </div>
            <div className="grid gap-1 p-4">
              <p>
                <span className="font-medium">Customer:</span> {customer || "Walk-in"}
              </p>
              <p>
                <span className="font-medium">Phone:</span> {phone || "-"}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead>
                <tr className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <th className="w-12 border px-2 py-2 text-center font-medium">#</th>
                  <th className="border px-2 py-2 font-medium">Description</th>
                  <th className="w-28 border px-2 py-2 font-medium">SKU</th>
                  <th className="w-20 border px-2 py-2 text-center font-medium">Qty</th>
                  <th className="w-28 border px-2 py-2 text-right font-medium">Rate</th>
                  <th className="w-32 border px-2 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={line.key} className="border-b last:border-0">
                    <td className="border px-2 py-2 text-center">{index + 1}</td>
                    <td className="border px-2 py-2">
                      <p className="font-medium">{line.title}</p>
                    </td>
                    <td className="border px-2 py-2 text-xs text-muted-foreground">{line.sku}</td>
                    <td className="border px-2 py-2 text-center">{line.quantity}</td>
                    <td className="border px-2 py-2 text-right">{formatCurrency(line.unitPrice)}</td>
                    <td className="border px-2 py-2 text-right font-medium">{formatCurrency(line.quantity * line.unitPrice)}</td>
                  </tr>
                ))}
                {!lines.length ? (
                  <tr>
                    <td colSpan={6} className="border px-2 py-10 text-center text-muted-foreground">
                      No items added.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="grid border-b sm:grid-cols-[1fr_18rem]">
            <div className="min-h-24 border-b p-4 text-sm text-muted-foreground sm:border-b-0 sm:border-r">
              Goods once sold will not be taken back without bill.
            </div>
            <div className="grid text-sm">
              <div className="grid grid-cols-2 border-b">
                <span className="border-r px-3 py-2 font-medium">Subtotal</span>
                <span className="px-3 py-2 text-right">{formatCurrency(total)}</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="border-r px-3 py-3 text-base font-bold">Grand Total</span>
                <span className="px-3 py-3 text-right text-xl font-bold">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-8 px-5 py-5 text-sm sm:grid-cols-2">
            <p className="text-muted-foreground">Thank you for your business.</p>
            <p className="text-right font-medium">Authorized Signature</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
