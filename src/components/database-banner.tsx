import { AlertTriangle } from "lucide-react";

export function DatabaseBanner({ ready, error }: { ready: boolean; error?: string }) {
  if (ready) {
    return null;
  }

  return (
    <div className="mb-5 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-medium">Showing demo data until PostgreSQL is connected.</p>
        <p className="mt-1 break-words text-amber-800 dark:text-amber-300">
          Replace `.env.local` placeholders, run the Prisma migration, then refresh. {error ? `Last database error: ${error}` : null}
        </p>
      </div>
    </div>
  );
}
