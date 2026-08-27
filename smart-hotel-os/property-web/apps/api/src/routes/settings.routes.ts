import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError, Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { settingsRepo } from "../repositories/settings.repo";
import { requestIp } from "../middleware/ipAllowlist";
import {
  redactEmailSettings,
  secureEmailSettings,
  redactSepayToken,
  secureSepayToken,
  redactSyncApiKeys,
  secureSyncApiKeys,
} from "../lib/settingsSecrets";

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

// Danh sách nhóm hợp lệ — chặn client ghi vào group_key tuỳ ý ngoài dự kiến.
// Khớp đúng các nhóm cấu hình đã seed; nhóm "facility" giữ CRUD tòa nhà/khu
// và chính sách ngôn ngữ, tách khỏi basic để dữ liệu vận hành có vòng đời riêng.
const VALID_GROUPS = new Set([
  "basic",
  "facility",
  "amenities",
  "images",
  "email",
  "security",
  "currency",
  "tax",
  "time",
  "printer",
  "channel",
  "sync",
  "db",
  "social",
  "modules",
  "utilities",
  "assets",
  "services",
  "marketing",
  "daily_entries",
  "payment",
  "roles",
]);

const putSchema = z.object({ data: z.unknown() });

interface FacilityLanguageSettings {
  language?: unknown;
  languageMode?: unknown;
}

const SUPPORTED_LANGUAGES = new Set(["vi", "en", "ko", "zh", "ja"]);
const LANGUAGE_BY_COUNTRY: Record<string, string> = {
  VN: "vi", US: "en", GB: "en", AU: "en", CA: "en", KR: "ko", CN: "zh", TW: "zh", HK: "zh", JP: "ja",
};

function browserLanguage(req: import("express").Request): string {
  const raw = req.get("accept-language")?.split(",")[0]?.trim().toLowerCase().split("-")[0] ?? "";
  return SUPPORTED_LANGUAGES.has(raw) ? raw : "vi";
}

function isPublicIp(ip: string): boolean {
  if (!ip || ip === "::1" || ip === "localhost") return false;
  if (/^(10\.|127\.|192\.168\.|169\.254\.|0\.)/.test(ip)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return false;
  return true;
}

async function languageFromClientIp(ip: string): Promise<string | null> {
  if (!isPublicIp(ip)) return null;
  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(2_500),
    });
    if (!response.ok) return null;
    const body = await response.json() as { success?: boolean; country_code?: string };
    const country = typeof body.country_code === "string" ? body.country_code.toUpperCase() : "";
    return LANGUAGE_BY_COUNTRY[country] ?? null;
  } catch {
    return null;
  }
}

const floorRoomSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(120),
  number: z.string().trim().min(1).max(50),
});

const floorSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(120),
  rooms: z.array(floorRoomSchema).max(200),
});

const basicSettingsSchema = z.object({
  floorInputs: z.array(floorSchema).max(200),
  info: z.object({
    intro: z.string().max(4000),
    logoDataUrl: z.string().max(1_100_000).refine((value) => value === "" || /^data:image\/(png|jpeg|webp);base64,/.test(value), "Logo không đúng định dạng ảnh hợp lệ."),
    logoFileName: z.string().max(255),
    website: z.string().max(500),
    ctvCode: z.string().max(100),
    accommodationType: z.string().max(100),
    location: z.object({
      address: z.string().max(500),
      latitude: z.number().min(-90).max(90).nullable(),
      longitude: z.number().min(-180).max(180).nullable(),
      source: z.union([z.literal("ip"), z.literal("")]),
    }),
  }),
  owner: z.object({ fullName: z.string().max(255), idNumber: z.string().max(100), phone: z.string().max(50), email: z.string().max(320) }),
  payment: z.object({ bankName: z.string().max(255), accountNumber: z.string().max(100), accountHolder: z.string().max(255) }),
});

function redactBasicLogoForAudit(data: unknown): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  const basic = data as { info?: Record<string, unknown> };
  if (!basic.info?.logoDataUrl) return data;
  return { ...basic, info: { ...basic.info, logoDataUrl: "[IMAGE_DATA_OMITTED]" } };
}

