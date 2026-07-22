import { LocalProductDetailPage } from "@/components/local-pages";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <LocalProductDetailPage id={id} />;
}
