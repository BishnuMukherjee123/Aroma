import { prisma } from "../../db/prisma.js";
import { hashPassword } from "../../lib/auth.js";
import { conflict, ensureFoundValue } from "../../lib/errors.js";
import { rebuildPublicRestaurantSnapshot } from "../../lib/public-menu.js";
import { ensureRestaurantRole } from "../restaurant/access.js";

export const RESTAURANT_MEMBER_ROLES = ["OWNER", "ADMIN", "EDITOR"] as const;

const managerMembershipSelect = {
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
} as const;

export const addRestaurantMember = async (
  actorUserId: string,
  restaurantId: string,
  input: {
    email: string;
    role: (typeof RESTAURANT_MEMBER_ROLES)[number];
  },
) => {
  await ensureRestaurantRole(actorUserId, restaurantId, "OWNER");

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      ownerId: true,
    },
  });

  const existingRestaurant = ensureFoundValue(restaurant, "Restaurant not found");

  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      email: true,
    },
  });

  const existingUser = ensureFoundValue(user, "User not found");

  if (existingUser.id === existingRestaurant.ownerId && input.role !== "OWNER") {
    conflict(
      "The company owner for this restaurant must keep OWNER access.",
    );
  }

  if (existingUser.id !== existingRestaurant.ownerId && input.role === "OWNER") {
    conflict(
      "Only the company owner can hold OWNER access for this restaurant.",
    );
  }

  if (input.role === "ADMIN") {
    const assignedManagerRestaurant = await prisma.restaurantMember.findFirst({
      where: {
        userId: existingUser.id,
        role: "ADMIN",
        NOT: {
          restaurantId,
        },
      },
      select: {
        restaurant: {
          select: {
            name: true,
          },
        },
      },
    });

    if (assignedManagerRestaurant) {
      conflict(
        `This manager is already assigned to ${assignedManagerRestaurant.restaurant.name}. Managers can only manage one restaurant.`,
      );
    }
  }

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

export const createRestaurantManagerAccount = async (
  actorUserId: string,
  restaurantId: string,
  input: {
    email: string;
    password: string;
  },
) => {
  await ensureRestaurantRole(actorUserId, restaurantId, "OWNER");

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      ownerId: true,
      owner: {
        select: {
          email: true,
        },
      },
    },
  });

  const existingRestaurant = ensureFoundValue(restaurant, "Restaurant not found");

  if (input.email === existingRestaurant.owner.email) {
    conflict(
      "The company owner account cannot also be used as the restaurant manager.",
    );
  }

  const passwordHash = await hashPassword(input.password);

  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      email: true,
      restaurantsOwned: {
        select: {
          id: true,
        },
      },
    },
  });

  if (
    existingUser &&
    (existingUser.id === existingRestaurant.ownerId ||
      existingUser.restaurantsOwned.length > 0)
  ) {
    conflict(
      "A company owner account cannot be assigned as a restaurant manager.",
    );
  }

  if (existingUser) {
    const membershipElsewhere = await prisma.restaurantMember.findFirst({
      where: {
        userId: existingUser.id,
        NOT: {
          restaurantId,
        },
      },
      select: {
        role: true,
        restaurant: {
          select: {
            name: true,
          },
        },
      },
    });

    if (membershipElsewhere) {
      conflict(
        `This account already belongs to ${membershipElsewhere.restaurant.name}. A restaurant manager can only be assigned to one restaurant.`,
      );
    }
  }

  const payload = await prisma.$transaction(async (tx) => {
    const managerUser = await tx.user.upsert({
      where: {
        email: input.email,
      },
      update: {
        passwordHash,
      },
      create: {
        email: input.email,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
      },
    });

    await tx.restaurantMember.deleteMany({
      where: {
        restaurantId,
        role: "ADMIN",
        NOT: {
          userId: managerUser.id,
        },
      },
    });

    const membership = await tx.restaurantMember.upsert({
      where: {
        userId_restaurantId: {
          userId: managerUser.id,
          restaurantId,
        },
      },
      update: {
        role: "ADMIN",
      },
      create: {
        userId: managerUser.id,
        restaurantId,
        role: "ADMIN",
      },
      select: managerMembershipSelect,
    });

    return {
      membership,
      createdUser: !existingUser,
    };
  }, {
    maxWait: 15_000,
    timeout: 15_000,
  });

  await rebuildPublicRestaurantSnapshot(restaurantId);

  return payload;
};
