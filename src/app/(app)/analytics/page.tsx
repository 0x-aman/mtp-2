import { AnalyticsPanel } from "@/components/analytics-panel";
import { DatabaseBanner } from "@/components/database-banner";
import { PageHeader } from "@/components/page-header";
import { getInventoryDataset } from "@/lib/inventory-data";

export default async function AnalyticsPage() {
  const dataset = await getInventoryDataset();

  return (
    <>
      <PageHeader title="Analytics" description="Category, brand, margin, and low-stock views for inventory decisions." />
      <DatabaseBanner ready={dataset.databaseReady} error={dataset.error} />
      <AnalyticsPanel products={dataset.products} />
    </>
  );
}
