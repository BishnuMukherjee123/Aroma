import { prisma } from "../../db/prisma.js";
import { buildPartialUpdate, dishFieldsSelect, type CreateDishInput } from "../../lib/dish-select.js";
import { badRequest, ensureFoundValue } from "../../lib/errors.js";
import { rebuildPublicRestaurantSnapshot } from "../../lib/public-menu.js";
import { ensureRestaurantRole } from "../restaurant/access.js";

const CATEGORY_NOT_FOUND = "Category not found";

/** Resolves a category by id and verifies the actor has EDITOR access. */
const requireCategoryEditorAccess = async (
  actorUserId: string,
  categoryId: string,
) => {
  const category = await prisma.menu.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      restaurantId: true,
    },
  });
  const existing = ensureFoundValue(category, CATEGORY_NOT_FOUND);
  await ensureRestaurantRole(actorUserId, existing.restaurantId, "MANAGER");
  return existing;
};

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
  await ensureRestaurantRole(actorUserId, existingMainMenu.restaurantId, "MANAGER");

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
  input: CreateDishInput,
) => {
  const existingCategory = await requireCategoryEditorAccess(actorUserId, categoryId);

  const dish = await prisma.dish.create({
    data: {
      menuId: existingCategory.id,
      restaurantId: existingCategory.restaurantId,
      name: input.name,
      price: input.price,
      currency: input.currency,
      description: input.description,
      badgeLabel: input.badgeLabel,
      servingSize: input.servingSize ?? 2,
      detailsPanelEnabled: input.detailsPanelEnabled ?? true,
      crossSellItems: input.crossSellItems ?? [],
      isPublished: input.isPublished ?? false,
      sortOrder: input.sortOrder ?? 0,
      dietaryType: input.dietaryType,
    },
    select: dishFieldsSelect,
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
  const existingCategory = await requireCategoryEditorAccess(actorUserId, categoryId);

  const updatedCategory = await prisma.menu.update({
    where: { id: categoryId },
    data: buildPartialUpdate(input),
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

  const existingCategory = ensureFoundValue(category, CATEGORY_NOT_FOUND);
  await ensureRestaurantRole(actorUserId, existingCategory.restaurantId, "MANAGER");

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
