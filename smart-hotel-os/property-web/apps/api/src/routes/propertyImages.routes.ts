import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { propertyImagesRepo } from "../repositories/propertyImages.repo";
import { roomTypesRepo } from "../repositories/roomTypes.repo";

export const propertyImagesRouter = Router();
propertyImagesRouter.use(requireAuth);

const imageSchema = z.object({
  roomTypeId: z.string().min(1).nullable(),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  dataUrl: z
    .string()
    .max(1_400_000)
    .refine((value) => /^data:image\/(png|jpeg|webp);base64,/.test(value), "Ảnh không đúng định dạng hỗ trợ."),
});

propertyImagesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await propertyImagesRepo.list(req.user!.propertyId);
    res.json({ items });
  })
);

propertyImagesRouter.post(
  "/",
  requireRole("OWNER", "MANAGER"),
  asyncHandler(async (req, res) => {
    const parsed = imageSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());

    if (parsed.data.roomTypeId) {
      const roomType = await roomTypesRepo.findById(req.user!.propertyId, parsed.data.roomTypeId);
      if (!roomType) throw Errors.notFound("loại phòng");
    }

    const image = await propertyImagesRepo.create({
      propertyId: req.user!.propertyId,
      tenantId: req.user!.tenantId,
      roomTypeId: parsed.data.roomTypeId,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      dataUrl: parsed.data.dataUrl,
      createdBy: req.user!.id,
    });
    await writeAuditLog({
      req,
      action: "CREATE_PROPERTY_IMAGE",
      entityType: "property_image",
      entityId: image.id,
      afterData: { ...image, data_url: "[IMAGE_DATA_OMITTED]" },
    });
    res.status(201).json(image);
  })
);
