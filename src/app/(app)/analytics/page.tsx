import { DashboardCharts } from "@/components/dashboard-charts";
import { DatabaseBanner } from "@/components/database-banner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInventoryDataset } from "@/lib/inventory-data";
import { formatCurrency } from "@/lib/utils";

export default async function AnalyticsPage() {
  const dataset = await getInventoryDataset();
  const categoryRows = Object.values(
    dataset.products.reduce<Record<string, { category: string; quantity: number; value: number; profit: number }>>(
      (acc, product) => {
        const category = product.category ?? "Uncategorized";
        acc[category] ??= {
          category,
          quantity: 0,
          value: 0,
          profit: 0
        };
        acc[category].quantity += product.quantity;
        acc[category].value += product.costPrice * product.quantity;
        acc[category].profit += (product.sellingPrice - product.costPrice) * product.quantity;

        return acc;
      },
      {}
    )
  ).sort((a, b) => b.value - a.value);

  return (
    <>
      <PageHeader title="Analytics" description="Category, brand, margin, and low-stock views for inventory decisions." />
      <DatabaseBanner ready={dataset.databaseReady} error={dataset.error} />
      <DashboardCharts products={dataset.products} />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Category Valuation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-3 pr-4 font-medium">Category</th>
                  <th className="py-3 pr-4 font-medium">Quantity</th>
                  <th className="py-3 pr-4 font-medium">Inventory Value</th>
                  <th className="py-3 pr-4 font-medium">Expected Profit</th>
                </tr>
              </thead>
              <tbody>
                {categoryRows.map((row) => (
                  <tr key={row.category} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">{row.category}</td>
                    <td className="py-3 pr-4">{row.quantity}</td>
                    <td className="py-3 pr-4">{formatCurrency(row.value)}</td>
                    <td className="py-3 pr-4">{formatCurrency(row.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
