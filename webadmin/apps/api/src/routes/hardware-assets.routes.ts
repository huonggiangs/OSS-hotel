import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { hardwareAssetsRepo } from "../repositories/hardwareAssets.repo";

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
]);

const upsertSchema = z.object({
  assetType: assetTypeEnum,
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().min(1),
  supplierId: z.string().uuid().optional().nullable(),
  purchaseCost: z.number().nonnegative().optional(),
  purchasedAt: z.string().datetime().optional(),
  warrantyUntil: z.string().datetime().optional(),
  status: z.enum(["IN_STOCK", "DEPLOYED", "UNDER_WARRANTY_CLAIM", "RETIRED"]).default("IN_STOCK"),
  customerId: z.string().uuid().optional().nullable(),
  deviceIdExternal: z.string().optional(),
});

hardwareAssetsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await hardwareAssetsRepo.list({
      status: req.query.status as string | undefined,
      assetType: req.query.assetType as string | undefined,
      search: req.query.search as string | undefined,
    });
    res.json({ items, total: items.length });
  })
);

hardwareAssetsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const asset = await hardwareAssetsRepo.findById(req.params.id);
    if (!asset) throw Errors.notFound("thiết bị");
    const claims = await hardwareAssetsRepo.listWarrantyClaims(asset.id);
    res.json({ ...asset, warranty_claims: claims });
  })
);

hardwareAssetsRouter.post(
  "/",
  requireRole("SUPPLY_CHAIN", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());

    const existing = await hardwareAssetsRepo.findBySerial(parsed.data.serialNumber);
    if (existing) throw Errors.conflict("Số serial này đã tồn tại trong hệ thống.");

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
    const parsed = upsertSchema.partial().safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const asset = await hardwareAssetsRepo.update(req.params.id, parsed.data);
    await writeAuditLog({ req, action: "UPDATE_HARDWARE_ASSET", entityType: "hardware_asset", entityId: req.params.id, beforeData: existing, afterData: asset });
    res.json(asset);
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
