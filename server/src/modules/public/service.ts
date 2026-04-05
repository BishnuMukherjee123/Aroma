import { getPublicRestaurantSnapshot } from "../../lib/public-menu.js";
import { recordPublicRestaurantView } from "../analytics/service.js";

export const getRestaurantPublicPage = async (input: {
  publicId: string;
  ip?: string;
  userAgent?: string;
}) => {
  const snapshot = await getPublicRestaurantSnapshot(input.publicId);
  await recordPublicRestaurantView({
    publicId: input.publicId,
    ip: input.ip,
    userAgent: input.userAgent,
  });

  return snapshot;
};
