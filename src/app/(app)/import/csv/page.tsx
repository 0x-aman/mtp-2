import { CsvImportClient } from "@/components/csv-import-client";
import { DatabaseBanner } from "@/components/database-banner";
import { PageHeader } from "@/components/page-header";
import { getInventoryDataset } from "@/lib/inventory-data";

export default async function CsvImportPage() {
  const dataset = await getInventoryDataset();

  return (
    <>
      <PageHeader title="CSV Import" description="Upload, validate, preview, edit, and bulk insert product rows." />
      <DatabaseBanner ready={dataset.databaseReady} error={dataset.error} />
      <CsvImportClient />
    </>
  );
}
