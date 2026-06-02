import cors from "cors";
import helmet from "helmet";
import express, { type Express, type Request, type Response } from "express";
import { createAssetRouter } from "./modules/asset/route.js";
import { createAuthRouter } from "./modules/auth/route.js";
import { createAuthWebhookRouter } from "./modules/auth/webhook.route.js";
import { createCategoryRouter } from "./modules/category/route.js";
import { createDishRouter } from "./modules/dish/route.js";
import { createMenuRouter } from "./modules/menu/route.js";
import { createPublicRouter } from "./modules/public/route.js";
import { createRestaurantRouter } from "./modules/restaurant/route.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { config } from "./utils/conf.js";
import compression from "compression";
import { prisma } from "./db/prisma.js";

export const app: Express = express();

// Trust the first proxy (Cloudflare / Vercel edge) so req.ip is the real client IP
app.set("trust proxy", 1);

// Security headers
app.use(
  (helmet as any)({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // needed for public assets / 3D models
  }),
);

// CORS — only allow known frontend origins
const allowedOrigins =
  config.NODE_ENV === "production"
    ? [
        "https://aroma-orcin.vercel.app",
        "https://aroma-ar.vercel.app",
        config.PUBLIC_BASE_URL,
      ].filter(Boolean)
    : ["http://localhost:3000", "http://127.0.0.1:3000"];

const corsOriginFn = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error("Not allowed by CORS"));
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const corsMiddleware = (cors as any)({
  origin: corsOriginFn,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});
app.use(corsMiddleware);

app.use(express.json({ limit: "50mb" }));
app.use(compression());
app.use(requestLogger);

app.get("/health", async (_req: Request, res: Response): Promise<void> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      db: "connected",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({ status: "error", db: "disconnected" });
  }
});

app.get("/", (_req: Request, res: Response): void => {
  res.status(200).json({
    service: "Aroma API",
    version: "v1",
    status: "ok",
  });
});

// Health check — no internal details leaked to prevent fingerprinting
app.get("/health", (_req: Request, res: Response): void => {
  res.status(200).json({ status: "healthy" });
});

app.use("/api/v1/auth/webhook", createAuthWebhookRouter());
app.use("/api/v1/auth", createAuthRouter());
app.use("/api/v1/restaurants", createRestaurantRouter());
app.use("/api/v1/menus", createMenuRouter());
app.use("/api/v1/categories", createCategoryRouter());
app.use("/api/v1/dishes", createDishRouter());
app.use("/api/v1/assets", createAssetRouter());
app.use("/api/v1/public", createPublicRouter());

app.use(errorHandler);

export default app;
