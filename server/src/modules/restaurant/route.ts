import { Router } from "express";

import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { createRateLimitMiddleware } from "../../middleware/rate-limit.js";
import * as memberController from "../member/controller.js";
import * as menuController from "../menu/controller.js";
import * as qrController from "../qr/controller.js";
import * as controller from "./controller.js";

export const createRestaurantRouter = (): Router => {
  const router = Router();
  const adminWriteLimiter = createRateLimitMiddleware({
    key: "restaurant-admin",
    windowMs: 60 * 1000,
    maxRequests: 120,
  });

  router.post(
    "/",
    asyncHandler(requireAuth),
    adminWriteLimiter,
    asyncHandler(controller.create),
  );
  router.get("/:id", asyncHandler(requireAuth), asyncHandler(controller.getById));
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
  router.post(
    "/:id/members",
    asyncHandler(requireAuth),
    adminWriteLimiter,
    asyncHandler(memberController.add),
  );
  router.post(
    "/:id/manager-account",
    asyncHandler(requireAuth),
    adminWriteLimiter,
    asyncHandler(memberController.createManagerAccount),
  );
  router.delete(
    "/:id/manager-account",
    asyncHandler(requireAuth),
    adminWriteLimiter,
    asyncHandler(memberController.deleteManagerAccount),
  );
  router.post(
    "/:id/menus",
    asyncHandler(requireAuth),
    adminWriteLimiter,
    asyncHandler(menuController.createForRestaurant),
  );
  router.post(
    "/:id/qr",
    asyncHandler(requireAuth),
    adminWriteLimiter,
    asyncHandler(qrController.create),
  );

  return router;
};