// Lấy tỷ giá VND cho 1 mã tiền tệ — gọi từ API thay vì trình duyệt để tránh
// CORS (giống lý do location.routes.ts gọi ipwho.is từ server). Dùng
// open.er-api.com (miễn phí, không cần API key). Đặt TRƯỚC route "/:group"
// bên dưới dù không thật sự cần thiết (path có 2 đoạn nên không khớp
// "/:group" một đoạn) — để rõ ràng đây là route riêng, không đụng route
// generic GET/PUT "/:group".
settingsRouter.get(
  "/currency/fx-rate",
  asyncHandler(async (req, res) => {
    const rawCode = typeof req.query.code === "string" ? req.query.code : "";
    const code = rawCode.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) {
      throw Errors.validation({ code: ["Mã tiền tệ không hợp lệ — cần đúng 3 chữ cái, ví dụ USD."] });
    }
    if (code === "VND") {
      res.json({ code, rateVnd: 1 });
      return;
    }
    let response: Response;
    try {
      response = await fetch(`https://open.er-api.com/v6/latest/${code}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      throw new ApiError(502, "FX_RATE_UNAVAILABLE", "Không kết nối được dịch vụ tỷ giá ngoại tệ. Vui lòng thử lại sau.");
    }
    if (!response.ok) {
      throw new ApiError(502, "FX_RATE_UNAVAILABLE", "Dịch vụ tỷ giá ngoại tệ hiện không phản hồi.");
    }
    const body = (await response.json()) as { result?: string; rates?: Record<string, number> };
    const rateVnd = body.rates?.VND;
    if (body.result !== "success" || typeof rateVnd !== "number" || !Number.isFinite(rateVnd) || rateVnd <= 0) {
      throw new ApiError(502, "FX_RATE_UNAVAILABLE", `Không lấy được tỷ giá VND cho mã tiền tệ "${code}".`);
    }
    res.json({ code, rateVnd });
  })
);

// Hiển thị chính địa chỉ mà API nhận từ reverse proxy hiện tại. Người quản lý
// dùng giá trị này để thêm allowlist trước khi bật giới hạn IP, tránh đoán IP
// sai khi PMS chạy sau Docker/Next.js proxy.
settingsRouter.get(
  "/security/observed-ip",
  asyncHandler(async (req, res) => {
    res.json({ ip: requestIp(req) });
  })
);

// Chọn ngôn ngữ cho client mà không lưu IP khách. Với LAN/private IP không
// thể suy ra quốc gia đáng tin cậy, nên rơi về Accept-Language của trình duyệt.
settingsRouter.get(
  "/language/resolve",
  asyncHandler(async (req, res) => {
    const facility = await settingsRepo.get(req.user!.propertyId, "facility") as FacilityLanguageSettings | null;
    const configured = typeof facility?.language === "string" && SUPPORTED_LANGUAGES.has(facility.language) ? facility.language : "vi";
    const mode = facility?.languageMode === "BROWSER" || facility?.languageMode === "IP" ? facility.languageMode : "DEFAULT";
    if (mode === "DEFAULT") {
      res.json({ language: configured, source: "default" });
      return;
    }
    if (mode === "BROWSER") {
      res.json({ language: browserLanguage(req), source: "browser" });
      return;
    }
    const fromIp = await languageFromClientIp(requestIp(req));
    res.json({ language: fromIp ?? browserLanguage(req), source: fromIp ? "ip" : "browser-fallback" });
  })
);

settingsRouter.get(
  "/:group",
  asyncHandler(async (req, res) => {
    const group = req.params.group;
    if (!VALID_GROUPS.has(group)) throw Errors.notFound("nhóm cấu hình");
    if (group === "email" && !["OWNER", "MANAGER"].includes(req.user!.role)) throw Errors.forbidden();
    const data = await settingsRepo.get(req.user!.propertyId, group);
    let responseData: unknown = data ?? {};
    if (group === "email") responseData = redactEmailSettings(data);
    if (group === "payment") responseData = redactSepayToken(data ?? {});
    if (group === "sync") responseData = redactSyncApiKeys(data ?? {});
    res.json({ group, data: responseData });
  })
);

// Ghi cấu hình — chỉ OWNER/MANAGER được sửa cấu hình hệ thống cấp cơ sở (đối
// chiếu docs/PERMISSION_MATRIX.md: RECEPTIONIST/HOUSEKEEPING không được sửa
// cấu hình hệ thống, chỉ được thao tác nghiệp vụ hàng ngày).
settingsRouter.put(
  "/:group",
  requireRole("OWNER", "MANAGER"),
  asyncHandler(async (req, res) => {
    const group = req.params.group;
    if (!VALID_GROUPS.has(group)) throw Errors.notFound("nhóm cấu hình");
    const parsed = putSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const previous =
      group === "email" || group === "payment" || group === "sync"
        ? await settingsRepo.get(req.user!.propertyId, group)
        : undefined;
    const basicParsed = group === "basic" ? basicSettingsSchema.safeParse(parsed.data.data) : undefined;
    if (basicParsed && !basicParsed.success) throw Errors.validation(basicParsed.error.flatten());
    const inputData = basicParsed?.data ?? parsed.data.data;
    let storedData = inputData;
    if (group === "email") storedData = secureEmailSettings(inputData, previous);
    if (group === "payment") storedData = secureSepayToken(inputData, previous);
    if (group === "sync") storedData = secureSyncApiKeys(inputData, previous);
    const data = await settingsRepo.upsert(req.user!.propertyId, req.user!.tenantId, group, storedData);
    let responseData = data;
    if (group === "email") responseData = redactEmailSettings(data);
    if (group === "payment") responseData = redactSepayToken(data);
    if (group === "sync") responseData = redactSyncApiKeys(data);
    const auditData = group === "basic" ? redactBasicLogoForAudit(responseData) : responseData;
    await writeAuditLog({ req, action: "UPDATE_SETTINGS", entityType: "property_settings", entityId: group, afterData: auditData });
    res.json({ group, data: responseData });
  })
);
