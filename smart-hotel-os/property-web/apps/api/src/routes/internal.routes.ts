import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { pool } from "../lib/db";
import { requireAuth } from "../middleware/auth";
import { requireInternalServiceKey } from "../middleware/internalAuth";
import { ensureDefaultSettingsForProperty } from "../lib/settingsBootstrap";
import { settingsRepo } from "../repositories/settings.repo";

export const internalRouter = Router();

const propertyProvisionSchema = z.object({
  tenantId: z.string().trim().min(1).max(120),
  propertyName: z.string().trim().min(1).max(255),
  address: z.string().trim().max(500).optional().nullable(),
  phone: z.string().trim().max(60).optional().nullable(),
  owner: z.object({
    username: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9._-]+$/),
    email: z.string().email().max(320),
    fullName: z.string().trim().min(1).max(255),
    password: z.string().min(12).max(128),
    phone: z.string().trim().max(60).optional().nullable(),
  }),
});

/**
 * Provision idempotent một cơ sở + tài khoản OWNER từ HQ Console.
 * Need refs: N3,N4,N5 — nhucau.md. Mật khẩu chỉ đi qua request/response một
 * lần, không ghi vào log, settings hay bảng nghiệp vụ nào ngoài password_hash.
 */
internalRouter.post(
  "/provisioning/property",
  requireInternalServiceKey,
  asyncHandler(async (req, res) => {
    const parsed = propertyProvisionSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const input = parsed.data;
    const provisioned = await pool.transaction(async (tx) => {
      let property: { id: string; tenant_id: string; name: string; address: string | null; phone: string | null };
      let owner: { id: string; username: string; email: string; full_name: string; role: string };
      let credentialsCreated = false;
      const existingProperty = await tx.query<typeof property>(
        `SELECT id, tenant_id, name, address, phone FROM properties WHERE tenant_id = $1 ORDER BY created_at ASC LIMIT 1 FOR UPDATE`,
        [input.tenantId]
      );
      if (existingProperty.rows[0]) {
        const row = await tx.query<typeof property>(
          `UPDATE properties SET name = $2, address = $3, phone = $4, status = 'ACTIVE', updated_at = now() WHERE id = $1 RETURNING id, tenant_id, name, address, phone`,
          [existingProperty.rows[0].id, input.propertyName, input.address ?? null, input.phone ?? null]
        );
        property = row.rows[0];
      } else {
        const row = await tx.query<typeof property>(
          `INSERT INTO properties (id, tenant_id, name, address, phone, status) VALUES (gen_random_uuid()::text, $1, $2, $3, $4, 'ACTIVE') RETURNING id, tenant_id, name, address, phone`,
          [input.tenantId, input.propertyName, input.address ?? null, input.phone ?? null]
        );
        property = row.rows[0];
      }

      const existingOwner = await tx.query<typeof owner>(
        `SELECT id, username, email, full_name, role FROM property_users WHERE property_id = $1 AND role = 'OWNER' ORDER BY created_at ASC LIMIT 1 FOR UPDATE`,
        [property.id]
      );
      if (existingOwner.rows[0]) {
        owner = existingOwner.rows[0];
      } else {
        const conflictingUser = await tx.query<{ id: string }>(
          `SELECT id FROM property_users WHERE username = $1 OR email = $2 LIMIT 1`,
          [input.owner.username, input.owner.email]
        );
        if (conflictingUser.rows[0]) throw Errors.conflict("Username hoặc email OWNER đã tồn tại ở cơ sở khác.");
        const passwordHash = await bcrypt.hash(input.owner.password, 12);
        const row = await tx.query<typeof owner>(
          `INSERT INTO property_users (id, property_id, tenant_id, username, email, password_hash, full_name, role, status)
           VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, 'OWNER', 'ACTIVE')
           RETURNING id, username, email, full_name, role`,
          [property.id, property.tenant_id, input.owner.username, input.owner.email, passwordHash, input.owner.fullName]
        );
        owner = row.rows[0];
        credentialsCreated = true;
      }
      return { property, owner, credentialsCreated };
    });
    const { property, owner, credentialsCreated } = provisioned;

    await ensureDefaultSettingsForProperty(property.id, property.tenant_id);
    const existingBasic = await settingsRepo.get(property.id, "basic");
    const basic = existingBasic && typeof existingBasic === "object" ? existingBasic as Record<string, unknown> : {};
    const existingOwner = basic.owner && typeof basic.owner === "object" ? basic.owner as Record<string, unknown> : {};
    await settingsRepo.upsert(property.id, property.tenant_id, "basic", {
      ...basic,
      owner: { ...existingOwner, fullName: owner.full_name, email: owner.email, phone: input.owner.phone ?? "" },
    });
    res.json({
      property: { id: property.id, tenant_id: property.tenant_id, name: property.name, address: property.address, phone: property.phone },
      owner,
      credentials_created: credentialsCreated,
      setup_steps: ["Cập nhật thông tin cơ sở", "Thêm tầng và phòng", "Cài loại phòng và giá", "Gán asset_code cho thiết bị", "Kiểm thử Edge/IoT"],
    });
  })
);

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
