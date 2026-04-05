import type { Request, Response } from "express";

import { requireAuthContext } from "../../lib/request.js";
import {
  optionalBoolean,
  optionalInteger,
  optionalString,
  requireInteger,
  requireString,
} from "../../lib/validation.js";
import { deleteDish, updateDish } from "./service.js";

export const update = async (req: Request, res: Response): Promise<void> => {
  const auth = requireAuthContext(req);
  const payload = await updateDish(
    auth.userId,
    requireString(req.params.id, "id", 1),
    {
      name: optionalString(req.body.name, "name"),
      price:
        req.body.price === undefined
          ? undefined
          : requireInteger(req.body.price, "price", { min: 0 }),
      description: optionalString(req.body.description, "description"),
      isPublished: optionalBoolean(req.body.isPublished, "isPublished"),
      sortOrder: optionalInteger(req.body.sortOrder, "sortOrder", { min: 0 }),
    },
  );

  res.status(200).json(payload);
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  const auth = requireAuthContext(req);
  const payload = await deleteDish(
    auth.userId,
    requireString(req.params.id, "id", 1),
  );

  res.status(200).json(payload);
};
