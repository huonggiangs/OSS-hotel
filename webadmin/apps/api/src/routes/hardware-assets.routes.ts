import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { hardwareAssetsRepo } from "../repositories/hardwareAssets.repo";
import { assetAlertsRepo } from "../repositories/assetAlerts.repo";
import { syncConnectionStatusFromIot } from "../lib/iotSync";
import { fetchPropertyWebBranches } from "../lib/propertyWebClient";
import { fetchMobileConnections } from "../lib/propertyWebClient";
import { registerIotDevice } from "../lib/iotClient";

export const hardwareAssetsRouter = Router();
hardwareAssetsRouter.use(requireAuth);

const assetTypeEnum = z.enum([
  "KIOSK",
  "PASSPORT_SCANNER",
  "QR_SCANNER",
  "CARD_DISPENSER",
  "CASH_ACCEPTOR",
  "IP_CAMERA",
  "THERMAL_PRINTER",
  "IOT_CONTROLLER",
  "OTHER",
  "DOOR_LOCK",
  "POWER_SWITCH",
  "ELECTRIC_METER",
  "EDGE_NODE",
]);

// property_id/property_name BẮT BUỘC khi tạo mới (mọi thiết bị phải được gán
// vào 1 cơ sở — yêu cầu gốc). Khi PATCH thì optional (đã có sẵn giá trị cũ).
const baseFields = {
  assetType: assetTypeEnum,
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().min(1),
  supplierId: z.string().uuid().optional().nullable(),
  purchaseCost: z.number().nonnegative().optional(),
  purchasedAt: z.string().datetime().optional(),
  warrantyUntil: z.string().datetime().optional(),
  status: z.enum(["IN_STOCK", "DEPLOYED", "UNDER_WARRANTY_CLAIM", "INACTIVE", "RETIRED"]).default("IN_STOCK"),
  customerId: z.string().uuid().optional().nullable(),
  deviceIdExternal: z.string().optional(),
  activatedAt: z.string().datetime().optional(),
  supportingPartnerId: z.string().uuid().optional().nullable(),
  connectivityProvider: z.string().optional(),
  subscriptionFee: z.number().nonnegative().optional(),
  subscriptionCycle: z.enum(["MONTHLY", "YEARLY"]).optional(),
  connectedServer: z.string().optional(),
  parentAssetId: z.string().uuid().optional().nullable(),
  installationLocation: z.string().max(255).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  deactivatedAt: z.string().datetime().optional().nullable(),
  deactivationReason: z.string().max(1000).optional().nullable(),
  connectionProtocol: z.enum(["HTTP", "MQTT", "TCP", "FIREBASE"]).optional(),
};

function toIotDeviceType(assetType: string): string {
  const map: Record<string, string> = {
    POWER_SWITCH: "SWITCH", IOT_CONTROLLER: "RELAY", DOOR_LOCK: "DOOR_LOCK",
    ELECTRIC_METER: "ELECTRIC_METER", IP_CAMERA: "CAMERA", QR_SCANNER: "QR_SCANNER",
  };
  return map[assetType] ?? "OTHER";
}

const createSchema = z.object({
  ...baseFields,
  // Bắt buộc khi tạo mới — đúng yêu cầu "Tất cả thiết bị phải được khai báo
  // và gán vào cơ sở". property_id KHÔNG kiểm tra dạng UUID vì tham chiếu
  // lỏng sang property-web (id property_web sinh ra), không phải id nội bộ.
  propertyId: z.string().min(1, "Bắt buộc gán thiết bị vào 1 cơ sở (property_id)."),
  propertyName: z.string().min(1, "Bắt buộc có tên cơ sở hiển thị (property_name)."),
});

const updateSchema = z.object({
  ...baseFields,
  propertyId: z.string().min(1).optional(),
  propertyName: z.string().min(1).optional(),
});

hardwareAssetsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const [items, mobile] = await Promise.all([hardwareAssetsRepo.list({
      status: req.query.status as string | undefined,
      assetType: req.query.assetType as string | undefined,
      search: req.query.search as string | undefined,
      propertyId: req.query.propertyId as string | undefined,
      connectionStatus: req.query.connectionStatus as string | undefined,
    }), fetchMobileConnections()]);
    res.json({ items, total: items.length, mobile_devices: mobile.items, mobile_device_total: mobile.total });
  })
);

// Tổng hợp toàn bộ cảnh báo CHƯA resolve — dùng cho khối "Cảnh báo thiết bị"
// đầu trang danh sách. Đặt TRƯỚC "/:id" để không bị route "/:id" nuốt mất.
hardwareAssetsRouter.get(
  "/alerts",
  asyncHandler(async (_req, res) => {
    const items = await assetAlertsRepo.listUnresolved();
    res.json({ items, total: items.length });
  })
);

// Danh sách cơ sở thật lấy từ property-web (dropdown "gán vào cơ sở"). Trả về
// `source: "property-web"` khi gọi thành công, `source: "fallback"` (mảng
// rỗng) khi property-web không chạy được — UI phải tự chuyển sang input nhập
// tay khi thấy source=fallback, KHÔNG được crash.
hardwareAssetsRouter.get(
  "/property-options",
  asyncHandler(async (_req, res) => {
    const branches = await fetchPropertyWebBranches();
    if (branches === null) {
      return res.json({ items: [], source: "fallback" });
    }
    res.json({ items: branches, source: "property-web" });
  })
);

