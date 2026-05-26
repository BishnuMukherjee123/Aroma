import { notFound, unstable_rethrow } from "next/navigation";

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

  // Use .catch() so that notFound() is never called inside a try-catch block.
  // unstable_rethrow re-throws Next.js internal signals (NEXT_REDIRECT,
  // NEXT_NOT_FOUND, etc.) so they propagate correctly through the framework.
  const restaurant = await fetchPublicRestaurantServer(restaurant_id).catch(
    (error: unknown) => {
      unstable_rethrow(error);
      return null;
    },
  );

  if (!restaurant) {
    notFound();
  }

  return (
    <PublicRestaurantMenu
      publicId={restaurant_id}
      initialRestaurant={restaurant}
    />
  );
}
