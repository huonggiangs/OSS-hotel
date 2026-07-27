import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/errors";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error_code: err.errorCode,
      message: err.message,
      details: err.details ?? null,
    });
  }
  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({
    error_code: "INTERNAL_ERROR",
    message: "Đã có lỗi hệ thống xảy ra.",
  });
}
