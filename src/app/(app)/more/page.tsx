import Link from "next/link";
import { FileText, ReceiptText } from "lucide-react";

import { logoutAction } from "@/app/actions/auth";
import { AnalyticsPanel } from "@/components/analytics-panel";
import { DatabaseBanner } from "@/components/database-banner";
import { PageHeader } from "@/components/page-header";
import { SettingsCards } from "@/components/settings-cards";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
        <section className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="grid gap-3 p-4">
              <ReceiptText className="size-5 text-primary" />
              <div>
                <h2 className="font-semibold">Sales Log</h2>
                <p className="text-sm text-muted-foreground">Add daily sales and review day-wise records.</p>
              </div>
              <Button asChild>
                <Link href="/sales">Open Sales</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="grid gap-3 p-4">
              <FileText className="size-5 text-primary" />
              <div>
                <h2 className="font-semibold">Bill Generator</h2>
                <p className="text-sm text-muted-foreground">Create a customer bill and export it as PDF.</p>
              </div>
              <Button asChild variant="outline">
                <Link href="/bill">Open Bill</Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-3">
          <h2 className="text-base font-semibold">Analytics</h2>
          <AnalyticsPanel products={dataset.products} displaySettings={dataset.displaySettings} />
        </section>

        <section className="grid gap-3">
          <h2 className="text-base font-semibold">Settings</h2>
          <SettingsCards />
        </section>
      </div>
    </>
  );
}
