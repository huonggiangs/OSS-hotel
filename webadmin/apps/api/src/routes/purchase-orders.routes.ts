import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { purchaseOrdersRepo } from "../repositories/purchaseOrders.repo";

// Mua hàng/tồn kho chi tiết. Theo PERMISSION_MATRIX.md, module "Quản lý
// thiết bị/tồn kho" chỉ SUPPLY_CHAIN có quyền ghi (✓), các role khác chỉ
// xem (EXEC/OPS_SUPPORT/ACCOUNTANT: "Xem"). GET mở cho mọi role đăng nhập
// (đúng convention module hardware-assets/suppliers hiện có); ghi
// (POST/PATCH/DELETE) chỉ SUPPLY_CHAIN + SUPER_ADMIN.
export const purchaseOrdersRouter = Router();
purchaseOrdersRouter.use(requireAuth);

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
]);

purchaseOrdersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await purchaseOrdersRepo.list({
      status: req.query.status as string | undefined,
      supplierId: req.query.supplierId as string | undefined,
    });
    res.json({ items, total: items.length });
  })
);

purchaseOrdersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const po = await purchaseOrdersRepo.findById(req.params.id);
    if (!po) throw Errors.notFound("đơn mua hàng");
    const items = await purchaseOrdersRepo.listItems(po.id);
    res.json({ ...po, items });
  })
);

const createSchema = z.object({
  supplierId: z.string().uuid(),
  expectedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

purchaseOrdersRouter.post(
  "/",
  requireRole("SUPPLY_CHAIN", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const po = await purchaseOrdersRepo.create(parsed.data, req.user!.id);
    await writeAuditLog({ req, action: "CREATE_PURCHASE_ORDER", entityType: "purchase_order", entityId: po.id, afterData: po });
    res.status(201).json(po);
  })
);

const itemSchema = z.object({
  productName: z.string().min(1),
  assetType: assetTypeEnum.optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative().optional(),
});

purchaseOrdersRouter.post(
  "/:id/items",
  requireRole("SUPPLY_CHAIN", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const po = await purchaseOrdersRepo.findById(req.params.id);
    if (!po) throw Errors.notFound("đơn mua hàng");
    if (po.status !== "DRAFT") throw Errors.conflict("Chỉ thêm dòng hàng khi đơn còn ở trạng thái DRAFT.");

    const parsed = itemSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());

    const item = await purchaseOrdersRepo.addItem(po.id, parsed.data);
    await writeAuditLog({ req, action: "ADD_PURCHASE_ORDER_ITEM", entityType: "purchase_order_item", entityId: item.id, afterData: item });
    res.status(201).json(item);
  })
);

purchaseOrdersRouter.delete(
  "/:id/items/:itemId",
  requireRole("SUPPLY_CHAIN", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const po = await purchaseOrdersRepo.findById(req.params.id);
    if (!po) throw Errors.notFound("đơn mua hàng");
    if (po.status !== "DRAFT") throw Errors.conflict("Chỉ xoá dòng hàng khi đơn còn ở trạng thái DRAFT.");

    const item = await purchaseOrdersRepo.findItemById(req.params.itemId);
    if (!item || item.purchase_order_id !== po.id) throw Errors.notFound("dòng hàng");

    await purchaseOrdersRepo.removeItem(item.id);
    await writeAuditLog({ req, action: "REMOVE_PURCHASE_ORDER_ITEM", entityType: "purchase_order_item", entityId: item.id, beforeData: item });
    res.status(204).send();
  })
);

const statusSchema = z.object({ status: z.enum(["DRAFT", "ORDERED", "RECEIVED", "CANCELLED"]) });

purchaseOrdersRouter.patch(
  "/:id/status",
  requireRole("SUPPLY_CHAIN", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const existing = await purchaseOrdersRepo.findById(req.params.id);
    if (!existing) throw Errors.notFound("đơn mua hàng");

    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());

    const po = await purchaseOrdersRepo.changeStatus(req.params.id, parsed.data.status);
    await writeAuditLog({
      req,
      action: "CHANGE_PURCHASE_ORDER_STATUS",
      entityType: "purchase_order",
      entityId: req.params.id,
      beforeData: existing,
      afterData: po,
    });
    res.json(po);
  })
);
