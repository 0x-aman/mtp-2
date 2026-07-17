import Link from "next/link";
import { Boxes, Camera, FileUp, PackagePlus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const actions = [
  {
    href: "/products/new",
    title: "New Product",
    description: "Add stock items with pricing and quantity.",
    icon: PackagePlus
  },
  {
    href: "/machines/new",
    title: "New Machine",
    description: "Add rentable machines with deposit and daily rent.",
    icon: Boxes
  },
  {
    href: "/import/csv",
    title: "CSV Import",
    description: "Upload bulk inventory rows from a spreadsheet export.",
    icon: FileUp
  },
  {
    href: "/import/ocr",
    title: "AI Image Import",
    description: "Extract item details from a product image or invoice.",
    icon: Camera
  }
];

export default function AddPage() {
  return (
    <>
      <PageHeader title="Add / Import" description="Create products, create rental machines, or import inventory." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Card key={action.href}>
              <CardContent className="grid h-full gap-3 p-4">
                <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold">{action.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
                </div>
                <Button asChild className="mt-auto w-full">
                  <Link href={action.href}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
