import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
  actionsClassName
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  actionsClassName?: string;
}) {
  return (
    <div className={cn("mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold leading-tight sm:text-2xl">{title}</h1>
        {description ? <p className="mt-0.5 max-w-3xl text-xs text-muted-foreground sm:text-sm">{description}</p> : null}
      </div>
      {actions ? (
        <div
          className={cn(
            "grid w-full gap-2 [grid-template-columns:repeat(auto-fit,minmax(0,1fr))] sm:flex sm:w-auto sm:shrink-0 sm:flex-wrap sm:items-center [&_a]:h-9 [&_button]:h-9",
            actionsClassName
          )}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}
