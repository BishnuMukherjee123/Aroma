import type { Request, Response } from "express";

import { requireAuthContext } from "../../lib/request.js";
import {
  requireCurrencyCode,
  optionalBoolean,
  optionalInteger,
  optionalDietaryType,
  optionalCrossSellItems,
  optionalNullableString,
  optionalString,
  requireInteger,
  requireString,
} from "../../lib/validation.js";
import {
  createCategory,
  createDishForCategory,
  deleteCategory,
  updateCategory,
} from "./service.js";

export const createForMenu = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const auth = requireAuthContext(req);
  const payload = await createCategory(
    auth.userId,
    requireString(req.params.id, "id", 1),
    {
      name: requireString(req.body.name, "name", 1),
      isPublished: optionalBoolean(req.body.isPublished, "isPublished"),
      sortOrder: optionalInteger(req.body.sortOrder, "sortOrder", { min: 0 }),
    },
  );

  res.status(201).json(payload);
};

export const createDish = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const auth = requireAuthContext(req);
  const payload = await createDishForCategory(
    auth.userId,
    requireString(req.params.id, "id", 1),
    {
      name: requireString(req.body.name, "name", 1),
      price: requireInteger(req.body.price, "price", { min: 0 }),
      currency: requireCurrencyCode(req.body.currency),
      description: optionalString(req.body.description, "description"),
      badgeLabel: optionalNullableString(req.body.badgeLabel, "badgeLabel"),
      servingSize: optionalInteger(req.body.servingSize, "servingSize", { min: 1 }),
      detailsPanelEnabled: optionalBoolean(req.body.detailsPanelEnabled, "detailsPanelEnabled"),
      crossSellItems: optionalCrossSellItems(req.body.crossSellItems),
      isPublished: optionalBoolean(req.body.isPublished, "isPublished"),
      sortOrder: optionalInteger(req.body.sortOrder, "sortOrder", { min: 0 }),
      dietaryType: optionalDietaryType(req.body.dietaryType),
    },
  );

  res.status(201).json(payload);
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const auth = requireAuthContext(req);
  const payload = await updateCategory(
    auth.userId,
    requireString(req.params.id, "id", 1),
    {
      name: optionalString(req.body.name, "name"),
      isPublished: optionalBoolean(req.body.isPublished, "isPublished"),
      sortOrder: optionalInteger(req.body.sortOrder, "sortOrder", { min: 0 }),
    },
  );

  res.status(200).json(payload);
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  const auth = requireAuthContext(req);
  const payload = await deleteCategory(
    auth.userId,
    requireString(req.params.id, "id", 1),
  );

  res.status(200).json(payload);
};
