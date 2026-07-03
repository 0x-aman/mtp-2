import { Drill } from "lucide-react";

import { PinForm } from "@/app/pin/pin-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PinPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Drill className="size-7" />
          </span>
          <div>
            <p className="text-sm font-bold">MAHALAXMI POWER TOOLS</p>
            <p className="text-xs text-muted-foreground">Inventory Management</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Owner Access</CardTitle>
          </CardHeader>
          <CardContent>
            <PinForm next={params.next ?? "/"} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
