import { notFound } from "next/navigation";

import { PublicRestaurantMenu } from "@/components/public/PublicRestaurantMenu";
import { fetchPublicRestaurantServer } from "@/lib/api";

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
