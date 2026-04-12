import { prisma } from "../../db/prisma.js";
import { badRequest, ensureFoundValue } from "../../lib/errors.js";
import { rebuildPublicRestaurantSnapshot } from "../../lib/public-menu.js";
import { ensureRestaurantRole } from "../restaurant/access.js";

export const createCategory = async (
  actorUserId: string,
  mainMenuId: string,
  input: {
    name: string;
    isPublished?: boolean;
    sortOrder?: number;
  },
) => {
  const mainMenu = await prisma.mainMenu.findUnique({
    where: { id: mainMenuId },
    select: {
      id: true,
      restaurantId: true,
    },
  });

  const existingMainMenu = ensureFoundValue(mainMenu, "Main menu not found");
  await ensureRestaurantRole(actorUserId, existingMainMenu.restaurantId, "EDITOR");

  const category = await prisma.menu.create({
    data: {
      restaurantId: existingMainMenu.restaurantId,
      mainMenuId: existingMainMenu.id,
      name: input.name,
      isPublished: input.isPublished ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
    select: {
      id: true,
      name: true,
      restaurantId: true,
      mainMenuId: true,
      isPublished: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await rebuildPublicRestaurantSnapshot(existingMainMenu.restaurantId);
  return category;
};

export const createDishForCategory = async (
  actorUserId: string,
  categoryId: string,
  input: {
    name: string;
    price: number;
    currency: "USD" | "INR" | "EUR" | "GBP" | "AED";
    description?: string;
    isPublished?: boolean;
    sortOrder?: number;
  },
) => {
  const category = await prisma.menu.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      restaurantId: true,
    },
  });

  const existingCategory = ensureFoundValue(category, "Category not found");
  await ensureRestaurantRole(actorUserId, existingCategory.restaurantId, "EDITOR");

  const dish = await prisma.dish.create({
    data: {
      menuId: existingCategory.id,
      restaurantId: existingCategory.restaurantId,
      name: input.name,
      price: input.price,
      currency: input.currency,
      description: input.description,
      isPublished: input.isPublished ?? false,
      sortOrder: input.sortOrder ?? 0,
    },
    select: {
      id: true,
      name: true,
      price: true,
      currency: true,
      description: true,
      restaurantId: true,
      menuId: true,
      isPublished: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await rebuildPublicRestaurantSnapshot(existingCategory.restaurantId);
  return dish;
};

export const updateCategory = async (
  actorUserId: string,
  categoryId: string,
  input: {
    name?: string;
    isPublished?: boolean;
    sortOrder?: number;
  },
) => {
  const category = await prisma.menu.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      restaurantId: true,
    },
  });

  const existingCategory = ensureFoundValue(category, "Category not found");
  await ensureRestaurantRole(actorUserId, existingCategory.restaurantId, "EDITOR");

  const updatedCategory = await prisma.menu.update({
    where: { id: categoryId },
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
      mainMenuId: true,
      isPublished: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await rebuildPublicRestaurantSnapshot(existingCategory.restaurantId);
  return updatedCategory;
};

export const deleteCategory = async (
  actorUserId: string,
  categoryId: string,
) => {
  const category = await prisma.menu.findUnique({
    where: { id: categoryId },
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

  const existingCategory = ensureFoundValue(category, "Category not found");
  await ensureRestaurantRole(actorUserId, existingCategory.restaurantId, "EDITOR");

  if (existingCategory._count.dishes > 0) {
    badRequest("Delete or move dishes out of this category before removing it.");
  }

  await prisma.menu.delete({
    where: {
      id: existingCategory.id,
    },
  });

  await rebuildPublicRestaurantSnapshot(existingCategory.restaurantId);

  return {
    id: existingCategory.id,
    deleted: true,
  };
};
