import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  icon: Icon,
  tone = "blue",
  caption,
  compact = false
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  tone?: "blue" | "orange" | "green" | "red" | "neutral";
  caption?: string;
  compact?: boolean;
}) {
  const toneClasses = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    orange: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    red: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
    neutral: "bg-muted text-muted-foreground"
  };

  return (
    <Card>
      <CardHeader
        className={cn(
          "flex flex-row items-start justify-between space-y-0 p-3 pb-2 sm:p-4 sm:pb-2",
          compact && "p-2 pb-1 sm:p-4 sm:pb-2"
        )}
      >
        <CardTitle className={cn("text-xs font-medium text-muted-foreground sm:text-sm", compact && "truncate text-[11px]")}>
          {title}
        </CardTitle>
        <span className={cn("flex size-8 items-center justify-center rounded-md", compact && "hidden sm:flex", toneClasses[tone])}>
          <Icon className="size-4" />
        </span>
      </CardHeader>
      <CardContent className={cn("p-3 pt-0 sm:p-4 sm:pt-0", compact && "p-2 pt-0 sm:p-4 sm:pt-0")}>
        <div className={cn("text-xl font-semibold leading-none sm:text-2xl", compact && "truncate text-lg sm:text-2xl")}>
          {value}
        </div>
        {caption ? <p className="mt-1.5 text-xs text-muted-foreground">{caption}</p> : null}
      </CardContent>
    </Card>
  );
}
