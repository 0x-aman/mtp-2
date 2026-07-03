import { ProductForm } from "@/components/product-form";
import { PageHeader } from "@/components/page-header";
import { getNextSku, getProductFormOptions } from "@/lib/inventory-data";

export default async function NewProductPage() {
  const [nextSku, formOptions] = await Promise.all([getNextSku(), getProductFormOptions()]);

  return (
    <>
      <PageHeader title="New Product" description="Add product details, stock, and pricing." />
      <ProductForm defaultSku={nextSku} formOptions={formOptions} />
    </>
  );
}
