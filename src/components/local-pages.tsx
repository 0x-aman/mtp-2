"use client";

import type { DependencyList } from "react";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Clock,
  CloudDownload,
  Edit,
  FileText,
  FileUp,
  IndianRupee,
  Loader2,
  Package,
  Plus,
  ReceiptText,
  TrendingUp,
  Upload,
  WalletCards
} from "lucide-react";

import { AnalyticsPanel } from "@/components/analytics-panel";
import { BillGenerator } from "@/components/bill-generator";
import { CsvImportClient } from "@/components/csv-import-client";
import { MachineForm } from "@/components/machine-form";
import { OcrImportClient } from "@/components/ocr-import-client";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/product-form";
import { ProductIcon } from "@/components/product-icon";
import { ProductTable } from "@/components/product-table";
import { RentManager } from "@/components/rent-manager";
import { SalesManager } from "@/components/sales-manager";
import { StatCard } from "@/components/stat-card";
import { StockBadge } from "@/components/stock-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { shopDetails } from "@/lib/app-config";
import {
  LOCAL_DATA_CHANGED_EVENT,
  getLocalDisplaySettings,
  getLocalInventoryDataset,
  getLocalMachineFormOptions,
  getLocalNextMachineSku,
  getLocalNextSku,
  getLocalProductById,
  getLocalProductFormOptions,
  getLocalRentalDataset,
  getLocalSalesDataset,
  importServerDatabaseSnapshot
} from "@/lib/local-db";
import type {
  DisplaySettings,
  InventoryDataset,
  ProductFormOptions,
  ProductRecord,
  RentalDataset,
  SalesDataset
} from "@/lib/types";
import { cn, compactDate, formatCurrency, formatNumber } from "@/lib/utils";
import { toast } from "sonner";

type LocalState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

