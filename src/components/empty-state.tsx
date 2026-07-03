import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
