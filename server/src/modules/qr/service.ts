import QRCode from "qrcode";

import { prisma } from "../../db/prisma.js";
import { ensureFoundValue } from "../../lib/errors.js";
import { config } from "../../utils/conf.js";
import { ensureRestaurantRole } from "../restaurant/access.js";

const stripTrailingSlash = (value: string): string => value.replace(/\/$/, "");

export const generateRestaurantQr = async (
  actorUserId: string,
  restaurantId: string,
) => {
  await ensureRestaurantRole(actorUserId, restaurantId, "MANAGER");

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      publicId: true,
    },
  });

  const existingRestaurant = ensureFoundValue(restaurant, "Restaurant not found");
  const publicUrl = `${stripTrailingSlash(config.PUBLIC_BASE_URL)}/r/${existingRestaurant.publicId}`;

  return {
    restaurantId: existingRestaurant.id,
    publicId: existingRestaurant.publicId,
    publicUrl,
    qrCodeDataUrl: await QRCode.toDataURL(publicUrl, {
      margin: 1,
      width: 512,
    }),
    qrCodeSvg: await QRCode.toString(publicUrl, {
      type: "svg",
      margin: 1,
      width: 512,
    }),
  };
};
