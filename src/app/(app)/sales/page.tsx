import { DatabaseBanner } from "@/components/database-banner";
import { PageHeader } from "@/components/page-header";
import { SalesManager } from "@/components/sales-manager";
import { getSalesDataset } from "@/lib/sales-data";

export default async function SalesPage() {
  const dataset = await getSalesDataset();

  return (
    <>
      <PageHeader title="Sales" description="Log daily sales with custom prices and review day-wise records." />
      <DatabaseBanner ready={dataset.databaseReady} error={dataset.error} />
      <SalesManager
        products={dataset.products}
        sales={dataset.sales}
        metrics={dataset.metrics}
        displaySettings={dataset.displaySettings}
      />
    </>
  );
}
