"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import {
  getLatestCloudSnapshotUpdate,
  ignoreCloudSnapshotUpdate,
  importCloudSnapshotUpdate,
  initializeLocalDb,
  queueLocalBackup,
  syncLocalSnapshotToServer
} from "@/lib/local-db";
import { formatDateTime } from "@/lib/utils";

export function LocalSyncAgent() {
  const pathname = usePathname();
  const promptOpenRef = useRef(false);

  useEffect(() => {
    if (pathname === "/pin") {
      return;
    }

    let active = true;

    const promptForCloudUpdate = async () => {
      if (promptOpenRef.current) {
        return;
      }

      promptOpenRef.current = true;

      try {
        const update = await getLatestCloudSnapshotUpdate();

        if (!active || !update) {
          return;
        }

        const updatedLabel = formatDateTime(update.updatedAt ?? update.exportedAt);
        const shouldSync = window.confirm(
          `Cloud data was updated on another device at ${updatedLabel}.\n\nWould you like to sync that data to this browser now?`
        );

        if (!active) {
          return;
        }

        if (shouldSync) {
          await importCloudSnapshotUpdate(update);
          toast.success("Synced latest cloud data.");
          return;
        }

        await ignoreCloudSnapshotUpdate(update);
      } finally {
        promptOpenRef.current = false;
      }
    };

    void initializeLocalDb().then(async () => {
      if (!active) {
        return;
      }

      await promptForCloudUpdate();

      if (active) {
        queueLocalBackup("app-open", 6000);
      }
    });

    const backupInterval = window.setInterval(() => {
      void syncLocalSnapshotToServer("interval");
    }, 1000 * 60 * 15);

    const cloudCheckInterval = window.setInterval(() => {
      void promptForCloudUpdate();
    }, 1000 * 60);

    const visibilityChange = () => {
      if (document.visibilityState === "visible") {
        void promptForCloudUpdate();
      }
    };

    const beforeUnload = () => {
      queueLocalBackup("leaving", 0);
    };

    document.addEventListener("visibilitychange", visibilityChange);
    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      active = false;
      window.clearInterval(backupInterval);
      window.clearInterval(cloudCheckInterval);
      document.removeEventListener("visibilitychange", visibilityChange);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [pathname]);

  return null;
}
