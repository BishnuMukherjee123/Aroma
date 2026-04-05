import type { ErrorRequestHandler } from "express";

import { HttpError } from "../lib/errors.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      error: error.message,
      details: error.details ?? null,
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    error: "Internal server error",
    details: null,
  });
};
