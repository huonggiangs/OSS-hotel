import { timingSafeEqual } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { hardwareAssetsRepo } from "../repositories/hardwareAssets.repo";

export const internalRouter = Router();

const internalServiceKey =
  process.env.INTERNAL_SERVICE_KEY ??
  (process.env.NODE_ENV === "production" ? undefined : "dev-internal-service-key-change-me");

function requireInternalServiceKey(req: Request, res: Response, next: NextFunction) {
  const supplied = req.header("X-Internal-Service-Key");
  if (!internalServiceKey || !supplied || supplied.length !== internalServiceKey.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(internalServiceKey))) {
    return res.status(401).json({ error_code: "UNAUTHORIZED", message: "Thiếu hoặc sai X-Internal-Service-Key." });
  }
  next();
}

// Chỉ cung cấp tra cứu mã tài sản cho các service nội bộ. Đây là bước chống
// ghép nhầm mã PMS/IoT với tài sản HQ khác cơ sở; không mở CRUD HQ ra ngoài.
internalRouter.get(
  "/hardware-assets/:assetCode",
  requireInternalServiceKey,
  asyncHandler(async (req, res) => {
    const asset = await hardwareAssetsRepo.findByAssetCode(req.params.assetCode.toUpperCase());
    if (!asset) return res.status(404).json({ error_code: "NOT_FOUND", message: "Không tìm thấy asset_code trên HQ." });
    res.json({ id: asset.id, asset_code: asset.asset_code, asset_type: asset.asset_type, property_id: asset.property_id, property_name: asset.property_name, status: asset.status });
  })
);
