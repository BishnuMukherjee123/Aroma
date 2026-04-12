import type { Request, Response } from "express";

import { requireAuthContext } from "../../lib/request.js";
import {
  optionalBoolean,
  optionalPublicId,
  optionalString,
  requireString,
} from "../../lib/validation.js";
import {
  createRestaurant,
  deleteRestaurant,
  getRestaurant,
  updateRestaurant,
} from "./service.js";

export const create = async (req: Request, res: Response): Promise<void> => {
  const auth = requireAuthContext(req);
  const payload = await createRestaurant(auth.userId, {
    name: requireString(req.body.name, "name", 1),
  });

  res.status(201).json(payload);
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  const auth = requireAuthContext(req);
  const payload = await getRestaurant(
    auth.userId,
    requireString(req.params.id, "id", 1),
  );

  res.status(200).json(payload);
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const auth = requireAuthContext(req);
  const payload = await updateRestaurant(
    auth.userId,
    requireString(req.params.id, "id", 1),
    {
      name: optionalString(req.body.name, "name"),
      publicId: optionalPublicId(req.body.publicId, "publicId"),
      isActive: optionalBoolean(req.body.isActive, "isActive"),
      isPublished: optionalBoolean(req.body.isPublished, "isPublished"),
    },
  );

  res.status(200).json(payload);
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  const auth = requireAuthContext(req);
  const payload = await deleteRestaurant(
    auth.userId,
    requireString(req.params.id, "id", 1),
  );

  res.status(200).json(payload);
};
