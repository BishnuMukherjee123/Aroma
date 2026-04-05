import { prisma } from "../../db/prisma.js";
import { ensureFoundValue } from "../../lib/errors.js";
import { rebuildPublicRestaurantSnapshot } from "../../lib/public-menu.js";
import { removeStorageObjects } from "../../lib/supabase-storage.js";
import { ensureRestaurantRole } from "../restaurant/access.js";

export const updateDish = async (
  actorUserId: string,
  dishId: string,
  input: {
    name?: string;
    price?: number;
    description?: string;
    isPublished?: boolean;
    sortOrder?: number;
  },
) => {
  const dish = await prisma.dish.findUnique({
    where: { id: dishId },
    select: {
      id: true,
      restaurantId: true,
    },
  });

  const existingDish = ensureFoundValue(dish, "Dish not found");
  await ensureRestaurantRole(actorUserId, existingDish.restaurantId, "EDITOR");

  const updatedDish = await prisma.dish.update({
    where: { id: dishId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.isPublished !== undefined
        ? { isPublished: input.isPublished }
        : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
    select: {
      id: true,
      name: true,
      price: true,
      description: true,
      restaurantId: true,
      menuId: true,
      isPublished: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await rebuildPublicRestaurantSnapshot(existingDish.restaurantId);
  return updatedDish;
};

export const deleteDish = async (actorUserId: string, dishId: string) => {
  const dish = await prisma.dish.findUnique({
    where: { id: dishId },
    select: {
      id: true,
      restaurantId: true,
      assets: {
        select: {
          storageKey: true,
        },
      },
    },
  });

  const existingDish = ensureFoundValue(dish, "Dish not found");
  await ensureRestaurantRole(actorUserId, existingDish.restaurantId, "EDITOR");

  await prisma.$transaction([
    prisma.asset.deleteMany({
      where: {
        dishId: existingDish.id,
      },
    }),
    prisma.dish.delete({
      where: {
        id: existingDish.id,
      },
    }),
  ]);

  await rebuildPublicRestaurantSnapshot(existingDish.restaurantId);

  void removeStorageObjects(
    existingDish.assets.map((asset) => asset.storageKey),
  ).catch(() => undefined);

  return {
    id: existingDish.id,
    deleted: true,
  };
};
