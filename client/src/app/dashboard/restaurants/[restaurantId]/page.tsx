import { RestaurantWorkspace } from "@/components/workspace/RestaurantWorkspace";
import "../../../dashboard/dashboard.css";
import "./workspace.css";

export default async function RestaurantWorkspacePage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;

  return <RestaurantWorkspace restaurantId={restaurantId} />;
}
