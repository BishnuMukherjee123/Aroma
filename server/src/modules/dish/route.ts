import { Router } from "express";

import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { createRateLimitMiddleware } from "../../middleware/rate-limit.js";
import * as controller from "./controller.js";

export const createDishRouter = (): Router => {
  const router = Router();
  const adminWriteLimiter = createRateLimitMiddleware({
    key: "dish-admin",
    windowMs: 60 * 1000,
    maxRequests: 120,
  });

  router.patch(
    "/:id",
    asyncHandler(requireAuth),
    adminWriteLimiter,
    asyncHandler(controller.update),
  );
  router.delete(
    "/:id",
    asyncHandler(requireAuth),
    adminWriteLimiter,
    asyncHandler(controller.remove),
  );

  return router;
};
