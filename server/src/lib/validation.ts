import { badRequest } from "./errors.js";

import { normalizePublicId } from "./ids.js";

export const requireString = (
  value: unknown,
  fieldName: string,
  minLength = 1,
): string => {
  if (typeof value !== "string") {
    badRequest(`${fieldName} must be a string`);
  }

  const trimmed = (value as string).trim();
  if (trimmed.length < minLength) {
    badRequest(`${fieldName} must be at least ${minLength} characters`);
  }

  return trimmed;
};

export const optionalString = (
  value: unknown,
  fieldName: string,
): string | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return requireString(value, fieldName, 1);
};

export const optionalNullableString = (
  value: unknown,
  fieldName: string,
): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  return requireString(value, fieldName, 1);
};

export const requireInteger = (
  value: unknown,
  fieldName: string,
  options: { min?: number; max?: number } = {},
): number => {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(parsed)) {
    badRequest(`${fieldName} must be an integer`);
  }

  if (options.min !== undefined && parsed < options.min) {
    badRequest(`${fieldName} must be at least ${options.min}`);
  }

  if (options.max !== undefined && parsed > options.max) {
    badRequest(`${fieldName} must be at most ${options.max}`);
  }

  return parsed;
};

export const optionalInteger = (
  value: unknown,
  fieldName: string,
  options: { min?: number; max?: number } = {},
): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return requireInteger(value, fieldName, options);
};

export const optionalBoolean = (
  value: unknown,
  fieldName: string,
): boolean | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "boolean") {
    badRequest(`${fieldName} must be a boolean`);
  }

  return value as boolean;
};

export const requireEmail = (value: unknown, fieldName = "email"): string => {
  const email = requireString(value, fieldName, 3).toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    badRequest(`${fieldName} must be a valid email address`);
  }

  return email;
};

export const requirePassword = (
  value: unknown,
  fieldName = "password",
): string => {
  const password = requireString(value, fieldName, 8);
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    badRequest(
      `${fieldName} must contain at least one uppercase letter, one lowercase letter, and one number`,
    );
  }

  return password;
};

export const requirePublicId = (
  value: unknown,
  fieldName = "publicId",
): string => {
  const publicId = normalizePublicId(requireString(value, fieldName, 3));
  const publicIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  if (publicId.length > 50) {
    badRequest(`${fieldName} must be at most 50 characters`);
  }

  if (!publicIdPattern.test(publicId)) {
    badRequest(
      `${fieldName} must contain only lowercase letters, numbers, and hyphens`,
    );
  }

  return publicId;
};

export const optionalPublicId = (
  value: unknown,
  fieldName = "publicId",
): string | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return requirePublicId(value, fieldName);
};

export const requireEnumValue = <T extends readonly string[]>(
  value: unknown,
  fieldName: string,
  allowedValues: T,
): T[number] => {
  const normalized = requireString(value, fieldName, 1);
  if (!allowedValues.includes(normalized)) {
    badRequest(`${fieldName} must be one of: ${allowedValues.join(", ")}`);
  }

  return normalized as T[number];
};

const currencyCodes = ["USD", "INR", "EUR", "GBP", "AED"] as const;

export const requireCurrencyCode = (
  value: unknown,
  fieldName = "currency",
) => requireEnumValue(value, fieldName, currencyCodes);

export const optionalCurrencyCode = (
  value: unknown,
  fieldName = "currency",
): (typeof currencyCodes)[number] | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return requireCurrencyCode(value, fieldName);
};

const dietaryCodes = ["VEG", "NON_VEG", "BOTH"] as const;

export const optionalDietaryType = (
  value: unknown,
  fieldName = "dietaryType",
): (typeof dietaryCodes)[number] | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return requireEnumValue(value, fieldName, dietaryCodes);
};

export const optionalNullableDietaryType = (
  value: unknown,
  fieldName = "dietaryType",
): (typeof dietaryCodes)[number] | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  return requireEnumValue(value, fieldName, dietaryCodes);
};

export type CrossSellItemInput = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  imageStorageKey: string | null;
};

export const optionalCrossSellItems = (
  value: unknown,
  fieldName = "crossSellItems",
): CrossSellItemInput[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    badRequest(`${fieldName} must be an array`);
  }

  const items = value as unknown[];

  if (items.length > 12) {
    badRequest(`${fieldName} can include at most 12 items`);
  }

  return items.map((item, index) => {
    if (!item || typeof item !== "object") {
      badRequest(`${fieldName}[${index}] must be an object`);
    }

    const candidate = item as Record<string, unknown>;
    const name = requireString(candidate.name, `${fieldName}[${index}].name`, 1);
    const price = requireInteger(candidate.price, `${fieldName}[${index}].price`, { min: 0 });
    const id =
      typeof candidate.id === "string" && candidate.id.trim()
        ? candidate.id.trim()
        : `cross-sell-${index + 1}`;
    const imageUrl =
      typeof candidate.imageUrl === "string" && candidate.imageUrl.trim()
        ? candidate.imageUrl.trim()
        : null;
    const imageStorageKey =
      typeof candidate.imageStorageKey === "string" && candidate.imageStorageKey.trim()
        ? candidate.imageStorageKey.trim()
        : null;

    return {
      id,
      name,
      price,
      imageUrl,
      imageStorageKey,
    };
  });
};