function useLocalData<T>(loader: () => Promise<T>, deps: DependencyList = []): LocalState<T> {
  const [state, setState] = useState<LocalState<T>>({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let active = true;

    const run = async (showLoading: boolean) => {
      if (showLoading) {
        setState((current) => ({
          ...current,
          loading: true
        }));
      }

      try {
        const data = await loader();

        if (active) {
          setState({
            data,
            loading: false,
            error: null
          });
        }
      } catch (error) {
        if (active) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : "Unable to open the browser database."
          });
        }
      }
    };

    void run(true);

    const onChange = () => void run(false);
    window.addEventListener(LOCAL_DATA_CHANGED_EVENT, onChange);

    return () => {
      active = false;
      window.removeEventListener(LOCAL_DATA_CHANGED_EVENT, onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

function LoadingCard({ label = "Loading browser database..." }: { label?: string }) {
  return <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">{label}</div>;
}

function LocalErrorBanner({ error }: { error: string | null }) {
  if (!error) {
    return null;
  }

  return (
    <div className="mb-3 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <p>{error}</p>
    </div>
  );
}

function ProductNotFound() {
  return (
    <Card>
      <CardContent className="grid gap-3 p-5 text-center">
        <p className="font-medium">Product not found</p>
        <p className="text-sm text-muted-foreground">This item is not in this browser database.</p>
        <Button asChild variant="outline" className="mx-auto">
          <Link href="/">Back to inventory</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function LocalEmptyBrowserPrompt() {
  const [isPending, startTransition] = useTransition();

  const importServerData = () => {
    startTransition(async () => {
      try {
        const snapshot = await importServerDatabaseSnapshot();
        const totalRecords =
          snapshot.products.length + snapshot.sales.length + snapshot.rentals.length + snapshot.activity.length;

        if (totalRecords) {
          toast.success(
            `Imported ${snapshot.products.length} products, ${snapshot.sales.length} sales, and ${snapshot.rentals.length} rentals.`
          );
        } else {
          toast.info("Server database has no records to import.");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Server database import failed.");
      }
    });
  };

  return (
    <Card>
      <CardContent className="grid gap-4 p-5 text-center">
        <div>
          <p className="font-semibold">This browser database is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Import existing products, sales, rentals, and logs from the server database, or start fresh on this device.
          </p>
        </div>
        <div className="grid gap-2 sm:mx-auto sm:grid-cols-2">
          <Button type="button" onClick={importServerData} disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <CloudDownload />}
            Import Server Data
          </Button>
          <Button asChild variant="outline">
            <Link href="/products/new">
              <Plus />
              New Product
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function LocalDashboardPage() {
  const { data: dataset, loading, error } = useLocalData<InventoryDataset>(() => getLocalInventoryDataset());

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
      <LocalErrorBanner error={error} />

      {loading || !dataset ? (
        <LoadingCard />
      ) : (
        <>
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

          <div className="mb-2 grid grid-cols-2 gap-2 sm:hidden">
            <Button asChild size="sm">
              <Link href="/sales">
                <ReceiptText />
                Sales Log
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/bill">
                <FileText />
                Bill
              </Link>
            </Button>
          </div>

          {dataset.products.length ? (
            <ProductTable products={dataset.products} databaseReady displaySettings={dataset.displaySettings} />
          ) : (
            <LocalEmptyBrowserPrompt />
          )}
        </>
      )}
    </>
  );
}

export function LocalSalesPage() {
  const { data: dataset, loading, error } = useLocalData<SalesDataset>(() => getLocalSalesDataset());

  return (
    <>
      <PageHeader title="Sales" description="Log daily sales with custom prices and review day-wise records." />
      <LocalErrorBanner error={error} />
      {loading || !dataset ? (
        <LoadingCard />
      ) : (
        <SalesManager
          products={dataset.products}
          sales={dataset.sales}
          displaySettings={dataset.displaySettings}
        />
      )}
    </>
  );
}

export function LocalRentPage() {
  const { data: dataset, loading, error } = useLocalData<RentalDataset>(() => getLocalRentalDataset());

  return (
    <>
      <PageHeader
        title="Rent"
        description="Machine availability, deposits, daily rent, and returns."
        actions={
          <Button asChild>
            <Link href="/machines/new">
              <Plus />
              New Machine
            </Link>
          </Button>
        }
      />
      <LocalErrorBanner error={error} />
      {loading || !dataset ? (
        <LoadingCard />
      ) : (
        <>
          <div className="mb-3 grid gap-2 sm:mb-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Machines" value={formatNumber(dataset.metrics.machineCount)} icon={Boxes} tone="blue" />
            <StatCard
              title="Available"
              value={formatNumber(dataset.metrics.availableMachines)}
              icon={Boxes}
              tone={dataset.metrics.availableMachines ? "green" : "red"}
            />
            <StatCard title="Open Rent" value={formatNumber(dataset.metrics.openRentals)} icon={Clock} tone="orange" />
            <StatCard
              title="Deposits Held"
              value={formatCurrency(dataset.metrics.depositsHeld)}
              icon={IndianRupee}
              tone="green"
            />
          </div>

          <RentManager machines={dataset.machines} rentals={dataset.rentals} />
        </>
      )}
    </>
  );
}

export function LocalAnalyticsPage() {
  const { data: dataset, loading, error } = useLocalData<InventoryDataset>(() => getLocalInventoryDataset());

  return (
    <>
      <PageHeader title="Analytics" description="Category, brand, margin, and low-stock views for inventory decisions." />
      <LocalErrorBanner error={error} />
      {loading || !dataset ? <LoadingCard /> : <AnalyticsPanel products={dataset.products} displaySettings={dataset.displaySettings} />}
    </>
  );
}

export function LocalBillPage() {
  const { data: dataset, loading, error } = useLocalData<SalesDataset>(() => getLocalSalesDataset());

  return (
    <>
      <PageHeader title="Bill Generator" description="Create a customer-facing bill with custom prices and export as PDF." />
      <LocalErrorBanner error={error} />
      {loading || !dataset ? <LoadingCard /> : <BillGenerator products={dataset.products} shop={shopDetails} />}
    </>
  );
}

function useProductFormData() {
  return useLocalData<{
    nextSku: string;
    formOptions: ProductFormOptions;
  }>(async () => {
    const [nextSku, formOptions] = await Promise.all([getLocalNextSku(), getLocalProductFormOptions()]);

    return {
      nextSku,
      formOptions
    };
  });
}

export function LocalNewProductPage({ addPage = false }: { addPage?: boolean }) {
  const { data, loading, error } = useProductFormData();

  return (
    <>
      <PageHeader
        title={addPage ? "Add Product" : "New Product"}
        description="Add product details, stock, and pricing."
        actions={
          addPage ? (
            <Button asChild variant="outline">
              <Link href="/import/csv">
                <FileUp />
                Import Products
              </Link>
            </Button>
          ) : undefined
        }
      />
      <LocalErrorBanner error={error} />
      {loading || !data ? <LoadingCard /> : <ProductForm defaultSku={data.nextSku} formOptions={data.formOptions} />}
    </>
  );
}

export function LocalNewMachinePage() {
  const { data, loading, error } = useLocalData<{
    nextSku: string;
    formOptions: { brands: string[]; categories: string[] };
  }>(async () => {
    const [nextSku, formOptions] = await Promise.all([getLocalNextMachineSku(), getLocalMachineFormOptions()]);

    return {
      nextSku,
      formOptions
    };
  });

  return (
    <>
      <PageHeader title="New Machine" description="Add a rentable machine and default rent values." />
      <LocalErrorBanner error={error} />
      {loading || !data ? (
        <LoadingCard />
      ) : (
        <MachineForm defaultSku={data.nextSku} brands={data.formOptions.brands} categories={data.formOptions.categories} />
      )}
    </>
  );
}

export function LocalProductEditPage({ id }: { id: string }) {
  const { data, loading, error } = useLocalData<{
    product: ProductRecord | null;
    nextSku: string;
    nextMachineSku: string;
    formOptions: ProductFormOptions;
    machineOptions: { brands: string[]; categories: string[] };
  }>(
    async () => {
      const [product, nextSku, nextMachineSku, formOptions, machineOptions] = await Promise.all([
        getLocalProductById(id),
        getLocalNextSku(),
        getLocalNextMachineSku(),
        getLocalProductFormOptions(),
        getLocalMachineFormOptions()
      ]);

      return {
        product,
        nextSku,
        nextMachineSku,
        formOptions,
        machineOptions
      };
    },
    [id]
  );

  if (loading || !data) {
    return (
      <>
        <PageHeader title="Edit Product" description="Loading product from browser storage." />
        <LocalErrorBanner error={error} />
        <LoadingCard />
      </>
    );
  }

  if (!data.product) {
    return (
      <>
        <PageHeader title="Edit Product" />
        <ProductNotFound />
      </>
    );
  }

  if (data.product.isMachine) {
    return (
      <>
        <PageHeader title="Edit Machine" description="Update machine quantity and rent defaults." />
        <MachineForm
          machine={data.product}
          defaultSku={data.nextMachineSku}
          brands={data.machineOptions.brands}
          categories={data.machineOptions.categories}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Edit Product" description="Update product details, stock, and pricing." />
      <ProductForm product={data.product} defaultSku={data.nextSku} formOptions={data.formOptions} />
    </>
  );
}

export function LocalProductDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { data, loading, error } = useLocalData<{
    product: ProductRecord | null;
    displaySettings: DisplaySettings;
  }>(
    async () => {
      const [product, displaySettings] = await Promise.all([getLocalProductById(id), getLocalDisplaySettings()]);

      return {
        product,
        displaySettings
      };
    },
    [id]
  );

  if (loading || !data) {
    return (
      <>
        <PageHeader title="Product" description="Loading product from browser storage." />
        <LocalErrorBanner error={error} />
        <LoadingCard />
      </>
    );
  }

  if (!data.product) {
    return (
      <>
        <PageHeader title="Product" />
        <ProductNotFound />
      </>
    );
  }

  const { product, displaySettings } = data;
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
            <Button type="button" variant="outline" onClick={() => router.push(backHref)}>
              <ArrowLeft />
              {backLabel}
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

export function LocalCsvImportPage() {
  return (
    <>
      <PageHeader title="CSV Import" description="Upload, validate, preview, edit, and bulk insert product rows." />
      <CsvImportClient />
    </>
  );
}

export function LocalOcrImportPage() {
  const { data, loading, error } = useLocalData<{ nextSku: string }>(async () => ({
    nextSku: await getLocalNextSku()
  }));

  return (
    <>
      <PageHeader
        title="AI Image Import"
        description="Extract product fields from a product box, label, or supplier invoice image, then confirm before saving."
      />
      <LocalErrorBanner error={error} />
      {loading || !data ? <LoadingCard /> : <OcrImportClient defaultSku={data.nextSku} />}
    </>
  );
}
