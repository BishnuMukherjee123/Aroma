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
  uploadRestaurantCoverImage,
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
      address: optionalString(req.body.address, "address"),
      isActive: optionalBoolean(req.body.isActive, "isActive"),
      isPublished: optionalBoolean(req.body.isPublished, "isPublished"),
      managerPortalTheme: optionalString(
        req.body.managerPortalTheme,
        "managerPortalTheme",
      ),
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

export const uploadCoverImage = async (req: Request, res: Response): Promise<void> => {
  const auth = requireAuthContext(req);
  const restaurantId = requireString(req.params.id, "id", 1);
  const imageBase64 = requireString(req.body.imageBase64, "imageBase64", 1);
  const mimeType = requireString(req.body.mimeType, "mimeType", 1);

  const payload = await uploadRestaurantCoverImage(
    auth.userId,
    restaurantId,
    imageBase64,
    mimeType,
  );

  res.status(200).json(payload);
};
