import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { fetchMobileConnections } from "../lib/propertyWebClient";
import { asyncHandler } from "../utils/asyncHandler";

export const mobileConnectionsRouter = Router();
mobileConnectionsRouter.use(requireAuth, requireRole("SUPER_ADMIN", "OPS_SUPPORT"));

mobileConnectionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await fetchMobileConnections({
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      search: typeof req.query.search === "string" ? req.query.search : undefined,
    });
    res.json(data);
  })
);
