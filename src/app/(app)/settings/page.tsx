import Link from "next/link";
import { FileText } from "lucide-react";

import { logoutAction } from "@/app/actions/auth";
import { LocalSettingsCards } from "@/components/local-settings-cards";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Single-owner security and environment readiness."
        actions={
          <form action={logoutAction}>
            <Button type="submit" variant="outline" className="w-full sm:w-auto">
              Logout
            </Button>
          </form>
        }
      />

      <Card className="mb-4">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex min-w-0 gap-3">
            <FileText className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <h2 className="font-semibold">Bill Generator</h2>
              <p className="text-sm text-muted-foreground">Create a customer bill and export it as PDF.</p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/bill">Open Bill</Link>
          </Button>
        </CardContent>
      </Card>

      <LocalSettingsCards />
    </>
  );
}
