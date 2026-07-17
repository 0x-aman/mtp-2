import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Edit, IndianRupee, Package, TrendingUp, WalletCards } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ProductIcon } from "@/components/product-icon";
import { StatCard } from "@/components/stat-card";
import { StockBadge } from "@/components/stock-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProductById } from "@/lib/inventory-data";
import { getDisplaySettings } from "@/lib/settings";
import { compactDate, formatCurrency } from "@/lib/utils";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, displaySettings] = await Promise.all([getProductById(id), getDisplaySettings()]);

  if (!product) {
    notFound();
  }

  const inventoryValue = product.costPrice * product.quantity;
  const revenue = product.sellingPrice * product.quantity;
  const profit = revenue - inventoryValue;
  const backHref = product.isMachine ? "/rent" : "/";
  const backLabel = product.isMachine ? "Rent" : "Inventory";

  return (
    <>
      <PageHeader
        title={product.title}
        description={`${product.sku} / ${product.brand ?? "Unbranded"} / ${product.category ?? "Uncategorized"}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={backHref}>
                <ArrowLeft />
                {backLabel}
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/products/${product.id}/edit`}>
                <Edit />
                Edit
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardContent className="p-5">
            <ProductIcon
              title={product.title}
              brand={product.brand}
              category={product.category}
              href={`/products/${product.id}`}
              className="h-56 w-full sm:h-72"
              iconClassName="size-14"
            />
            <div className="mt-5 grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">SKU</span>
                <Badge variant="outline">{product.sku}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Type</span>
                <Badge variant={product.isMachine ? "success" : "secondary"}>
                  {product.isMachine ? "Rentable machine" : "Sellable product"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{product.isMachine ? "Quantity" : "Stock Status"}</span>
                {product.isMachine ? (
                  <span className="font-medium">{product.quantity}</span>
                ) : (
                  <StockBadge quantity={product.quantity} reorderLevel={product.reorderLevel} />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{compactDate(product.updatedAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid content-start gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Quantity" value={String(product.quantity)} icon={Package} tone="blue" />
            {product.isMachine ? (
              <>
                <StatCard title="Daily Rent" value={formatCurrency(product.defaultDailyRent ?? 0)} icon={Clock} tone="green" />
                <StatCard
                  title="Default Deposit"
                  value={formatCurrency(product.defaultRentDeposit ?? 0)}
                  icon={IndianRupee}
                  tone="orange"
                />
              </>
            ) : (
              <>
                {displaySettings.showCostPrice ? (
                  <StatCard title="Inventory Value" value={formatCurrency(inventoryValue)} icon={WalletCards} tone="orange" />
                ) : null}
                <StatCard title="Potential Revenue" value={formatCurrency(revenue)} icon={TrendingUp} tone="green" />
                {displaySettings.showMargin ? (
                  <StatCard title="Expected Profit" value={formatCurrency(profit)} icon={IndianRupee} tone="blue" />
                ) : null}
              </>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{product.isMachine ? "Machine Information" : "Product Information"}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Brand</p>
                <p className="mt-1 font-medium">{product.brand ?? "Unbranded"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="mt-1 font-medium">{product.category ?? "Uncategorized"}</p>
              </div>
              {product.isMachine ? (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Default Deposit</p>
                    <p className="mt-1 font-medium">{formatCurrency(product.defaultRentDeposit ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Default Daily Rent</p>
                    <p className="mt-1 font-medium">{formatCurrency(product.defaultDailyRent ?? 0)}</p>
                  </div>
                </>
              ) : (
                <>
                  {displaySettings.showCostPrice ? (
                    <div>
                      <p className="text-sm text-muted-foreground">Cost Price</p>
                      <p className="mt-1 font-medium">{formatCurrency(product.costPrice)}</p>
                    </div>
                  ) : null}
                  <div>
                    <p className="text-sm text-muted-foreground">Selling Price</p>
                    <p className="mt-1 font-medium">{formatCurrency(product.sellingPrice)}</p>
                  </div>
                  {displaySettings.showMargin ? (
                    <div>
                      <p className="text-sm text-muted-foreground">Margin</p>
                      <p className="mt-1 font-medium">{product.marginPercent}%</p>
                    </div>
                  ) : null}
                </>
              )}
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="mt-1 whitespace-pre-wrap">{product.description || "No description added."}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
