import { RestaurantWorkspace } from "@/components/workspace/RestaurantWorkspace";
import "../../../dashboard/dashboard.css";
import "../../../dashboard/restaurants/[restaurantId]/workspace.css";

export default async function ManagerRestaurantWorkspacePage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;

  return (
    <RestaurantWorkspace
      restaurantId={restaurantId}
      portalVariant="manager"
    />
  );
}
