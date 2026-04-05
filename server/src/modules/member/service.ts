import { prisma } from "../../db/prisma.js";
import { ensureFoundValue } from "../../lib/errors.js";
import { rebuildPublicRestaurantSnapshot } from "../../lib/public-menu.js";
import { ensureRestaurantRole } from "../restaurant/access.js";

export const RESTAURANT_MEMBER_ROLES = ["OWNER", "ADMIN", "EDITOR"] as const;

export const addRestaurantMember = async (
  actorUserId: string,
  restaurantId: string,
  input: {
    email: string;
    role: (typeof RESTAURANT_MEMBER_ROLES)[number];
  },
) => {
  await ensureRestaurantRole(actorUserId, restaurantId, "OWNER");

  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      email: true,
    },
  });

  const existingUser = ensureFoundValue(user, "User not found");
  const membership = await prisma.restaurantMember.upsert({
    where: {
      userId_restaurantId: {
        userId: existingUser.id,
        restaurantId,
      },
    },
    update: {
      role: input.role,
    },
    create: {
      userId: existingUser.id,
      restaurantId,
      role: input.role,
    },
    select: {
      id: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  await rebuildPublicRestaurantSnapshot(restaurantId);
  return membership;
};
