import { logoutAction } from "@/app/actions/auth";
import { AnalyticsPanel } from "@/components/analytics-panel";
import { DatabaseBanner } from "@/components/database-banner";
import { PageHeader } from "@/components/page-header";
import { SettingsCards } from "@/components/settings-cards";
import { Button } from "@/components/ui/button";
import { getInventoryDataset } from "@/lib/inventory-data";

export default async function MorePage() {
  const dataset = await getInventoryDataset();

  return (
    <>
      <PageHeader
        title="Analytics / Settings"
        description="Charts, environment status, and account controls."
        actions={
          <form action={logoutAction}>
            <Button type="submit" variant="outline" className="w-full sm:w-auto">
              Logout
            </Button>
          </form>
        }
      />
      <DatabaseBanner ready={dataset.databaseReady} error={dataset.error} />

      <div className="grid gap-6">
        <section className="grid gap-3">
          <h2 className="text-base font-semibold">Analytics</h2>
          <AnalyticsPanel products={dataset.products} />
        </section>

        <section className="grid gap-3">
          <h2 className="text-base font-semibold">Settings</h2>
          <SettingsCards />
        </section>
      </div>
    </>
  );
}
