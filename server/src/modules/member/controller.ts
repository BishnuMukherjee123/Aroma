import type { Request, Response } from "express";

import { requireAuthContext } from "../../lib/request.js";
import {
  requireEmail,
  requireEnumValue,
  requireString,
} from "../../lib/validation.js";
import { addRestaurantMember, RESTAURANT_MEMBER_ROLES } from "./service.js";

export const add = async (req: Request, res: Response): Promise<void> => {
  const auth = requireAuthContext(req);
  const payload = await addRestaurantMember(
    auth.userId,
    requireString(req.params.id, "id", 1),
    {
      email: requireEmail(req.body.email),
      role: requireEnumValue(req.body.role, "role", RESTAURANT_MEMBER_ROLES),
    },
  );

  res.status(201).json(payload);
};
