import { createHmac, randomBytes, scryptSync, timingSafeEqual, createCipheriv, createDecipheriv } from "node:crypto";

import { unauthorized } from "./errors.js";
import { config } from "../utils/conf.js";

type AuthTokenPayload = {
  userId: string;
  email: string;
  exp: number;
};

const toBase64Url = (input: string): string => {
  return Buffer.from(input, "utf8").toString("base64url");
};

const fromBase64Url = (input: string): string => {
  return Buffer.from(input, "base64url").toString("utf8");
};

const sign = (payload: string): string => {
  return createHmac("sha256", config.AUTH_TOKEN_SECRET)
    .update(payload)
    .digest("base64url");
};

const getEncryptionKey = (): Buffer => {
  // Use the first 32 bytes of the AUTH_TOKEN_SECRET
  return Buffer.from(config.AUTH_TOKEN_SECRET, "hex").subarray(0, 32);
};

export const encryptPassword = (password: string): string => {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(password, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
};

export const decryptPassword = (encryptedData: string): string => {
  const [ivHex, encryptedHex] = encryptedData.split(":");
  if (!ivHex || !encryptedHex) {
    throw new Error("Invalid encrypted password format");
  }
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

export const verifyPassword = async (
  password: string,
  hashedPassword: string,
): Promise<boolean> => {
  const [salt, existingHash] = hashedPassword.split(":");
  if (!salt || !existingHash) {
    return false;
  }

  const actualHash = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(
    Buffer.from(existingHash, "hex"),
    Buffer.from(actualHash, "hex"),
  );
};

export const createAuthToken = (input: {
  userId: string;
  email: string;
}): string => {
  const payload: AuthTokenPayload = {
    userId: input.userId,
    email: input.email,
    exp:
      Math.floor(Date.now() / 1000) + config.AUTH_TOKEN_TTL_HOURS * 60 * 60,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
};

export const verifyAuthToken = (token: string): AuthTokenPayload => {
  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) {
    unauthorized("Invalid auth token");
  }

  const expectedSignature = sign(encodedPayload);
  if (
    !timingSafeEqual(
      Buffer.from(providedSignature, "utf8"),
      Buffer.from(expectedSignature, "utf8"),
    )
  ) {
    unauthorized("Invalid auth token signature");
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload)) as AuthTokenPayload;
  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    unauthorized("Auth token expired");
  }

  return payload;
};
