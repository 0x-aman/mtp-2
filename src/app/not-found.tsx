import Link from "next/link";
import { PackageX } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <PackageX className="size-7" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">The requested inventory page does not exist.</p>
        <Button asChild className="mt-6">
          <Link href="/">Open Dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
