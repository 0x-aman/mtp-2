"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { initializeLocalDb, queueLocalBackup, syncLocalSnapshotToServer } from "@/lib/local-db";

export function LocalSyncAgent() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/pin") {
      return;
    }

    let active = true;

    void initializeLocalDb().then(() => {
      if (active) {
        queueLocalBackup("app-open", 6000);
      }
    });

    const interval = window.setInterval(() => {
      void syncLocalSnapshotToServer("interval");
    }, 1000 * 60 * 15);

    const beforeUnload = () => {
      queueLocalBackup("leaving", 0);
    };

    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [pathname]);

  return null;
}
