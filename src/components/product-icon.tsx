import { CircleDot, Disc3, Drill, Package, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function chooseIcon(parts: Array<string | null | undefined>): LucideIcon {
  const text = parts.filter(Boolean).join(" ").toLowerCase();

  if (text.includes("bearing")) {
    return CircleDot;
  }

  if (text.includes("grinder")) {
    return Drill;
  }

  if (
    text.includes("blade") ||
    text.includes("wheel") ||
    text.includes("cutting") ||
    text.includes("chipping") ||
    text.includes("disc")
  ) {
    return Disc3;
  }

  return Package;
}

export function ProductIcon({
  title,
  brand,
  category,
  className,
  iconClassName
}: {
  title: string;
  brand?: string | null;
  category?: string | null;
  className?: string;
  iconClassName?: string;
}) {
  const Icon = chooseIcon([title, brand, category]);

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground",
        className ?? "size-12"
      )}
      aria-hidden="true"
    >
      <Icon className={cn("size-5", iconClassName)} />
    </span>
  );
}
