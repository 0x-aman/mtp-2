import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? (
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:flex-wrap sm:items-center">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
