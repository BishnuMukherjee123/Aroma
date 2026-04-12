import { randomBytes } from "node:crypto";

export const normalizePublicId = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

export const createPublicId = (prefix = "r"): string => {
  const safePrefix = normalizePublicId(prefix) || "r";
  return `${safePrefix}-${randomBytes(8).toString("hex")}`;
};

export const slugifyFileName = (fileName: string): string => {
  const trimmed = fileName.trim();
  const lastDotIndex = trimmed.lastIndexOf(".");
  const extension =
    lastDotIndex > 0 ? trimmed.slice(lastDotIndex).toLowerCase() : "";
  const baseName =
    lastDotIndex > 0 ? trimmed.slice(0, lastDotIndex) : trimmed;

  const safeBase = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${safeBase || "file"}${extension}`;
};
