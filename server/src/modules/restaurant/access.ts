import { prisma } from "../../db/prisma.js";
import { ensureFoundValue, forbidden } from "../../lib/errors.js";

const roleRank = {
  EDITOR: 1,
  ADMIN: 2,
  OWNER: 3,
} as const;

export type RestaurantRole = keyof typeof roleRank;

export const ensureRestaurantRole = async (
  userId: string,
  restaurantId: string,
  minimumRole: RestaurantRole,
) => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      ownerId: true,
      isActive: true,
    },
  });

  const existingRestaurant = ensureFoundValue(restaurant, "Restaurant not found");

  if (existingRestaurant.ownerId === userId) {
    return {
      id: `owner-${restaurantId}`,
      role: "OWNER" as const,
      restaurantId,
      userId,
    };
  }

  if (!existingRestaurant.isActive) {
    forbidden("This kitchen has been deactivated. Contact the owner or admin.");
  }

  const membership = await prisma.restaurantMember.findUnique({
    where: {
      userId_restaurantId: {
        userId,
        restaurantId,
      },
    },
    select: {
      id: true,
      role: true,
      restaurantId: true,
      userId: true,
    },
  });

  const existingMembership = ensureFoundValue(
    membership,
    "You do not have access to this restaurant",
  );

  // eslint-disable-next-line security/detect-object-injection
  if (roleRank[existingMembership.role] < roleRank[minimumRole]) {
    forbidden(`You need ${minimumRole} access to perform this action`);
  }

  return existingMembership;
};
