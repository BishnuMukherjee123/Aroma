import { prisma } from "../../db/prisma.js";
import { badRequest, conflict, ensureFoundValue } from "../../lib/errors.js";
import { buildPartialUpdate } from "../../lib/dish-select.js";
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

  const existingMainMenu = await prisma.mainMenu.findFirst({
    where: { restaurantId },
    select: { id: true, name: true },
  });

  if (existingMainMenu) {
    conflict(
      `This restaurant already has a main menu (${existingMainMenu.name}). Rename the existing main menu instead.`,
    );
  }

  const menu = await prisma.mainMenu.create({
    data: {
      restaurantId,
      name: input.name,
      isPublished: input.isPublished ?? true,
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

export const updateMenu = async (
  actorUserId: string,
  menuId: string,
  input: {
    name?: string;
    isPublished?: boolean;
    sortOrder?: number;
  },
) => {
  const menu = await prisma.mainMenu.findUnique({
    where: { id: menuId },
    select: {
      id: true,
      restaurantId: true,
    },
  });

  const existingMenu = ensureFoundValue(menu, "Main menu not found");
  await ensureRestaurantRole(actorUserId, existingMenu.restaurantId, "EDITOR");

  const updatedMenu = await prisma.mainMenu.update({
    where: { id: menuId },
    data: buildPartialUpdate(input),
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
  const menu = await prisma.mainMenu.findUnique({
    where: { id: menuId },
    select: {
      id: true,
      restaurantId: true,
      _count: {
        select: {
          categories: true,
        },
      },
    },
  });

  const existingMenu = ensureFoundValue(menu, "Main menu not found");
  await ensureRestaurantRole(actorUserId, existingMenu.restaurantId, "EDITOR");

  if (existingMenu._count.categories > 0) {
    badRequest(
      "Delete or move categories out of this main menu before removing it.",
    );
  }

  await prisma.mainMenu.delete({
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
