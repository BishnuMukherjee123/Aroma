import dotenv from "dotenv";

dotenv.config({ quiet: true });

type StringOption = {
  fallback?: string;
  required?: boolean;
};

const readString = (name: string, options: StringOption = {}): string => {
  const value = process.env[name];
  if (value && value.trim().length > 0) {
    return value.trim();
  }

  if (options.required) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return options.fallback ?? "";
};

const readNumber = (
  name: string,
  fallback: number,
  options: { min?: number } = {},
): number => {
  const raw = process.env[name];
  const value = raw ? Number(raw) : fallback;
  if (!Number.isFinite(value)) {
    throw new Error(`Environment variable ${name} must be a valid number`);
  }

  if (options.min !== undefined && value < options.min) {
    throw new Error(
      `Environment variable ${name} must be at least ${options.min}`,
    );
  }

  return value;
};

export type AppConfig = {
  PORT: number;
  NODE_ENV: string;
  JSON_LIMIT: string;
  DATABASE_URL: string;
  DIRECT_URL: string;
  AUTH_TOKEN_SECRET: string;
  AUTH_TOKEN_TTL_HOURS: number;
  PUBLIC_BASE_URL: string;
  PUBLIC_MENU_CACHE_TTL_SECONDS: number;
  ASSET_CDN_BASE_URL: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_STORAGE_BUCKET: string;
  SUPABASE_STORAGE_FILE_SIZE_LIMIT_BYTES: number;
};

export const config: AppConfig = {
  PORT: readNumber("PORT", 3000, { min: 1 }),
  NODE_ENV: readString("NODE_ENV", { fallback: "development" }),
  JSON_LIMIT: readString("JSON_LIMIT", { fallback: "1mb" }),
  DATABASE_URL: readString("DATABASE_URL", { required: true }),
  DIRECT_URL: readString("DIRECT_URL", { fallback: "" }),
  AUTH_TOKEN_SECRET: (() => {
    const secret = process.env["AUTH_TOKEN_SECRET"]?.trim();
    if (!secret || secret === "change-me") {
      if (process.env["NODE_ENV"] === "production") {
        throw new Error(
          "Missing required environment variable: AUTH_TOKEN_SECRET. " +
          "Generate a strong secret with: openssl rand -hex 64"
        );
      }
      // Development fallback — NOT for production use
      return "dev-only-insecure-secret-do-not-use-in-production";
    }
    return secret;
  })(),
  AUTH_TOKEN_TTL_HOURS: readNumber("AUTH_TOKEN_TTL_HOURS", 24, { min: 1 }),

  PUBLIC_BASE_URL: readString("PUBLIC_BASE_URL", {
    fallback: "http://localhost:3000",
  }),
  PUBLIC_MENU_CACHE_TTL_SECONDS: readNumber(
    "PUBLIC_MENU_CACHE_TTL_SECONDS",
    60,
    { min: 1 },
  ),
  ASSET_CDN_BASE_URL: readString("ASSET_CDN_BASE_URL", { fallback: "" }),
  SUPABASE_URL: readString("SUPABASE_URL", { fallback: "" }),
  SUPABASE_SERVICE_ROLE_KEY: readString("SUPABASE_SERVICE_ROLE_KEY", {
    fallback: "",
  }),
  SUPABASE_STORAGE_BUCKET: readString("SUPABASE_STORAGE_BUCKET", {
    fallback: "restaurant-assets",
  }),
  SUPABASE_STORAGE_FILE_SIZE_LIMIT_BYTES: readNumber(
    "SUPABASE_STORAGE_FILE_SIZE_LIMIT_BYTES",
    31_457_280,
    { min: 1 },
  ),
};
