import type { CrossSellItemInput } from "./validation.js";

/** Shared currency code union used by dish creation and updates. */
export type CurrencyCode = "USD" | "INR" | "EUR" | "GBP" | "AED";

/** Shared dietary type union for dish fields. */
export type DietaryType = "VEG" | "NON_VEG" | "BOTH";

/** Input shape used when creating a new dish. */
export type CreateDishInput = {
  name: string;
  price: number;
  currency: CurrencyCode;
  description?: string;
  badgeLabel?: string | null;
  servingSize?: number;
  detailsPanelEnabled?: boolean;
  crossSellItems?: CrossSellItemInput[];
  isPublished?: boolean;
  sortOrder?: number;
  dietaryType?: DietaryType;
};

/**
 * Shared Prisma select clause for dish fields.
 * Import this wherever a full dish payload is needed to avoid duplication.
 */
export const dishFieldsSelect = {
  id: true,
  name: true,
  price: true,
  currency: true,
  description: true,
  badgeLabel: true,
  servingSize: true,
  detailsPanelEnabled: true,
  crossSellItems: true,
  restaurantId: true,
  menuId: true,
  isPublished: true,
  sortOrder: true,
  dietaryType: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Dish select clause that also includes asset metadata.
 * Used by getRestaurant to return the full admin dish+asset view.
 */
export const dishFieldsWithAssetsSelect = {
  id: true,
  name: true,
  price: true,
  currency: true,
  description: true,
  badgeLabel: true,
  servingSize: true,
  detailsPanelEnabled: true,
  crossSellItems: true,
  isPublished: true,
  sortOrder: true,
  dietaryType: true,
  assets: {
    orderBy: [{ createdAt: "asc" as const }],
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
  },
};

/**
 * Build a partial update object from an input record, only including keys
 * whose values are not `undefined`. This eliminates the repeated
 * `...(input.x !== undefined ? { x: input.x } : {})` spread pattern.
 */
export function buildPartialUpdate<T extends Record<string, unknown>>(
  input: T,
): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(input) as (keyof T)[]) {
    if (input[key] !== undefined) {
      result[key as string] = input[key];
    }
  }
  return result as Partial<T>;
}
