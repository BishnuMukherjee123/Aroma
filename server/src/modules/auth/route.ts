import { Router } from "express";

import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { createRateLimitMiddleware } from "../../middleware/rate-limit.js";
import * as controller from "./controller.js";

export const createAuthRouter = (): Router => {
  const router = Router();
  const authLimiter = createRateLimitMiddleware({
    key: "auth",
    windowMs: 60 * 1000,
    maxRequests: 60,
  });

  router.post("/register", authLimiter, asyncHandler(controller.register));
  router.post("/login", authLimiter, asyncHandler(controller.login));
  router.get("/me", asyncHandler(requireAuth), asyncHandler(controller.me));

  return router;
};
