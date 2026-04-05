import type { Request } from "express";

import { unauthorized } from "./errors.js";

export type AuthContext = {
  userId: string;
  email: string;
  token: string;
};

export const requireAuthContext = (req: Request): AuthContext => {
  if (!req.auth) {
    unauthorized("Authentication required");
  }

  return req.auth as AuthContext;
};
