import { DashboardCharts } from "@/components/dashboard-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProductRecord } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function categoryRows(products: ProductRecord[]) {
  return Object.values(
    products.reduce<Record<string, { category: string; quantity: number; value: number; profit: number }>>(
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
}

export function AnalyticsPanel({ products }: { products: ProductRecord[] }) {
  const rows = categoryRows(products);

  return (
    <div className="grid gap-4">
      <DashboardCharts products={products} />

      <Card>
        <CardHeader>
          <CardTitle>Category Valuation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2.5 pr-4 font-medium">Category</th>
                  <th className="py-2.5 pr-4 font-medium">Qty</th>
                  <th className="py-2.5 pr-4 font-medium">Value</th>
                  <th className="py-2.5 pr-4 font-medium">Profit</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.category} className="border-b last:border-0">
                    <td className="py-2.5 pr-4 font-medium">{row.category}</td>
                    <td className="py-2.5 pr-4">{row.quantity}</td>
                    <td className="py-2.5 pr-4">{formatCurrency(row.value)}</td>
                    <td className="py-2.5 pr-4">{formatCurrency(row.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
