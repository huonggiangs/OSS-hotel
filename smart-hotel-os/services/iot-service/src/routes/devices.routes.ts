import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { devicesRepo } from "../repositories/devices.repo";
import { heartbeatsRepo } from "../repositories/heartbeats.repo";

export const devicesRouter = Router();

// Định danh server/instance iot-service này đang chạy — trả kèm trong response
// GET /devices để webadmin biết "connected_server" khi đồng bộ trạng thái vào
// hardware_assets (xem webadmin/apps/api/src/lib/iotSync.ts). Ở kiến trúc thật
// sau này (nhiều Edge Node), giá trị này nên là mã Edge Node cụ thể thay vì
// tên service dùng chung.
const SERVICE_INSTANCE_NAME = process.env.SERVICE_INSTANCE_NAME || "iot-service-dev";

devicesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await devicesRepo.list(req.query.propertyId as string | undefined, req.query.roomId as string | undefined);
    res.json({ items, total: items.length, server: SERVICE_INSTANCE_NAME });
  })
);

const createSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  propertyId: z.string().min(1),
  roomId: z.string().min(1),
  deviceType: z.enum(["SWITCH", "AIRCON"]),
  name: z.string().min(1),
  // Cho phép ghép nối asset_code ngay lúc tạo (tuỳ chọn) — thay vì luôn phải
  // gọi thêm 1 request /pair riêng.
  assetCode: z.string().optional(),
});

devicesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const device = await devicesRepo.create(parsed.data);
    if (parsed.data.assetCode) {
      const paired = await devicesRepo.pairAssetCode(device.id, parsed.data.assetCode);
      return res.status(201).json(paired);
    }
    res.status(201).json(device);
  })
);

// Đặt TRƯỚC "/:id" để không bị route "/:id" nuốt mất path "by-asset-code".
devicesRouter.get(
  "/by-asset-code/:code",
  asyncHandler(async (req, res) => {
    const device = await devicesRepo.findByAssetCode(req.params.code);
    if (!device) throw Errors.notFound("thiết bị (asset_code)");
    res.json(device);
  })
);

devicesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const device = await devicesRepo.findById(req.params.id);
    if (!device) throw Errors.notFound("thiết bị");
    res.json(device);
  })
);

// "Ghép nối" (pair) 1 thiết bị vận hành thật ở đây với mã thiết bị chung
// (asset_code) do webadmin sinh ra khi khai báo tài sản — đây là bước LIÊN KẾT
// LOGIC giữa iot-service và webadmin.hardware_assets, xem
// webadmin/database/migrations/004_asset_monitoring.sql.
const pairSchema = z.object({ assetCode: z.string().min(1) });
devicesRouter.post(
  "/:id/pair",
  asyncHandler(async (req, res) => {
    const parsed = pairSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const device = await devicesRepo.findById(req.params.id);
    if (!device) throw Errors.notFound("thiết bị");
    const existing = await devicesRepo.findByAssetCode(parsed.data.assetCode);
    if (existing && existing.id !== device.id) {
      throw Errors.conflict("asset_code này đã được ghép nối với 1 thiết bị vận hành khác.");
    }
    const paired = await devicesRepo.pairAssetCode(device.id, parsed.data.assetCode);
    res.json(paired);
  })
);

// POST /devices/:id/heartbeat — mô phỏng thiết bị "gọi điện thoại" định kỳ báo
// còn sống. Ghi cộng dồn vào cửa sổ giờ hiện tại (device_heartbeats), KHÔNG
// lưu một dòng riêng cho từng lần gọi.
devicesRouter.post(
  "/:id/heartbeat",
  asyncHandler(async (req, res) => {
    const device = await devicesRepo.findById(req.params.id);
    if (!device) throw Errors.notFound("thiết bị");
    await devicesRepo.touchHeartbeat(device.id);
    const window = await heartbeatsRepo.record({
      tenantId: device.tenant_id,
      propertyId: device.property_id,
      deviceId: device.id,
      online: true,
      powerState: device.power_state,
    });
    res.status(200).json({ recorded: true, window });
  })
);

devicesRouter.get(
  "/:id/heartbeats",
  asyncHandler(async (req, res) => {
    const items = await heartbeatsRepo.listByDevice(req.params.id);
    res.json({ items, total: items.length });
  })
);
