"use client";

import { useState } from "react";
import { Plus, Printer, Trash2 } from "lucide-react";

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

      <div className="bill-preview-wrapper">
        <Card className="print-area bill-paper overflow-hidden">
          <CardContent className="p-0">
            <div className="bill-title-strip">
              <p>Cash Bill</p>
              <div>
                <span>Invoice No: {billNumber}</span>
                <span>Date: {todayLabel()}</span>
              </div>
            </div>

            <div className="bill-company">
              <h2>{shop.name}</h2>
              <p>{shop.address}</p>
              <p>Phone No: {shop.contact}</p>
            </div>

            <div className="bill-body">
              <div className="bill-party-box">
                <p className="bill-box-label">Party&apos;s Name: -</p>
                <p className="bill-party-name">{customer || "Walk-in Customer"}</p>
                <p>{phone ? `Phone: ${phone}` : "Phone: -"}</p>
              </div>

              <div className="bill-table-wrap">
                <table className="bill-table">
                  <thead>
                    <tr>
                      <th className="bill-col-index">#</th>
                      <th>Particulars (Descriptions & Specifications)</th>
                      <th className="bill-col-qty">Qty</th>
                      <th className="bill-col-money">Rate</th>
                      <th className="bill-col-money">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={line.key}>
                        <td className="bill-col-index">{index + 1}</td>
                        <td>
                          <p className="bill-item-title">{line.title}</p>
                        </td>
                        <td className="bill-col-qty">{line.quantity}</td>
                        <td className="bill-col-money">{formatCurrency(line.unitPrice)}</td>
                        <td className="bill-col-money bill-line-total">{formatCurrency(line.quantity * line.unitPrice)}</td>
                      </tr>
                    ))}
                    {!lines.length ? (
                      <tr>
                        <td colSpan={5} className="bill-empty-row">
                          No items added.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="bill-lower-grid">
                <div className="bill-note">
                  <p>no return, no exchange, no warranty</p>
                </div>
                <div className="bill-total-box">
                  <div className="bill-total-row">
                    <span>Total</span>
                    <strong>{formatCurrency(total)}</strong>
                  </div>
                  <div className="bill-grand-row">
                    <span>Grand Total</span>
                    <strong>{formatCurrency(total)}</strong>
                  </div>
                </div>
              </div>

              <div className="bill-footer">
                <div className="bill-signature">
                  <span />
                  <strong>Authorized Signature</strong>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
