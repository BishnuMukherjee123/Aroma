import { prisma } from "../../db/prisma.js";
import { conflict, ensureFoundValue } from "../../lib/errors.js";
import { createPublicId } from "../../lib/ids.js";
import {
  rebuildPublicRestaurantSnapshot,
  invalidatePublicRestaurantSnapshot,
} from "../../lib/public-menu.js";
import { ensureRestaurantRole } from "./access.js";

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
  await ensureRestaurantRole(actorUserId, restaurantId, "EDITOR");

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      publicId: true,
      ownerId: true,
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
          dishes: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              name: true,
              price: true,
              description: true,
              isPublished: true,
              sortOrder: true,
              assets: {
                orderBy: [{ createdAt: "asc" }],
                select: {
                  id: true,
                  kind: true,
                  status: true,
                  storageKey: true,
                  url: true,
                  mimeType: true,
                  sizeBytes: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return ensureFoundValue(restaurant, "Restaurant not found");
};

export const updateRestaurant = async (
  actorUserId: string,
  restaurantId: string,
  input: {
    name?: string;
    publicId?: string;
    isPublished?: boolean;
  },
) => {
  await ensureRestaurantRole(actorUserId, restaurantId, "ADMIN");

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      publicId: true,
    },
  });

  const existingRestaurant = ensureFoundValue(restaurant, "Restaurant not found");

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
      ...(input.isPublished !== undefined
        ? { isPublished: input.isPublished }
        : {}),
    },
    select: {
      id: true,
      name: true,
      publicId: true,
      ownerId: true,
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
