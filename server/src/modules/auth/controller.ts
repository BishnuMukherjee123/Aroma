import type { Request, Response } from "express";

import { requireAuthContext } from "../../lib/request.js";
import { requireEmail, requirePassword } from "../../lib/validation.js";
import { getCurrentUser, loginUser, registerUser, sendOtpService, verifyOtpService } from "./service.js";

export const register = async (req: Request, res: Response): Promise<void> => {
  const payload = await registerUser({
    email: requireEmail(req.body.email),
    password: requirePassword(req.body.password),
  });

  res.status(201).json(payload);
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const payload = await loginUser({
    email: requireEmail(req.body.email),
    password: requirePassword(req.body.password),
  });

  res.status(200).json(payload);
};

export const sendOtp = async (req: Request, res: Response): Promise<void> => {
  const payload = await sendOtpService(requireEmail(req.body.email));
  res.status(200).json(payload);
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  const email = requireEmail(req.body.email);
  const code = String(req.body.code || "").trim();

  if (!/^\d{6}$/.test(code)) {
    throw Object.assign(new Error("OTP code must be exactly 6 digits"), { statusCode: 400 });
  }

  const payload = await verifyOtpService(email, code);
  res.status(200).json(payload);
};

export const me = async (req: Request, res: Response): Promise<void> => {
  const auth = requireAuthContext(req);
  const payload = await getCurrentUser(auth.userId);
  res.status(200).json(payload);
};
