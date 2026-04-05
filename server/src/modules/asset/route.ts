import { Router } from "express";

import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { createRateLimitMiddleware } from "../../middleware/rate-limit.js";
import * as controller from "./controller.js";

export const createAssetRouter = (): Router => {
  const router = Router();
  const adminWriteLimiter = createRateLimitMiddleware({
    key: "asset-admin",
    windowMs: 60 * 1000,
    maxRequests: 120,
  });

  router.post(
    "/upload-url",
    asyncHandler(requireAuth),
    adminWriteLimiter,
    asyncHandler(controller.createUploadUrl),
  );
  router.post(
    "/:id/complete",
    asyncHandler(requireAuth),
    adminWriteLimiter,
    asyncHandler(controller.completeUpload),
  );

  return router;
};
