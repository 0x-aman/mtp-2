import { AlertTriangle } from "lucide-react";

export function DatabaseBanner({ ready, error }: { ready: boolean; error?: string }) {
  if (ready) {
    return null;
  }

  return (
    <div className="mb-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 sm:mb-4 sm:text-sm dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-medium">Using browser storage for fast local-first data.</p>
        <p className="mt-0.5 break-words text-amber-800 dark:text-amber-300">
          Browser storage is the live database. Set `DATABASE_URL` to Postgres only for cloud snapshots. {error ? `Last database error: ${error}` : null}
        </p>
      </div>
    </div>
  );
}
