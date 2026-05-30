import type { Request, Response } from "express";

import { requireAuthContext } from "../../lib/request.js";
import {
  requireEmail,
  requireEnumValue,
  requirePassword,
  requireString,
  optionalString,
} from "../../lib/validation.js";
import {
  addRestaurantMember,
  createRestaurantManagerAccount,
  deleteRestaurantManagerAccount,
  RESTAURANT_MEMBER_ROLES,
} from "./service.js";

import {uploadFile} from "../../storage/storage.service.js"

export const add = async (req: Request, res: Response): Promise<void> => {
  const auth = requireAuthContext(req);
  const payload = await addRestaurantMember(
    auth.userId,
    requireString(req.params.id, "id", 1),
    {
      email: requireEmail(req.body.email),
      role: requireEnumValue(req.body.role, "role", RESTAURANT_MEMBER_ROLES),
    },
  );

  res.status(201).json(payload);
};

export const createManagerAccount = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const auth = requireAuthContext(req);

  // Handle profile picture upload — accepts base64 data URL or raw base64.
  // Uploads to ImageKit and replaces the value with the returned CDN URL.
  let profilePicUrl: string | undefined = optionalString(
    req.body.profilePic,
    "profilePic",
  );

  if (profilePicUrl && profilePicUrl.startsWith("data:")) {
    // Strip the "data:image/...;base64," prefix
    const match = profilePicUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      throw new Error("profilePic must be a valid base64 data URL");
    }
    const [, mimeType, base64Data] = match;
    const buffer = Buffer.from(base64Data, "base64");
    const ext = mimeType.split("/")[1] ?? "jpg";
    const fileName = `manager-${Date.now()}.${ext}`;

    const uploadResponse = await uploadFile(buffer, fileName);
    profilePicUrl = uploadResponse.url;
  }

  const payload = await createRestaurantManagerAccount(
    auth.userId,
    requireString(req.params.id, "id", 1),
    {
      email: requireEmail(req.body.email),
      password: requirePassword(req.body.password),
      name: optionalString(req.body.name, "name"),
      mobile: optionalString(req.body.mobile, "mobile"),
      profilePic: profilePicUrl,
    },
  );

  res.status(201).json(payload);
};

export const deleteManagerAccount = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const auth = requireAuthContext(req);
  const payload = await deleteRestaurantManagerAccount(
    auth.userId,
    requireString(req.params.id, "id", 1),
  );

  res.status(200).json(payload);
};
