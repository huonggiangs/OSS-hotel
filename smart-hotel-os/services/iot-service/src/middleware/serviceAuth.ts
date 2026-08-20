import { timingSafeEqual } from "node:crypto";
import { NextFunction, Request, Response } from "express";

const configuredServiceApiKey = process.env.SERVICE_API_KEY;

if (!configuredServiceApiKey || configuredServiceApiKey.length < 32) {
  throw new Error("SERVICE_API_KEY phải được cấu hình và có ít nhất 32 ký tự.");
}
const serviceApiKey: string = configuredServiceApiKey;

export function requireServiceAuth(req: Request, res: Response, next: NextFunction) {
  const supplied = req.header("X-Service-Api-Key");
  if (!supplied || supplied.length !== serviceApiKey.length) return res.status(401).json({ error_code: "UNAUTHORIZED", message: "Thiếu hoặc sai X-Service-Api-Key." });
  if (!timingSafeEqual(Buffer.from(supplied), Buffer.from(serviceApiKey))) return res.status(401).json({ error_code: "UNAUTHORIZED", message: "Thiếu hoặc sai X-Service-Api-Key." });
  next();
}
