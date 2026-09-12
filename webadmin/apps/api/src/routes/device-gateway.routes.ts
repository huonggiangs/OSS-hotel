import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";

const IOT_SERVICE_URL = process.env.IOT_SERVICE_URL ?? "http://localhost:4103";
export const deviceGatewayProxyRouter = Router();

// Gateway HTTP công khai qua HQ :3000/api/backend/api/v1/device-gateway/...
// X-Device-Key được kiểm chứng tại IoT service; không dùng JWT người dùng.
deviceGatewayProxyRouter.use(asyncHandler(async (req, res) => {
  const deviceKey = req.header("X-Device-Key");
  if (!deviceKey) return void res.status(401).json({ error_code: "DEVICE_KEY_REQUIRED", message: "Thiếu X-Device-Key." });
  const suffix = req.originalUrl.split("/api/v1/device-gateway")[1] ?? "/";
  const upstream = await fetch(`${IOT_SERVICE_URL}/device/v1${suffix}`, {
    method: req.method,
    headers: { "Content-Type": "application/json", "X-Device-Key": deviceKey },
    body: req.method === "GET" || req.method === "HEAD" ? undefined : JSON.stringify(req.body ?? {}),
  });
  const text = await upstream.text();
  const contentType = upstream.headers.get("content-type");
  if (contentType) res.type(contentType);
  res.status(upstream.status).send(text);
}));
