import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import { createAssetRouter } from "./modules/asset/route.js";
import { createAuthRouter } from "./modules/auth/route.js";
import { createCategoryRouter } from "./modules/category/route.js";
import { createDishRouter } from "./modules/dish/route.js";
import { createMenuRouter } from "./modules/menu/route.js";
import { createPublicRouter } from "./modules/public/route.js";
import { createRestaurantRouter } from "./modules/restaurant/route.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { config } from "./utils/conf.js";

export const app: Express = express();

app.use(cors());
app.use(express.json({ limit: config.JSON_LIMIT }));
app.use(requestLogger);

app.get("/", (_req: Request, res: Response): void => {
  res.status(200).json({
    service: "Aroma API",
    version: "v1",
    status: "ok",
  });
});

app.get("/health", (_req: Request, res: Response): void => {
  res.status(200).json({
    status: "healthy",
    environment: config.NODE_ENV,
  });
});

app.use("/api/v1/auth", createAuthRouter());
app.use("/api/v1/restaurants", createRestaurantRouter());
app.use("/api/v1/menus", createMenuRouter());
app.use("/api/v1/categories", createCategoryRouter());
app.use("/api/v1/dishes", createDishRouter());
app.use("/api/v1/assets", createAssetRouter());
app.use("/api/v1/public", createPublicRouter());

app.use(errorHandler);

export default app;