// Đồng bộ thủ công ngay lập tức (nút "Đồng bộ trạng thái ngay" ở trang chi
// tiết) — cùng logic với job setInterval chạy nền ở index.ts.
hardwareAssetsRouter.post(
  "/sync-connection-status",
  requireRole("SUPPLY_CHAIN", "SUPER_ADMIN", "OPS_SUPPORT"),
  asyncHandler(async (req, res) => {
    const result = await syncConnectionStatusFromIot();
    await writeAuditLog({ req, action: "SYNC_HARDWARE_CONNECTION_STATUS", entityType: "hardware_asset", afterData: result });
    res.json(result);
  })
);

const gatewayRegistrationSchema = z.object({
  connectionProtocol: z.enum(["HTTP", "MQTT", "TCP", "FIREBASE"]),
  roomId: z.string().trim().min(1).default("UNASSIGNED"),
  protocolConfig: z.record(z.unknown()).optional(),
});

// Kỹ thuật viên đăng ký hoặc cấp lại khóa cho thiết bị. Khóa chỉ hiển thị
// trong response này; HQ và IoT DB không lưu khóa thô.
hardwareAssetsRouter.post(
  "/:id/register-gateway",
  requireRole("SUPPLY_CHAIN", "SUPER_ADMIN", "OPS_SUPPORT"),
  asyncHandler(async (req, res) => {
    const parsed = gatewayRegistrationSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const asset = await hardwareAssetsRepo.findById(req.params.id);
    if (!asset) throw Errors.notFound("thiết bị");
    if (!asset.property_id) throw Errors.conflict("Thiết bị chưa được gán vào cơ sở.");
    const branches = await fetchPropertyWebBranches();
    const branch = branches?.find((item) => item.id === asset.property_id);
    const tenantId = branch?.tenant_id ?? asset.customer_id ?? asset.property_id;
    const result = await registerIotDevice({
      id: asset.device_id_external || `hq-${asset.id}`,
      tenantId,
      propertyId: asset.property_id,
      roomId: parsed.data.roomId,
      deviceType: toIotDeviceType(asset.asset_type),
      name: `${asset.asset_code} · ${asset.brand ?? asset.asset_type}`,
      assetCode: asset.asset_code,
      connectionProtocol: parsed.data.connectionProtocol,
      brand: asset.brand ?? undefined,
      model: asset.model ?? undefined,
      protocolConfig: parsed.data.protocolConfig,
    });
    const updated = await hardwareAssetsRepo.update(asset.id, {
      deviceIdExternal: result.device.id,
      connectionProtocol: parsed.data.connectionProtocol,
      gatewayConfiguredAt: new Date().toISOString(),
      connectedServer: "iot-service",
    });
    await writeAuditLog({ req, action: "REGISTER_DEVICE_GATEWAY", entityType: "hardware_asset", entityId: asset.id,
      beforeData: asset, afterData: { connection_protocol: parsed.data.connectionProtocol, device_id_external: result.device.id } });
    res.status(201).json({
      asset: updated,
      device_key: result.device_key,
      http_base_path: `/api/backend/api/v1/device-gateway/${asset.asset_code}`,
      mqtt_up_topic: `hotel/${asset.asset_code}/up`,
      mqtt_down_topic: `hotel/${asset.asset_code}/down`,
      tcp_port: 7100,
      note: "Lưu khóa ngay vào thiết bị; khóa thô sẽ không hiển thị lại.",
    });
  })
);

hardwareAssetsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const asset = await hardwareAssetsRepo.findById(req.params.id);
    if (!asset) throw Errors.notFound("thiết bị");
    const claims = await hardwareAssetsRepo.listWarrantyClaims(asset.id);
    const children = await hardwareAssetsRepo.listChildren(asset.id);
    res.json({ ...asset, warranty_claims: claims, child_assets: children });
  })
);

hardwareAssetsRouter.get(
  "/:id/alerts",
  asyncHandler(async (req, res) => {
    const asset = await hardwareAssetsRepo.findById(req.params.id);
    if (!asset) throw Errors.notFound("thiết bị");
    const items = await assetAlertsRepo.listByAsset(asset.id);
    res.json({ items, total: items.length });
  })
);

hardwareAssetsRouter.post(
  "/",
  requireRole("SUPPLY_CHAIN", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());

    const existing = await hardwareAssetsRepo.findBySerial(parsed.data.serialNumber);
    if (existing) throw Errors.conflict("Số serial này đã tồn tại trong hệ thống.");

    if (parsed.data.parentAssetId) {
      const parent = await hardwareAssetsRepo.findById(parsed.data.parentAssetId);
      if (!parent) throw Errors.validation({ parentAssetId: "Thiết bị chính (parentAssetId) không tồn tại." });
    }

    const asset = await hardwareAssetsRepo.create(parsed.data);
    await writeAuditLog({ req, action: "CREATE_HARDWARE_ASSET", entityType: "hardware_asset", entityId: asset.id, afterData: asset });
    res.status(201).json(asset);
  })
);

