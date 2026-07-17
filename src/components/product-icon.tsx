import Link from "next/link";
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
  href,
  className,
  iconClassName
}: {
  title: string;
  brand?: string | null;
  category?: string | null;
  href?: string;
  className?: string;
  iconClassName?: string;
}) {
  const Icon = chooseIcon([title, brand, category]);
  const classes = cn(
    "flex shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground",
    href && "transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    className ?? "size-12"
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={`Open ${title}`}>
        <Icon className={cn("size-5", iconClassName)} />
      </Link>
    );
  }

  return (
    <span className={classes} aria-hidden="true">
      <Icon className={cn("size-5", iconClassName)} />
    </span>
  );
}
