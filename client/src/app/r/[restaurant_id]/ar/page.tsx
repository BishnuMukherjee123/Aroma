import { PublicArViewer } from "@/components/public/PublicArViewer";

type PublicArPageProps = {
  params: Promise<{
    restaurant_id: string;
  }>;
  searchParams: Promise<{
    dish?: string | string[];
  }>;
};

export default async function PublicArPage({
  params,
  searchParams,
}: PublicArPageProps) {
  const { restaurant_id } = await params;
  const resolvedSearchParams = await searchParams;
  const initialDishId =
    typeof resolvedSearchParams.dish === "string"
      ? resolvedSearchParams.dish
      : undefined;

  return <PublicArViewer publicId={restaurant_id} initialDishId={initialDishId} />;
}