hardwareAssetsRouter.patch(
  "/:id",
  requireRole("SUPPLY_CHAIN", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const existing = await hardwareAssetsRepo.findById(req.params.id);
    if (!existing) throw Errors.notFound("thiết bị");
    const parsed = updateSchema.partial().safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());

    if (parsed.data.parentAssetId) {
      if (parsed.data.parentAssetId === req.params.id) {
        throw Errors.validation({ parentAssetId: "Thiết bị không thể là thiết bị phụ trợ của chính nó." });
      }
      const parent = await hardwareAssetsRepo.findById(parsed.data.parentAssetId);
      if (!parent) throw Errors.validation({ parentAssetId: "Thiết bị chính (parentAssetId) không tồn tại." });
    }

    const asset = await hardwareAssetsRepo.update(req.params.id, parsed.data);
    await writeAuditLog({ req, action: "UPDATE_HARDWARE_ASSET", entityType: "hardware_asset", entityId: req.params.id, beforeData: existing, afterData: asset });
    res.json(asset);
  })
);

hardwareAssetsRouter.post(
  "/:id/activate",
  requireRole("SUPPLY_CHAIN", "SUPER_ADMIN", "OPS_SUPPORT"),
  asyncHandler(async (req, res) => {
    const existing = await hardwareAssetsRepo.findById(req.params.id);
    if (!existing) throw Errors.notFound("thiết bị");
    if (!existing.property_id) throw Errors.conflict("Không thể kích hoạt thiết bị chưa được gán vào cơ sở.");
    const asset = await hardwareAssetsRepo.activate(existing.id);
    await writeAuditLog({ req, action: "ACTIVATE_HARDWARE_ASSET", entityType: "hardware_asset", entityId: existing.id, beforeData: existing, afterData: asset });
    res.json(asset);
  })
);

hardwareAssetsRouter.post(
  "/:id/deactivate",
  requireRole("SUPPLY_CHAIN", "SUPER_ADMIN", "OPS_SUPPORT"),
  asyncHandler(async (req, res) => {
    const parsed = z.object({ reason: z.string().trim().min(3).max(1000) }).safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const existing = await hardwareAssetsRepo.findById(req.params.id);
    if (!existing) throw Errors.notFound("thiết bị");
    const asset = await hardwareAssetsRepo.deactivate(existing.id, parsed.data.reason);
    await writeAuditLog({ req, action: "DEACTIVATE_HARDWARE_ASSET", entityType: "hardware_asset", entityId: existing.id, beforeData: existing, afterData: asset });
    res.json(asset);
  })
);

hardwareAssetsRouter.post(
  "/:id/faults",
  requireRole("SUPPLY_CHAIN", "SUPER_ADMIN", "OPS_SUPPORT"),
  asyncHandler(async (req, res) => {
    const parsed = z.object({
      description: z.string().trim().min(3).max(2000),
      severity: z.enum(["INFO", "WARNING", "CRITICAL"]).default("WARNING"),
    }).safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const asset = await hardwareAssetsRepo.findById(req.params.id);
    if (!asset) throw Errors.notFound("thiết bị");
    const alert = await assetAlertsRepo.create({ assetId: asset.id, alertType: "MANUAL_FAULT", message: parsed.data.description, severity: parsed.data.severity });
    await writeAuditLog({ req, action: "REPORT_HARDWARE_FAULT", entityType: "hardware_asset", entityId: asset.id, afterData: { alert_id: alert.id, severity: alert.severity, description: alert.message } });
    res.status(201).json({ alert, asset });
  })
);

hardwareAssetsRouter.post(
  "/:id/alerts/:alertId/resolve",
  requireRole("SUPPLY_CHAIN", "SUPER_ADMIN", "OPS_SUPPORT"),
  asyncHandler(async (req, res) => {
    const asset = await hardwareAssetsRepo.findById(req.params.id);
    if (!asset) throw Errors.notFound("thiết bị");
    const alert = await assetAlertsRepo.resolveById(req.params.alertId);
    if (!alert || alert.asset_id !== asset.id) throw Errors.notFound("cảnh báo của thiết bị");
    await writeAuditLog({ req, action: "RESOLVE_HARDWARE_ALERT", entityType: "hardware_alert", entityId: alert.id, afterData: alert });
    res.json(alert);
  })
);

hardwareAssetsRouter.post(
  "/:id/warranty-claims",
  requireRole("SUPPLY_CHAIN", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const schema = z.object({ issueDescription: z.string().min(1), cost: z.number().nonnegative().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());

    const asset = await hardwareAssetsRepo.findById(req.params.id);
    if (!asset) throw Errors.notFound("thiết bị");

    const claim = await hardwareAssetsRepo.createWarrantyClaim(asset.id, parsed.data.issueDescription, parsed.data.cost);
    await writeAuditLog({ req, action: "CREATE_WARRANTY_CLAIM", entityType: "warranty_claim", entityId: claim.id, afterData: claim });
    res.status(201).json(claim);
  })
);
