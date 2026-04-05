import type { Request, Response } from "express";

import { requireString } from "../../lib/validation.js";
import { getRestaurantPublicPage } from "./service.js";

export const getRestaurant = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const payload = await getRestaurantPublicPage({
    publicId: requireString(req.params.publicId, "publicId", 1),
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.status(200).json(payload);
};
