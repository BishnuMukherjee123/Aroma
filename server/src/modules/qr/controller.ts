import type { Request, Response } from "express";

import { requireAuthContext } from "../../lib/request.js";
import { requireString } from "../../lib/validation.js";
import { generateRestaurantQr } from "./service.js";

export const create = async (req: Request, res: Response): Promise<void> => {
  const auth = requireAuthContext(req);
  const payload = await generateRestaurantQr(
    auth.userId,
    requireString(req.params.id, "id", 1),
  );

  res.status(200).json(payload);
};
