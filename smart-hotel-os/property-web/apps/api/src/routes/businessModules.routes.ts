import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { getRuntimeBusinessModules } from "../middleware/moduleAvailability";

export const businessModulesRouter = Router();
businessModulesRouter.use(requireAuth);

businessModulesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await getRuntimeBusinessModules(req.user!.propertyId);
    res.json({ items, source: items.length ? "HQ" : "DEFAULT_ENABLED" });
  })
);
