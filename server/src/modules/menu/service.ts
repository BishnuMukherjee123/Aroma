import { prisma } from "../../db/prisma.js";
import { badRequest, ensureFoundValue } from "../../lib/errors.js";
import { rebuildPublicRestaurantSnapshot } from "../../lib/public-menu.js";
import { ensureRestaurantRole } from "../restaurant/access.js";

export const createMenu = async (
  actorUserId: string,
  restaurantId: string,
  input: {
    name: string;
    isPublished?: boolean;
    sortOrder?: number;
  },
) => {
  await ensureRestaurantRole(actorUserId, restaurantId, "EDITOR");

  const menu = await prisma.menu.create({
    data: {
      restaurantId,
      name: input.name,
      isPublished: input.isPublished ?? false,
      sortOrder: input.sortOrder ?? 0,
    },
    select: {
      id: true,
      name: true,
      restaurantId: true,
      isPublished: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await rebuildPublicRestaurantSnapshot(restaurantId);
  return menu;
};

export const createDishForMenu = async (
  actorUserId: string,
  menuId: string,
  input: {
    name: string;
    price: number;
    description?: string;
    isPublished?: boolean;
    sortOrder?: number;
  },
) => {
  const menu = await prisma.menu.findUnique({
    where: { id: menuId },
    select: {
      id: true,
      restaurantId: true,
    },
  });

  const existingMenu = ensureFoundValue(menu, "Menu not found");
  await ensureRestaurantRole(actorUserId, existingMenu.restaurantId, "EDITOR");

  const dish = await prisma.dish.create({
    data: {
      menuId: existingMenu.id,
      restaurantId: existingMenu.restaurantId,
      name: input.name,
      price: input.price,
      description: input.description,
      isPublished: input.isPublished ?? false,
      sortOrder: input.sortOrder ?? 0,
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

  await rebuildPublicRestaurantSnapshot(existingMenu.restaurantId);
  return dish;
};

export const updateMenu = async (
  actorUserId: string,
  menuId: string,
  input: {
    name?: string;
    isPublished?: boolean;
    sortOrder?: number;
  },
) => {
  const menu = await prisma.menu.findUnique({
    where: { id: menuId },
    select: {
      id: true,
      restaurantId: true,
    },
  });

  const existingMenu = ensureFoundValue(menu, "Menu not found");
  await ensureRestaurantRole(actorUserId, existingMenu.restaurantId, "EDITOR");

  const updatedMenu = await prisma.menu.update({
    where: { id: menuId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.isPublished !== undefined
        ? { isPublished: input.isPublished }
        : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
    select: {
      id: true,
      name: true,
      restaurantId: true,
      isPublished: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await rebuildPublicRestaurantSnapshot(existingMenu.restaurantId);
  return updatedMenu;
};

export const deleteMenu = async (actorUserId: string, menuId: string) => {
  const menu = await prisma.menu.findUnique({
    where: { id: menuId },
    select: {
      id: true,
      restaurantId: true,
      _count: {
        select: {
          dishes: true,
        },
      },
    },
  });

  const existingMenu = ensureFoundValue(menu, "Menu category not found");
  await ensureRestaurantRole(actorUserId, existingMenu.restaurantId, "EDITOR");

  if (existingMenu._count.dishes > 0) {
    badRequest("Delete or move dishes out of this category before removing it.");
  }

  await prisma.menu.delete({
    where: {
      id: existingMenu.id,
    },
  });

  await rebuildPublicRestaurantSnapshot(existingMenu.restaurantId);

  return {
    id: existingMenu.id,
    deleted: true,
  };
};
