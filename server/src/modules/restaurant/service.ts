import { prisma } from "../../db/prisma.js";
import { conflict, ensureFoundValue } from "../../lib/errors.js";
import { dishFieldsWithAssetsSelect } from "../../lib/dish-select.js";
import { createPublicId } from "../../lib/ids.js";
import {
  rebuildPublicRestaurantSnapshot,
  invalidatePublicRestaurantSnapshot,
} from "../../lib/public-menu.js";
import { ensureRestaurantRole } from "./access.js";

const RESTAURANT_NOT_FOUND = "Restaurant not found";

export const createRestaurant = async (
  actorUserId: string,
  input: { name: string },
) => {
  const restaurant = await prisma.$transaction(async (tx) => {
    const createdRestaurant = await tx.restaurant.create({
      data: {
        name: input.name,
        publicId: createPublicId("rest"),
        ownerId: actorUserId,
      },
      select: {
        id: true,
        name: true,
        publicId: true,
        ownerId: true,
        address: true,
        isActive: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await tx.restaurantMember.create({
      data: {
        userId: actorUserId,
        restaurantId: createdRestaurant.id,
        role: "OWNER",
      },
    });

    return createdRestaurant;
  });

  await rebuildPublicRestaurantSnapshot(restaurant.id);
  return restaurant;
};

export const getRestaurant = async (actorUserId: string, restaurantId: string) => {
  await ensureRestaurantRole(actorUserId, restaurantId, "MANAGER");

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      publicId: true,
      ownerId: true,
      address: true,
      isActive: true,
      isPublished: true,
      publicMenuSnapshotUpdatedAt: true,
      createdAt: true,
      updatedAt: true,
      members: {
        select: {
          id: true,
          role: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              mobile: true,
              profilePicUrl: true,
            },
          },
        },
      },
      menus: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          isPublished: true,
          sortOrder: true,
          categories: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              name: true,
              mainMenuId: true,
              isPublished: true,
              sortOrder: true,
              dishes: {
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                select: dishFieldsWithAssetsSelect,
              },
            },
          },
        },
      },
    },
  });

  return ensureFoundValue(restaurant, RESTAURANT_NOT_FOUND);
};

export const updateRestaurant = async (
  actorUserId: string,
  restaurantId: string,
  input: {
    name?: string;
    publicId?: string;
    address?: string;
    isActive?: boolean;
    isPublished?: boolean;
  },
) => {
  await ensureRestaurantRole(actorUserId, restaurantId, "OWNER");

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      publicId: true,
    },
  });

  const existingRestaurant = ensureFoundValue(restaurant, RESTAURANT_NOT_FOUND);

  if (
    input.publicId !== undefined &&
    input.publicId !== existingRestaurant.publicId
  ) {
    const publicIdOwner = await prisma.restaurant.findUnique({
      where: { publicId: input.publicId },
      select: { id: true },
    });

    if (publicIdOwner && publicIdOwner.id !== restaurantId) {
      conflict("That public slug is already in use.");
    }
  }

  const updatedRestaurant = await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.publicId !== undefined ? { publicId: input.publicId } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.isPublished !== undefined
        ? { isPublished: input.isPublished }
        : {}),
    },
    select: {
      id: true,
      name: true,
      publicId: true,
      ownerId: true,
      address: true,
      isActive: true,
      isPublished: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (updatedRestaurant.publicId !== existingRestaurant.publicId) {
    invalidatePublicRestaurantSnapshot(existingRestaurant.publicId);
  }

  await rebuildPublicRestaurantSnapshot(restaurantId);
  return updatedRestaurant;
};

export const deleteRestaurant = async (
  actorUserId: string,
  restaurantId: string,
) => {
  await ensureRestaurantRole(actorUserId, restaurantId, "OWNER");

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      publicId: true,
      members: {
        where: {
          role: "ADMIN",
        },
        select: {
          userId: true,
        },
      },
    },
  });

  const existingRestaurant = ensureFoundValue(restaurant, RESTAURANT_NOT_FOUND);
  const managerUserIds = [...new Set(existingRestaurant.members.map((member) => member.userId))];

  await prisma.$transaction(async (tx) => {
    await tx.asset.deleteMany({
      where: { restaurantId },
    });

    await tx.dish.deleteMany({
      where: { restaurantId },
    });

    await tx.menu.deleteMany({
      where: { restaurantId },
    });

    await tx.mainMenu.deleteMany({
      where: { restaurantId },
    });

    await tx.restaurantMember.deleteMany({
      where: { restaurantId },
    });

    await tx.restaurant.delete({
      where: { id: restaurantId },
    });

    for (const managerUserId of managerUserIds) {
      const remainingMemberships = await tx.restaurantMember.count({
        where: { userId: managerUserId },
      });
      const remainingOwnedRestaurants = await tx.restaurant.count({
        where: { ownerId: managerUserId },
      });

      if (remainingMemberships === 0 && remainingOwnedRestaurants === 0) {
        await tx.user.delete({
          where: { id: managerUserId },
        });
      }
    }
  });

  invalidatePublicRestaurantSnapshot(existingRestaurant.publicId);

  return {
    id: existingRestaurant.id,
    name: existingRestaurant.name,
    deleted: true,
  };
};
