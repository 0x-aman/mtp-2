"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, CloudDownload, CloudUpload, DatabaseBackup, Download, HardDrive, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LocalBackupStatus, LocalSnapshot } from "@/lib/local-db";
import {
  exportLocalSnapshot,
  getLocalBackupStatus,
  importLocalSnapshot,
  notifyLocalDataChanged,
  syncLocalSnapshotToServer
} from "@/lib/local-db";
import { formatDateTime } from "@/lib/utils";

function downloadSnapshot(snapshot: LocalSnapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `mpt-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function statusVariant(status: LocalBackupStatus | null) {
  if (!status) {
    return "secondary" as const;
  }

  if (status.lastBackupError) {
    return "warning" as const;
  }

  return status.lastBackupAt ? "success" : "secondary";
}

export function LocalBackupPanel() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<LocalBackupStatus | null>(null);
  const [isPending, startTransition] = useTransition();

  const refreshStatus = () => {
    void getLocalBackupStatus().then(setStatus);
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const exportBackup = () => {
    startTransition(async () => {
      downloadSnapshot(await exportLocalSnapshot());
      toast.success("Backup file downloaded.");
    });
  };

  const syncNow = () => {
    startTransition(async () => {
      const ok = await syncLocalSnapshotToServer("manual");
      refreshStatus();

      if (ok) {
        toast.success("Cloud backup saved.");
      } else {
        toast.error("Cloud backup failed. Local data is still safe in this browser.");
      }
    });
  };

  const restoreFile = (file: File) => {
    startTransition(async () => {
      try {
        const snapshot = JSON.parse(await file.text()) as LocalSnapshot;
        await importLocalSnapshot(snapshot);
        refreshStatus();
        toast.success("Backup restored.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Backup restore failed.");
      }
    });
  };

  const restoreCloud = () => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/snapshots/latest", {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error("No cloud backup is available.");
        }

        const body = (await response.json()) as { snapshot?: LocalSnapshot };
        if (!body.snapshot) {
          throw new Error("No cloud backup is available.");
        }

        await importLocalSnapshot(body.snapshot, { preserveDeviceId: true });
        refreshStatus();
        notifyLocalDataChanged();
        toast.success("Latest cloud backup restored.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Cloud restore failed.");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DatabaseBackup className="size-5" />
          Backup and Restore
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <HardDrive className="size-4" />
              Browser Storage
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {status?.persistent ? "Persistent storage approved." : "Using browser storage on this device."}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">Cloud Backup</span>
              <Badge variant={statusVariant(status)}>
                {status?.lastBackupError ? "Needs attention" : status?.lastBackupAt ? "Saved" : "Not yet"}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {status?.lastBackupAt ? formatDateTime(status.lastBackupAt) : "No successful cloud backup yet."}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="size-4" />
              Device ID
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">{status?.deviceId ?? "Loading..."}</p>
          </div>
        </div>

        {status?.lastBackupError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Cloud backup error: {status.lastBackupError}
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Button type="button" onClick={syncNow} disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <CloudUpload />}
            Sync Now
          </Button>
          <Button type="button" variant="outline" onClick={exportBackup} disabled={isPending}>
            <Download />
            Export File
          </Button>
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={isPending}>
            <Upload />
            Restore File
          </Button>
          <Button type="button" variant="outline" onClick={restoreCloud} disabled={isPending}>
            <CloudDownload />
            Restore Cloud
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              restoreFile(file);
            }
            event.currentTarget.value = "";
          }}
        />
      </CardContent>
    </Card>
  );
}
