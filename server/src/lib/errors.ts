export class HttpError extends Error {
  readonly statusCode: number;
  readonly details: unknown;

  constructor(statusCode: number, message: string, details: unknown = null) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

const fail = (statusCode: number, message: string, details?: unknown): never => {
  throw new HttpError(statusCode, message, details);
};

export const badRequest = (message: string, details?: unknown): never =>
  fail(400, message, details);

export const unauthorized = (message = "Unauthorized"): never =>
  fail(401, message);

export const forbidden = (message = "Forbidden"): never =>
  fail(403, message);

export const notFound = (message = "Not found"): never =>
  fail(404, message);

export const conflict = (message: string, details?: unknown): never =>
  fail(409, message, details);

export const ensureFoundValue = <T>(
  value: T | null | undefined,
  message = "Not found",
): T => {
  if (value === null || value === undefined) {
    notFound(message);
  }

  return value as T;
};
