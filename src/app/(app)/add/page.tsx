import Link from "next/link";
import { FileUp } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/product-form";
import { Button } from "@/components/ui/button";
import { getNextSku, getProductFormOptions } from "@/lib/inventory-data";

export default async function AddPage() {
  const [nextSku, formOptions] = await Promise.all([getNextSku(), getProductFormOptions()]);

  return (
    <>
      <PageHeader
        title="Add Product"
        description="Add product details, stock, and pricing."
        actions={
          <Button asChild variant="outline">
            <Link href="/import/csv">
              <FileUp />
              Import Products
            </Link>
          </Button>
        }
      />
      <ProductForm defaultSku={nextSku} formOptions={formOptions} />
    </>
  );
}
