import { RestaurantWorkspace } from "@/components/workspace/RestaurantWorkspace";

export default async function RestaurantWorkspacePage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;

  return <RestaurantWorkspace restaurantId={restaurantId} />;
}
