import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/product-form";
import { getNextSku, getProductById, getProductFormOptions } from "@/lib/inventory-data";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, nextSku, formOptions] = await Promise.all([getProductById(id), getNextSku(), getProductFormOptions()]);

  if (!product) {
    notFound();
  }

  return (
    <>
      <PageHeader title="Edit Product" description="Update product details, stock, and pricing." />
      <ProductForm product={product} defaultSku={nextSku} formOptions={formOptions} />
    </>
  );
}
