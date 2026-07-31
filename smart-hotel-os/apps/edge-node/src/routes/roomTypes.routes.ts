import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { roomTypesRepo } from "../repositories/roomTypes.repo";

export const roomTypesRouter = Router();
roomTypesRouter.use(requireAuth);

roomTypesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await roomTypesRepo.list(req.user!.propertyId);
    res.json({ items, total: items.length });
  })
);
