import type { NextFunction, Request, Response } from "express";

import { prisma } from "../db/prisma.js";
import { ensureFoundValue, unauthorized } from "../lib/errors.js";
import { verifyAuthToken } from "../lib/auth.js";

export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    unauthorized("Missing bearer token");
  }

  const token = authHeader!.slice("Bearer ".length).trim();
  const payload = verifyAuthToken(token);
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
    },
  });

  const existingUser = ensureFoundValue(user, "User not found");

  req.auth = {
    userId: existingUser.id,
    email: existingUser.email,
    token,
  };

  next();
};
