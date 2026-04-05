import { PublicRestaurantMenu } from "@/components/public/PublicRestaurantMenu";

type PublicRestaurantPageProps = {
  params: Promise<{
    restaurant_id: string;
  }>;
};

export default async function PublicRestaurantPage({
  params,
}: PublicRestaurantPageProps) {
  const { restaurant_id } = await params;

  return <PublicRestaurantMenu publicId={restaurant_id} />;
}
