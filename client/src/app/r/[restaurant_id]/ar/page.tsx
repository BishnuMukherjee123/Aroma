import { PublicArViewer } from "@/components/public/PublicArViewer";

type PublicArPageProps = {
  params: Promise<{
    restaurant_id: string;
  }>;
  searchParams: Promise<{
    dish?: string;
  }>;
};

export default async function PublicArPage({
  params,
  searchParams,
}: PublicArPageProps) {
  const { restaurant_id } = await params;
  const { dish } = await searchParams;

  return <PublicArViewer publicId={restaurant_id} initialDishId={dish} />;
}
