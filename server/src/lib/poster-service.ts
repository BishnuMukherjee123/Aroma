/**
 * poster-service.ts
 *
 * Generates a PNG poster for a dish model and saves it as a POSTER asset
 * in the database + Supabase Storage.
 *
 * Called automatically after a MODEL_3D asset is completed (fire-and-forget).
 * Also importable by any future admin action that needs on-demand poster gen.
 */

import { prisma } from "../db/prisma.js";
import { slugifyFileName } from "./ids.js";
import { rebuildPublicRestaurantSnapshot } from "./public-menu.js";
import { renderPosterPng } from "./poster-renderer.js";
import { getStoragePublicUrl } from "./supabase-storage.js";
import { createClient } from "@supabase/supabase-js";
import { config } from "../utils/conf.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Derives a poster filename from the model's storage key.
 * Example: "restaurants/r1/dishes/d1/1700000000-burger.glb"
 *          → "1700000000-burger-poster.png"
 */
const posterFileNameFromModelKey = (modelStorageKey: string): string => {
  const base = modelStorageKey.split("/").pop() ?? "dish-model";
  return `${base.replace(/\.(glb|gltf)$/i, "").trim() || "dish-model"}-poster.png`;
};

/**
 * Uploads raw PNG bytes to Supabase Storage under the same dish directory
 * as the model, then returns the storage key.
 */
const uploadPosterBuffer = async (
  restaurantId: string,
  dishId: string,
  posterBuffer: Buffer,
  posterFileName: string,
): Promise<string> => {
  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const storageKey = `restaurants/${restaurantId}/dishes/${dishId}/${Date.now()}-${slugifyFileName(posterFileName)}`;

  const { error } = await supabase.storage
    .from(config.SUPABASE_STORAGE_BUCKET)
    .upload(storageKey, posterBuffer, {
      contentType: "image/png",
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload poster to storage: ${error.message}`);
  }

  return storageKey;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates a PNG poster for the given model URL and saves it as a POSTER
 * asset record linked to the dish.
 *
 * Idempotent guard: if a READY POSTER asset already exists for the dish,
 * this function returns early without re-rendering.
 */
const generateAndSavePoster = async (opts: {
  dishId: string;
  restaurantId: string;
  modelUrl: string;
  modelStorageKey: string;
  dishName: string;
}): Promise<void> => {
  const { dishId, restaurantId, modelUrl, modelStorageKey, dishName } = opts;

  // ── Idempotency check ──────────────────────────────────────────────────────
  const existingPoster = await prisma.asset.findFirst({
    where: { dishId, kind: "POSTER", status: "READY" },
    select: { id: true },
  });

  if (existingPoster) {
    // Poster already exists — nothing to do.
    return;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const posterBuffer = await renderPosterPng(modelUrl, dishName);

  // ── Upload ─────────────────────────────────────────────────────────────────
  const posterFileName = posterFileNameFromModelKey(modelStorageKey);
  const storageKey = await uploadPosterBuffer(
    restaurantId,
    dishId,
    posterBuffer,
    posterFileName,
  );

  const publicUrl = getStoragePublicUrl(storageKey);

  // ── Persist asset record ───────────────────────────────────────────────────
  await prisma.asset.create({
    data: {
      dishId,
      restaurantId,
      kind: "POSTER",
      status: "READY",
      storageKey,
      url: publicUrl,
      mimeType: "image/png",
      sizeBytes: posterBuffer.byteLength,
    },
  });

  // ── Refresh the public menu snapshot so the poster appears immediately ─────
  await rebuildPublicRestaurantSnapshot(restaurantId);
};

/**
 * Fire-and-forget wrapper: triggers poster generation in the background
 * without blocking the caller. Errors are logged to stderr and swallowed so
 * the MODEL_3D upload flow is never affected by a poster failure.
 */
export const schedulePosterGeneration = (opts: {
  dishId: string;
  restaurantId: string;
  modelUrl: string;
  modelStorageKey: string;
  dishName: string;
}): void => {
  // setImmediate defers execution to after the current I/O event cycle,
  // ensuring the HTTP response is sent before any poster work begins.
  setImmediate(() => {
    generateAndSavePoster(opts).catch((err: unknown) => {
      console.error(
        `[poster-service] Failed to generate poster for dish ${opts.dishId}:`,
        err instanceof Error ? err.message : err,
      );
    });
  });
};
