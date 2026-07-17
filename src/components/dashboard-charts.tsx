"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DisplaySettings, ProductRecord } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const colors = ["#2563eb", "#f97316", "#10b981", "#ef4444", "#8b5cf6", "#14b8a6"];

function aggregateByCategory(products: ProductRecord[]) {
  const totals = new Map<string, number>();

  for (const product of products) {
    const category = product.category || "Uncategorized";
    totals.set(category, (totals.get(category) ?? 0) + product.quantity);
  }

  return Array.from(totals.entries()).map(([name, value]) => ({ name, value }));
}

function aggregateByBrand(products: ProductRecord[]) {
  const totals = new Map<string, number>();

  for (const product of products) {
    const brand = product.brand || "Unbranded";
    totals.set(brand, (totals.get(brand) ?? 0) + product.costPrice * product.quantity);
  }

  return Array.from(totals.entries())
    .map(([brand, value]) => ({ brand, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function marginOverview(products: ProductRecord[]) {
  return [...products]
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, 10)
    .map((product) => ({
      name: product.sku,
      margin: product.marginPercent
    }));
}

function lowStockTrend(products: ProductRecord[]) {
  const lowStockCount = products.filter((product) => product.quantity <= product.reorderLevel).length;

  return Array.from({ length: 6 }).map((_, index) => ({
    point: `P${index + 1}`,
    lowStock: Math.max(0, lowStockCount + index - 3)
  }));
}

function ChartTooltip({
  active,
  payload,
  label,
  currency
}: {
  active?: boolean;
  payload?: Array<{ value: number; name?: string }>;
  label?: string;
  currency?: boolean;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-md border bg-background p-3 text-sm shadow-md">
      {label ? <p className="font-medium">{label}</p> : null}
      {payload.map((item, index) => (
        <p key={`${item.name}-${index}`} className="text-muted-foreground">
          {item.name}: {currency ? formatCurrency(item.value) : item.value}
        </p>
      ))}
    </div>
  );
}

export function DashboardCharts({
  products,
  displaySettings = {
    showCostPrice: true,
    showMargin: true
  }
}: {
  products: ProductRecord[];
  displaySettings?: DisplaySettings;
}) {
  const distribution = aggregateByCategory(products);
  const brandValue = aggregateByBrand(products);
  const margins = marginOverview(products);
  const trend = lowStockTrend(products);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Inventory Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={2}>
                {distribution.map((entry, index) => (
                  <Cell key={entry.name} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {displaySettings.showCostPrice ? (
        <Card>
        <CardHeader>
          <CardTitle>Inventory Value by Brand</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={brandValue}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="brand" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `Rs ${Number(value) / 1000}k`} />
              <Tooltip content={<ChartTooltip currency />} />
              <Bar dataKey="value" name="Value" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
        </Card>
      ) : null}

      {displaySettings.showMargin ? (
        <Card>
        <CardHeader>
          <CardTitle>Margin Overview</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={margins}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="margin" name="Margin %" stroke="#f97316" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Low Stock Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="lowStockFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="point" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="lowStock" name="Low Stock" stroke="#ef4444" fill="url(#lowStockFill)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
