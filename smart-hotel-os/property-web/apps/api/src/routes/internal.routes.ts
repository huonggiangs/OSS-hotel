import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { pool } from "../lib/db";
import { requireAuth } from "../middleware/auth";
import { requireInternalServiceKey } from "../middleware/internalAuth";

export const internalRouter = Router();

const edgeHeartbeatSchema = z.object({
  edgeNodeId: z.string().trim().min(1).max(120),
  propertyId: z.string().min(1),
  tenantId: z.string().min(1),
  cloudReachable: z.boolean(),
  pendingOutboxCount: z.number().int().min(0).max(1_000_000).default(0),
  lastSyncAt: z.string().datetime().nullable().optional(),
  lastSyncError: z.string().max(2_000).nullable().optional(),
  details: z.record(z.unknown()).default({}),
});

internalRouter.post(
  "/edge-heartbeats",
  requireInternalServiceKey,
  asyncHandler(async (req, res) => {
    const parsed = edgeHeartbeatSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const input = parsed.data;
    const { rows: propertyRows } = await pool.query<{ id: string }>(`SELECT id FROM properties WHERE id = $1 AND tenant_id = $2`, [input.propertyId, input.tenantId]);
    if (!propertyRows[0]) throw Errors.notFound("cơ sở của Edge Node");
    const { rows } = await pool.query(
      `INSERT INTO edge_node_heartbeats
        (edge_node_id, property_id, tenant_id, cloud_reachable, pending_outbox_count, last_sync_at, last_sync_error, details, last_seen_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,now())
       ON CONFLICT (edge_node_id) DO UPDATE SET
         property_id = EXCLUDED.property_id, tenant_id = EXCLUDED.tenant_id, cloud_reachable = EXCLUDED.cloud_reachable,
         pending_outbox_count = EXCLUDED.pending_outbox_count, last_sync_at = EXCLUDED.last_sync_at,
         last_sync_error = EXCLUDED.last_sync_error, details = EXCLUDED.details, last_seen_at = now(), updated_at = now()
       RETURNING *`,
      [input.edgeNodeId, input.propertyId, input.tenantId, input.cloudReachable, input.pendingOutboxCount, input.lastSyncAt ?? null, input.lastSyncError ?? null, JSON.stringify(input.details)]
    );
    res.json(rows[0]);
  })
);

// Màn hình PMS dùng endpoint này để giám sát trực tiếp Node đã đăng ký cho
// chính cơ sở của mình; không tiết lộ heartbeat của cơ sở/tenant khác.
internalRouter.get(
  "/edge-status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT * FROM edge_node_heartbeats WHERE property_id = $1 ORDER BY last_seen_at DESC LIMIT 10`,
      [req.user!.propertyId]
    );
    res.json({ items: rows, total: rows.length });
  })
);
