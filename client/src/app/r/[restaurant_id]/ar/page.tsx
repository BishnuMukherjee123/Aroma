import { notFound } from "next/navigation";

import { PublicArViewer } from "@/components/public/PublicArViewer";
import { fetchPublicRestaurantServer } from "@/lib/api";

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

  try {
    const restaurant = await fetchPublicRestaurantServer(restaurant_id);

    return (
      <PublicArViewer
        publicId={restaurant_id}
        initialDishId={initialDishId}
        initialRestaurant={restaurant}
      />
    );
  } catch {
    notFound();
  }
}
