import { notFound } from "next/navigation";

import { PublicRestaurantMenu } from "@/components/public/PublicRestaurantMenu";
import { fetchPublicRestaurantServer } from "@/lib/api";

// Revalidate the cached pre-rendered HTML every 60 seconds (ISR).
// First visitor triggers a fresh backend fetch; all subsequent visitors
// within that window receive the pre-built HTML instantly.
export const revalidate = 60;

type PublicRestaurantPageProps = {
  params: Promise<{
    restaurant_id: string;
  }>;
};

export default async function PublicRestaurantPage({
  params,
}: PublicRestaurantPageProps) {
  const { restaurant_id } = await params;

  try {
    const restaurant = await fetchPublicRestaurantServer(restaurant_id);

    return (
      <PublicRestaurantMenu
        publicId={restaurant_id}
        initialRestaurant={restaurant}
      />
    );
  } catch {
    notFound();
  }
}
