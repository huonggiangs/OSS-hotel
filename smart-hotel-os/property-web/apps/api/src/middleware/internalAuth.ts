import { NextFunction, Request, Response } from "express";
import { requireAuth } from "./auth";
import { Errors } from "../utils/errors";

// ============================================================================
// Middleware TỐI GIẢN cho phép gọi nội bộ giữa 2 hệ thống công ty tự làm
// (webadmin <-> property-web) bỏ qua JWT khi có đúng header
// `X-Internal-Service-Key`. CHỈ áp dụng cho endpoint ĐỌC danh sách cơ sở
// (GET /api/v1/branches) — KHÔNG áp dụng cho bất kỳ endpoint nào khác (đặc
// biệt KHÔNG áp dụng cho POST /branches hay bất kỳ endpoint ghi dữ liệu nào).
//
// ⚠ ĐÂY LÀ MVP TẠM THỜI cho môi trường dev — production PHẢI đổi sang OAuth2
// client credentials đúng chuẩn `hq-console/docs/PARTNER_API_STANDARDS.md`
// trước khi 2 hệ thống này giao tiếp qua mạng thật ngoài máy dev. Ghi rõ lại
// trong property-web/PROGRESS.md và webadmin/PROGRESS.md.
// ============================================================================

const INTERNAL_SERVICE_KEY =
  process.env.INTERNAL_SERVICE_KEY ??
  (process.env.NODE_ENV === "production" ? undefined : "dev-internal-service-key-change-me");

/**
 * Nếu request có header X-Internal-Service-Key khớp giá trị cấu hình -> cho
 * qua thẳng (KHÔNG gán req.user, vì đây là lời gọi máy-tới-máy không đại diện
 * cho 1 property_user cụ thể nào — route đích phải tự xử lý trường hợp
 * req.user undefined). Nếu không khớp/không có header -> rơi về xác thực JWT
 * bình thường (requireAuth) như mọi endpoint khác.
 */
export function requireAuthOrInternalKey(req: Request, res: Response, next: NextFunction) {
  const key = req.headers["x-internal-service-key"];
  if (typeof key === "string" && typeof INTERNAL_SERVICE_KEY === "string" && key.length > 0 && key === INTERNAL_SERVICE_KEY) {
    return next();
  }
  return requireAuth(req, res, next);
}

/** Chỉ dành cho endpoint máy-tới-máy có ghi dữ liệu, không rơi về JWT người dùng. */
export function requireInternalServiceKey(req: Request, _res: Response, next: NextFunction) {
  const key = req.headers["x-internal-service-key"];
  if (typeof key === "string" && typeof INTERNAL_SERVICE_KEY === "string" && key.length > 0 && key === INTERNAL_SERVICE_KEY) {
    return next();
  }
  return next(Errors.unauthorized());
}
