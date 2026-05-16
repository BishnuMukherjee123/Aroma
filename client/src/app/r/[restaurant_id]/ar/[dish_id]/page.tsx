import { notFound } from "next/navigation";

import { EighthWallArViewer } from "@/components/public/EighthWallAr/EighthWallArViewer";
import { fetchPublicRestaurantServer } from "@/lib/api";

type PublicArDishPageProps = {
  params: Promise<{
    restaurant_id: string;
    dish_id: string;
  }>;
};

export default async function PublicArDishPage({
  params,
}: PublicArDishPageProps) {
  const { restaurant_id, dish_id } = await params;

  try {
    const restaurant = await fetchPublicRestaurantServer(restaurant_id);
    const dish = restaurant.menus
      .flatMap((menu) => menu.categories)
      .flatMap((category) => category.dishes)
      .find((item) => item.id === dish_id);

    if (!dish?.modelUrl) {
      notFound();
    }

    return (
      <EighthWallArViewer
        modelUrl={dish.modelUrl}
        alt={dish.name}
        backUrl={`/r/${restaurant_id}`}
      />
    );
  } catch {
    notFound();
  }
}
