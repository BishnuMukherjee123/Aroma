import type { Request, Response } from "express";

import { requireAuthContext } from "../../lib/request.js";
import {
  requireEmail,
  requireEnumValue,
  requirePassword,
  requireString,
} from "../../lib/validation.js";
import {
  addRestaurantMember,
  createRestaurantManagerAccount,
  RESTAURANT_MEMBER_ROLES,
} from "./service.js";

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

export const createManagerAccount = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const auth = requireAuthContext(req);
  const payload = await createRestaurantManagerAccount(
    auth.userId,
    requireString(req.params.id, "id", 1),
    {
      email: requireEmail(req.body.email),
      password: requirePassword(req.body.password),
    },
  );

  res.status(201).json(payload);
};
