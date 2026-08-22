import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/errors";
import { requireAuth } from "../middleware/auth";

export const locationRouter = Router();
locationRouter.use(requireAuth);

interface IpWhoIsResponse {
  success?: boolean;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

locationRouter.get(
  "/by-ip",
  asyncHandler(async (_req, res) => {
    // Gọi từ API thay vì trình duyệt: ipapi.co đang trả 403 trên mạng hiện tại,
    // còn cách này tránh phụ thuộc CORS và có timeout rõ ràng.
    let response: Response;
    try {
      response = await fetch("https://ipwho.is/", {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      throw new ApiError(502, "IP_LOCATION_UNAVAILABLE", "Không kết nối được dịch vụ định vị IP.");
    }
    if (!response.ok) throw new ApiError(502, "IP_LOCATION_UNAVAILABLE", "Dịch vụ định vị IP hiện không phản hồi.");

    const data = (await response.json()) as IpWhoIsResponse;
    if (
      data.success !== true ||
      typeof data.latitude !== "number" ||
      typeof data.longitude !== "number" ||
      data.latitude < -90 ||
      data.latitude > 90 ||
      data.longitude < -180 ||
      data.longitude > 180
    ) {
      throw new ApiError(502, "IP_LOCATION_UNAVAILABLE", "Dịch vụ định vị IP không trả về tọa độ hợp lệ.");
    }

    res.json({
      address: [data.city, data.region, data.country].filter(Boolean).join(", "),
      latitude: data.latitude,
      longitude: data.longitude,
      source: "ip",
    });
  })
);
