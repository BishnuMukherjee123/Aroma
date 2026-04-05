import { randomBytes } from "node:crypto";

export const createPublicId = (prefix = "r"): string => {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
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
