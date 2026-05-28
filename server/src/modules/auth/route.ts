import { Router } from "express";

import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { createRateLimitMiddleware } from "../../middleware/rate-limit.js";
import * as controller from "./controller.js";

export const createAuthRouter = (): Router => {
  const router = Router();

  // Strict limiter for OTP send (3 per minute per IP — enough for real users, blocks bots)
  const otpSendLimiter = createRateLimitMiddleware({
    key: "auth:otp:send",
    windowMs: 60 * 1000,
    maxRequests: 3,
  });

  // Strict limiter for OTP verify (5 per minute per IP — stops brute-force on 6-digit codes)
  const otpVerifyLimiter = createRateLimitMiddleware({
    key: "auth:otp:verify",
    windowMs: 60 * 1000,
    maxRequests: 5,
  });

  // Standard login/register limiter
  const authLimiter = createRateLimitMiddleware({
    key: "auth",
    windowMs: 60 * 1000,
    maxRequests: 10,
  });

  router.post("/register", authLimiter, asyncHandler(controller.register));
  router.post("/login", authLimiter, asyncHandler(controller.login));
  router.post("/otp/send", otpSendLimiter, asyncHandler(controller.sendOtp));
  router.post("/otp/verify", otpVerifyLimiter, asyncHandler(controller.verifyOtp));
  router.get("/me", asyncHandler(requireAuth), asyncHandler(controller.me));
  router.patch("/profile", asyncHandler(requireAuth), asyncHandler(controller.updateProfile));
  router.post("/profile/avatar-upload", asyncHandler(requireAuth), asyncHandler(controller.getAvatarUploadUrl));

  return router;
};
