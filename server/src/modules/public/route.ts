import { Router } from "express";

import { asyncHandler } from "../../lib/async-handler.js";
import * as controller from "./controller.js";

export const createPublicRouter = (): Router => {
  const router = Router();

  router.get("/r/:publicId", asyncHandler(controller.getRestaurant));

  return router;
};
