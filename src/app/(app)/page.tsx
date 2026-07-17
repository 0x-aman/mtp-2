import Link from "next/link";
import { AlertTriangle, Boxes, IndianRupee, Plus, Upload } from "lucide-react";

import { DatabaseBanner } from "@/components/database-banner";
import { PageHeader } from "@/components/page-header";
import { ProductTable } from "@/components/product-table";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { getInventoryDataset } from "@/lib/inventory-data";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

export default async function DashboardPage() {
  const dataset = await getInventoryDataset();

  return (
    <>
      <PageHeader
        title="Inventory"
        actionsClassName="hidden sm:flex"
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/import/csv">
                <Upload />
                Import
              </Link>
            </Button>
            <Button asChild>
              <Link href="/products/new">
                <Plus />
                New Product
              </Link>
            </Button>
          </>
        }
      />
      <DatabaseBanner ready={dataset.databaseReady} error={dataset.error} />

      <div
        className={cn(
          "mb-2 grid gap-1.5 sm:mb-4 sm:gap-2",
          dataset.displaySettings.showCostPrice ? "grid-cols-3" : "grid-cols-2"
        )}
      >
        <StatCard title="Products" value={formatNumber(dataset.metrics.totalProducts)} icon={Boxes} tone="blue" compact />
        {dataset.displaySettings.showCostPrice ? (
          <StatCard
            title="Stock Value"
            value={formatCurrency(dataset.metrics.inventoryValue)}
            icon={IndianRupee}
            tone="green"
            compact
          />
        ) : null}
        <StatCard
          title="Low Stock"
          value={formatNumber(dataset.metrics.lowStockProducts)}
          icon={AlertTriangle}
          tone={dataset.metrics.lowStockProducts ? "red" : "green"}
          compact
        />
      </div>

      <ProductTable products={dataset.products} databaseReady={dataset.databaseReady} displaySettings={dataset.displaySettings} />
    </>
  );
}
