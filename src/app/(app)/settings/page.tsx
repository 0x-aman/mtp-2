import { CheckCircle2, KeyRound, LockKeyhole, ShieldCheck, XCircle } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function EnvStatus({ label, configured }: { label: string; configured: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        {configured ? <CheckCircle2 className="size-4 text-emerald-600" /> : <XCircle className="size-4 text-red-600" />}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Badge variant={configured ? "success" : "danger"}>{configured ? "Configured" : "Missing"}</Badge>
    </div>
  );
}

function isConfigured(value?: string) {
  return Boolean(value && !value.includes("replace"));
}

export default function SettingsPage() {
  const sessionSeconds = Number(process.env.SESSION_MAX_AGE_SECONDS ?? 1800);

  return (
    <>
      <PageHeader title="Settings" description="Single-owner security and environment readiness." />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LockKeyhole className="size-5" />
              PIN Protection
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <EnvStatus label="APP_PIN" configured={isConfigured(process.env.APP_PIN)} />
            <EnvStatus label="SESSION_SECRET" configured={isConfigured(process.env.SESSION_SECRET)} />
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              <p className="font-medium">Session inactivity timeout</p>
              <p className="mt-1 text-muted-foreground">{Math.round(sessionSeconds / 60)} minutes</p>
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
          <CardContent className="grid gap-4">
            <EnvStatus label="DATABASE_URL" configured={isConfigured(process.env.DATABASE_URL)} />
            <EnvStatus label="OPENAI_API_KEY" configured={isConfigured(process.env.OPENAI_API_KEY)} />
            <EnvStatus label="OPENAI_VISION_MODEL" configured={isConfigured(process.env.OPENAI_VISION_MODEL)} />
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
            <div className="rounded-lg border p-3">No registration</div>
            <div className="rounded-lg border p-3">No user roles</div>
            <div className="rounded-lg border p-3">No multi-warehouse logic</div>
            <div className="rounded-lg border p-3">Inventory only</div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
