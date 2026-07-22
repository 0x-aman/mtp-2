import { LocalProductEditPage } from "@/components/local-pages";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <LocalProductEditPage id={id} />;
}
