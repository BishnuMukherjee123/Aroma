import type { Request, Response } from "express";

import { requireAuthContext } from "../../lib/request.js";
import {
  requireEnumValue,
  requireInteger,
  requireString,
} from "../../lib/validation.js";
import {
  ASSET_KINDS,
  ASSET_MIME_TYPES,
  completeAssetUpload,
  createAssetUpload,
} from "./service.js";

export const createUploadUrl = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const auth = requireAuthContext(req);
  const payload = await createAssetUpload(auth.userId, {
    dishId: requireString(req.body.dishId, "dishId", 1),
    kind: requireEnumValue(req.body.kind, "kind", ASSET_KINDS),
    fileName: requireString(req.body.fileName, "fileName", 1),
    mimeType: requireEnumValue(req.body.mimeType, "mimeType", ASSET_MIME_TYPES),
    sizeBytes: requireInteger(req.body.sizeBytes, "sizeBytes", { min: 1 }),
  });

  res.status(201).json(payload);
};

export const completeUpload = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const auth = requireAuthContext(req);
  const payload = await completeAssetUpload(
    auth.userId,
    requireString(req.params.id, "id", 1),
  );

  res.status(200).json(payload);
};
