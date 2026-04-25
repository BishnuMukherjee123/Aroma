import { prisma } from "../db/prisma.js";
import { ensureFoundValue, notFound } from "./errors.js";
import { ExpiringCache } from "./public-menu-cache.js";
import { config } from "../utils/conf.js";

type PublicAssetMap = {
  modelUrl: string | null;
  lodUrl: string | null;
  thumbnailUrl: string | null;
  posterUrl: string | null;
};

export type PublicDishPayload = {
  id: string;
  name: string;
  price: number;
  currency: "USD" | "INR" | "EUR" | "GBP" | "AED";
  description: string | null;
  sortOrder: number;
  dietaryType: "VEG" | "NON_VEG" | "BOTH" | null;
  modelUrl: string | null;
  /** LOD-0 variant: ~15% polygon count, loads in ~200ms for instant first-tap display. */
  lodUrl: string | null;
  thumbnailUrl: string | null;
  posterUrl: string | null;
};

export type PublicCategoryPayload = {
  id: string;
  name: string;
  sortOrder: number;
  dishes: PublicDishPayload[];
};

export type PublicMenuPayload = {
  id: string;
  name: string;
  sortOrder: number;
  categories: PublicCategoryPayload[];
};

export type PublicRestaurantPayload = {
  id: string;
  publicId: string;
  name: string;
  menus: PublicMenuPayload[];
  generatedAt: string;
};

const publicMenuCache = new ExpiringCache<PublicRestaurantPayload>(
  config.PUBLIC_MENU_CACHE_TTL_SECONDS,
);

const supportedCurrencyCodes = new Set(["USD", "INR", "EUR", "GBP", "AED"]);

export const buildAssetUrl = (storageKey: string, fallbackUrl: string): string => {
  const cdnBase = config.ASSET_CDN_BASE_URL.trim().replace(/\/$/, "");
  if (cdnBase) {
    return `${cdnBase}/${storageKey}`;
  }

  return fallbackUrl;
};

const reduceDishAssets = (
  assets: Array<{ kind: string; storageKey: string; url: string }>,
): PublicAssetMap => {
  let modelUrl: string | null = null;
  let lodUrl: string | null = null;
  let thumbnailUrl: string | null = null;
  let posterUrl: string | null = null;

  for (const asset of assets) {
    const resolvedUrl = buildAssetUrl(asset.storageKey, asset.url);
    if (asset.kind === "MODEL_3D") {
      modelUrl = resolvedUrl;
    } else if (asset.kind === "MODEL_3D_LOD0") {
      lodUrl = resolvedUrl;
    } else if (asset.kind === "THUMBNAIL") {
      thumbnailUrl = resolvedUrl;
    } else if (asset.kind === "POSTER") {
      posterUrl = resolvedUrl;
    }
  }

  return {
    modelUrl,
    lodUrl,
    thumbnailUrl,
    posterUrl,
  };
};

const buildSnapshot = async (
  restaurantId: string,
): Promise<PublicRestaurantPayload> => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      publicId: true,
      isActive: true,
      name: true,
      menus: {
        where: { isPublished: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          sortOrder: true,
          categories: {
            where: { isPublished: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              name: true,
              sortOrder: true,
              dishes: {
                where: { isPublished: true },
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                select: {
                  id: true,
                  name: true,
                  price: true,
                  currency: true,
                  description: true,
                  sortOrder: true,
                  dietaryType: true,
                  assets: {
                    where: { status: "READY" },
                    orderBy: [{ createdAt: "asc" }],
                    select: {
                      kind: true,
                      storageKey: true,
                      url: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const existingRestaurant = ensureFoundValue(restaurant, "Restaurant not found");

  return {
    id: existingRestaurant.id,
    publicId: existingRestaurant.publicId,
    name: existingRestaurant.name,
    generatedAt: new Date().toISOString(),
    menus: existingRestaurant.menus.map((menu) => ({
      id: menu.id,
      name: menu.name,
      sortOrder: menu.sortOrder,
      categories: menu.categories.map((category) => ({
        id: category.id,
        name: category.name,
        sortOrder: category.sortOrder,
        dishes: category.dishes.map((dish) => {
          const assetMap = reduceDishAssets(dish.assets);
          return {
            id: dish.id,
            name: dish.name,
            price: dish.price,
            currency: dish.currency,
            description: dish.description,
            sortOrder: dish.sortOrder,
            dietaryType: (dish.dietaryType as "VEG" | "NON_VEG" | "BOTH" | null) ?? null,
            modelUrl: assetMap.modelUrl,
            lodUrl: assetMap.lodUrl,
            thumbnailUrl: assetMap.thumbnailUrl,
            posterUrl: assetMap.posterUrl,
          };
        }),
      })),
    })),
  };
};

export const rebuildPublicRestaurantSnapshot = async (
  restaurantId: string,
): Promise<PublicRestaurantPayload> => {
  const snapshot = await buildSnapshot(restaurantId);

  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      publicMenuSnapshot: snapshot,
      publicMenuSnapshotUpdatedAt: new Date(),
    },
  });

  publicMenuCache.set(snapshot.publicId, snapshot);
  return snapshot;
};

const isCurrentSnapshotShape = (
  snapshot: unknown,
): snapshot is PublicRestaurantPayload => {
  if (!snapshot || typeof snapshot !== "object") {
    return false;
  }

  const candidate = snapshot as PublicRestaurantPayload;
  if (!Array.isArray(candidate.menus)) {
    return false;
  }

  return candidate.menus.every(
    (menu) =>
      Array.isArray(menu.categories) &&
      menu.categories.every(
        (category) =>
          Array.isArray(category.dishes) &&
          category.dishes.every(
            (dish) =>
              typeof dish?.currency === "string" &&
              supportedCurrencyCodes.has(dish.currency) &&
              "dietaryType" in dish && // invalidate snapshots built before dietaryType was added
              "lodUrl" in dish,        // invalidate snapshots built before lodUrl was added
          ),
      ),
  );
};

export const getPublicRestaurantSnapshot = async (
  publicId: string,
): Promise<PublicRestaurantPayload> => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { publicId },
    select: {
      id: true,
      publicId: true,
      isActive: true,
      isPublished: true,
      publicMenuSnapshot: true,
    },
  });

  const existingRestaurant = ensureFoundValue(restaurant, "Restaurant not found");
  if (!existingRestaurant.isActive || !existingRestaurant.isPublished) {
    invalidatePublicRestaurantSnapshot(publicId);
    notFound("Restaurant not found");
  }

  const cached = publicMenuCache.get(publicId);
  if (cached) {
    return cached;
  }

  const snapshot = isCurrentSnapshotShape(existingRestaurant.publicMenuSnapshot)
    ? existingRestaurant.publicMenuSnapshot
    : await rebuildPublicRestaurantSnapshot(existingRestaurant.id);

  publicMenuCache.set(publicId, snapshot);
  return snapshot;
};

export const invalidatePublicRestaurantSnapshot = (publicId: string): void => {
  publicMenuCache.delete(publicId);
};
