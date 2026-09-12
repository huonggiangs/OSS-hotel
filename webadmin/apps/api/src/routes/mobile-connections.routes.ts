import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { fetchMobileConnections, updateMobileConnection } from "../lib/propertyWebClient";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";

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

const actionSchema = z.object({ note: z.string().trim().max(500).optional() });

mobileConnectionsRouter.post(
  "/:id/revoke",
  asyncHandler(async (req, res) => {
    const parsed = actionSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    if (!req.user) throw Errors.unauthorized();
    const result = await updateMobileConnection(req.params.id, {
      hqUserId: req.user.id,
      note: parsed.data.note,
    });
    await writeAuditLog({
      req,
      action: "REVOKE_MOBILE_CONNECTION",
      entityType: "mobile_connection",
      entityId: req.params.id,
      afterData: result,
    });
    res.json(result);
  })
);
