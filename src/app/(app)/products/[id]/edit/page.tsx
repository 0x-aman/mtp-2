import { notFound } from "next/navigation";

import { MachineForm } from "@/components/machine-form";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/product-form";
import { getNextMachineSku, getNextSku, getProductById, getProductFormOptions } from "@/lib/inventory-data";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, nextSku, nextMachineSku, formOptions] = await Promise.all([
    getProductById(id),
    getNextSku(),
    getNextMachineSku(),
    getProductFormOptions()
  ]);

  if (!product) {
    notFound();
  }

  if (product.isMachine) {
    return (
      <>
        <PageHeader title="Edit Machine" description="Update machine quantity and rent defaults." />
        <MachineForm machine={product} defaultSku={nextMachineSku} />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Edit Product" description="Update product details, stock, and pricing." />
      <ProductForm product={product} defaultSku={nextSku} formOptions={formOptions} />
    </>
  );
}
