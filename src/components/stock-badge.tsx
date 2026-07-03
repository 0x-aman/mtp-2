import { Badge } from "@/components/ui/badge";
import { getStockStatus } from "@/lib/utils";

export function StockBadge({ quantity, reorderLevel }: { quantity: number; reorderLevel: number }) {
  const status = getStockStatus(quantity, reorderLevel);

  if (status === "critical") {
    return <Badge variant="danger">Critical</Badge>;
  }

  if (status === "low") {
    return <Badge variant="warning">Low Stock</Badge>;
  }

  return <Badge variant="success">Healthy</Badge>;
}
