import { prisma } from "../../db/prisma.js";
import { badRequest, ensureFoundValue } from "../../lib/errors.js";
import { dishFieldsSelect, type CurrencyCode, type DietaryType } from "../../lib/dish-select.js";
import type { CrossSellItemInput } from "../../lib/validation.js";
import { rebuildPublicRestaurantSnapshot } from "../../lib/public-menu.js";
import { removeStorageObjects } from "../../lib/supabase-storage.js";
import { ensureRestaurantRole } from "../restaurant/access.js";

export const updateDish = async (
  actorUserId: string,
  dishId: string,
  input: {
    menuId?: string;
    name?: string;
    price?: number;
    currency?: CurrencyCode;
    description?: string;
    badgeLabel?: string | null;
    servingSize?: number;
    detailsPanelEnabled?: boolean;
    crossSellItems?: CrossSellItemInput[];
    isPublished?: boolean;
    sortOrder?: number;
    dietaryType?: DietaryType | null;
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
  await ensureRestaurantRole(actorUserId, existingDish.restaurantId, "MANAGER");

  if (input.menuId !== undefined && input.menuId !== null) {
    const category = await prisma.menu.findUnique({
      where: { id: input.menuId },
      select: {
        id: true,
        restaurantId: true,
      },
    });

    const existingCategory = ensureFoundValue(category, "Category not found");
    if (existingCategory.restaurantId !== existingDish.restaurantId) {
      badRequest("Category not found");
    }
  }

  const data: Record<string, unknown> = {};
  const keys = [
    "menuId",
    "name",
    "price",
    "currency",
    "description",
    "badgeLabel",
    "servingSize",
    "detailsPanelEnabled",
    "crossSellItems",
    "isPublished",
    "sortOrder",
    "dietaryType",
  ] as const;

  for (const key of keys) {
    // eslint-disable-next-line security/detect-object-injection
    if (input[key] !== undefined) {
      // eslint-disable-next-line security/detect-object-injection
      data[key] = input[key];
    }
  }

  const updatedDish = await prisma.dish.update({
    where: { id: dishId },
    data,
    select: dishFieldsSelect,
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
  await ensureRestaurantRole(actorUserId, existingDish.restaurantId, "MANAGER");

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
