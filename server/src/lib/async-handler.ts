import type { NextFunction, Request, RequestHandler, Response } from "express";

export const asyncHandler = (
  handler: (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<unknown> | unknown,
): RequestHandler => {
  return (req, res, next): void => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

// {
//   "email": "owner1@example.com",
//   "password": "Password123"
// }

