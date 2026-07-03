import { OcrImportClient } from "@/components/ocr-import-client";
import { PageHeader } from "@/components/page-header";
import { getNextSku } from "@/lib/inventory-data";

export default async function OcrImportPage() {
  const nextSku = await getNextSku();

  return (
    <>
      <PageHeader
        title="AI Image Import"
        description="Extract product fields from a product box, label, or supplier invoice image, then confirm before saving."
      />
      <OcrImportClient defaultSku={nextSku} />
    </>
  );
}
