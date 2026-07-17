import { BillGenerator } from "@/components/bill-generator";
import { DatabaseBanner } from "@/components/database-banner";
import { PageHeader } from "@/components/page-header";
import { getSalesDataset } from "@/lib/sales-data";
import { shopDetails } from "@/lib/settings";

export default async function BillPage() {
  const dataset = await getSalesDataset();

  return (
    <>
      <PageHeader title="Bill Generator" description="Create a customer-facing bill with custom prices and export as PDF." />
      <DatabaseBanner ready={dataset.databaseReady} error={dataset.error} />
      <BillGenerator products={dataset.products} shop={shopDetails} />
    </>
  );
}
