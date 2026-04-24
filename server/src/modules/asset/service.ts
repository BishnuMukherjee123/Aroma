import { prisma } from "../../db/prisma.js";
import { badRequest, ensureFoundValue } from "../../lib/errors.js";
import { slugifyFileName } from "../../lib/ids.js";
import {
  buildAssetUrl,
  rebuildPublicRestaurantSnapshot,
} from "../../lib/public-menu.js";
import { schedulePosterGeneration } from "../../lib/poster-service.js";
import {
  createSignedUpload,
  ensureStorageBucket,
  getStoragePublicUrl,
} from "../../lib/supabase-storage.js";
import { config } from "../../utils/conf.js";
import { ensureRestaurantRole } from "../restaurant/access.js";

export const ASSET_KINDS = ["MODEL_3D", "THUMBNAIL", "POSTER"] as const;
export const ASSET_MIME_TYPES = [
  "model/gltf-binary",
  "model/gltf+json",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

type AssetKind = (typeof ASSET_KINDS)[number];

type CreateUploadInput = {
  dishId: string;
  kind: AssetKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

const modelMimeTypes = new Set<string>([
  "model/gltf-binary",
  "model/gltf+json",
]);

const imageMimeTypes = new Set<string>(["image/jpeg", "image/png", "image/webp"]);

const validateAssetKindMimeType = (kind: AssetKind, mimeType: string): void => {
  if (kind === "MODEL_3D" && !modelMimeTypes.has(mimeType)) {
    badRequest("MODEL_3D assets must use .glb or .gltf mime types");
  }

  if (kind !== "MODEL_3D" && !imageMimeTypes.has(mimeType)) {
    badRequest("Thumbnail and poster assets must use image mime types");
  }
};

export const createAssetUpload = async (
  actorUserId: string,
  input: CreateUploadInput,
) => {
  validateAssetKindMimeType(input.kind, input.mimeType);

  const dish = await prisma.dish.findUnique({
    where: { id: input.dishId },
    select: {
      id: true,
      restaurantId: true,
    },
  });

  const existingDish = ensureFoundValue(dish, "Dish not found");
  await ensureRestaurantRole(actorUserId, existingDish.restaurantId, "EDITOR");
  await ensureStorageBucket();

  const storageKey = `restaurants/${existingDish.restaurantId}/dishes/${existingDish.id}/${Date.now()}-${slugifyFileName(
    input.fileName,
  )}`;

  const upload = await createSignedUpload(storageKey);
  const asset = await prisma.asset.create({
    data: {
      dishId: existingDish.id,
      restaurantId: existingDish.restaurantId,
      kind: input.kind,
      status: "PENDING",
      storageKey,
      url: upload.publicUrl,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    },
    select: {
      id: true,
      kind: true,
      status: true,
      storageKey: true,
      url: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return {
    asset: {
      ...asset,
      publicUrl: buildAssetUrl(asset.storageKey, asset.url),
    },
    upload: {
      method: "PUT",
      bucket: config.SUPABASE_STORAGE_BUCKET,
      signedUrl: upload.signedUrl,
      token: upload.token,
      storageKey,
      publicUrl: upload.publicUrl,
      headers: {
        "Content-Type": input.mimeType,
      },
    },
  };
};

export const completeAssetUpload = async (
  actorUserId: string,
  assetId: string,
) => {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      kind: true,
      dishId: true,
      restaurantId: true,
      storageKey: true,
    },
  });

  const existingAsset = ensureFoundValue(asset, "Asset not found");
  await ensureRestaurantRole(actorUserId, existingAsset.restaurantId, "EDITOR");

  const publicUrl = getStoragePublicUrl(existingAsset.storageKey);
  const updatedAsset = await prisma.asset.update({
    where: { id: assetId },
    data: {
      status: "READY",
      url: publicUrl,
    },
    select: {
      id: true,
      kind: true,
      status: true,
      storageKey: true,
      url: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await rebuildPublicRestaurantSnapshot(existingAsset.restaurantId);

  // ── Auto-generate poster when a 3D model upload is completed ──────────────
  // Fire-and-forget: does NOT block the HTTP response.
  // If poster generation fails, the error is logged but the upload still
  // succeeds. The backfill script can recover any missing posters later.
  if (existingAsset.kind === "MODEL_3D") {
    const dish = await prisma.dish.findUnique({
      where: { id: existingAsset.dishId },
      select: { name: true },
    });

    if (dish) {
      schedulePosterGeneration({
        dishId: existingAsset.dishId,
        restaurantId: existingAsset.restaurantId,
        modelUrl: publicUrl,
        modelStorageKey: existingAsset.storageKey,
        dishName: dish.name,
      });
    }
  }

  return {
    asset: {
      ...updatedAsset,
      publicUrl,
    },
  };
};
