"use client";

import { useEffect, useState } from "react";
import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";

import { DisplaySettingsForm } from "@/components/display-settings-form";
import { LocalBackupPanel } from "@/components/local-backup-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLocalDisplaySettings } from "@/lib/local-db";
import type { DisplaySettings } from "@/lib/types";

function EnvStatus({ label, configured }: { label: string; configured: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <span className="truncate text-sm font-medium">{label}</span>
      <Badge variant={configured ? "success" : "secondary"}>{configured ? "Active" : "Optional"}</Badge>
    </div>
  );
}

export function LocalSettingsCards() {
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings | null>(null);

  useEffect(() => {
    void getLocalDisplaySettings().then(setDisplaySettings);
  }, []);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Display Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          {displaySettings ? (
            <DisplaySettingsForm settings={displaySettings} />
          ) : (
            <div className="rounded-lg border p-3 text-sm text-muted-foreground">Loading display preferences...</div>
          )}
        </CardContent>
      </Card>

      <LocalBackupPanel />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockKeyhole className="size-5" />
            PIN Protection
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <EnvStatus label="APP_PIN" configured />
          <EnvStatus label="SESSION_SECRET" configured />
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <p className="font-medium">Local-first data</p>
            <p className="mt-1 text-muted-foreground">Inventory writes are saved in this browser first, then backed up in the background.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5" />
            Integrations
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <EnvStatus label="Postgres backup API" configured />
          <EnvStatus label="OPENAI image extraction" configured={false} />
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" />
            Scope
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border p-3">One primary browser</div>
          <div className="rounded-lg border p-3">Fast local reads</div>
          <div className="rounded-lg border p-3">Cloud snapshots</div>
          <div className="rounded-lg border p-3">Manual restore</div>
        </CardContent>
      </Card>
    </div>
  );
}
