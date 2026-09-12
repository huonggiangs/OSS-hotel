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
import { mobileConnectionsRepo } from "../repositories/mobileConnections.repo";

export const internalRouter = Router();

const propertyProvisionSchema = z.object({
  tenantId: z.string().trim().min(1).max(120),
  propertyName: z.string().trim().min(1).max(255),
  address: z.string().trim().max(500).optional().nullable(),
  phone: z.string().trim().max(60).refine((value) => value.replace(/\D/g, "").length >= 6, "Số điện thoại phải có ít nhất 6 chữ số."),
  owner: z.object({
    username: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9._-]+$/),
    email: z.string().email().max(320),
    fullName: z.string().trim().min(1).max(255),
    password: z.string().min(12).max(128),
    phone: z.string().trim().max(60).optional().nullable(),
  }),
});

const propertyCodeFromPhone = (phone: string) => phone.replace(/\D/g, "").slice(-6);

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
    const propertyCode = propertyCodeFromPhone(input.phone);
    const provisioned = await pool.transaction(async (tx) => {
      let property: { id: string; tenant_id: string; name: string; address: string | null; phone: string; login_code: string };
      let owner: { id: string; username: string; email: string; full_name: string; role: string };
      let credentialsCreated = false;
      const existingProperty = await tx.query<typeof property>(
        `SELECT id, tenant_id, name, address, phone, login_code FROM properties WHERE tenant_id = $1 ORDER BY created_at ASC LIMIT 1 FOR UPDATE`,
        [input.tenantId]
      );
      if (existingProperty.rows[0]) {
        const row = await tx.query<typeof property>(
          `UPDATE properties SET name = $2, address = $3, phone = $4, login_code = $5, status = 'ACTIVE', updated_at = now() WHERE id = $1 RETURNING id, tenant_id, name, address, phone, login_code`,
          [existingProperty.rows[0].id, input.propertyName, input.address ?? null, input.phone, propertyCode]
        );
        property = row.rows[0];
      } else {
        const row = await tx.query<typeof property>(
          `INSERT INTO properties (id, tenant_id, name, address, phone, login_code, status) VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, 'ACTIVE') RETURNING id, tenant_id, name, address, phone, login_code`,
          [input.tenantId, input.propertyName, input.address ?? null, input.phone, propertyCode]
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
          `SELECT id FROM property_users WHERE email = $2 OR (property_id = $3 AND lower(username) = lower($1)) LIMIT 1`,
          [input.owner.username, input.owner.email, property.id]
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
      property: { id: property.id, tenant_id: property.tenant_id, name: property.name, address: property.address, phone: property.phone, login_code: property.login_code },
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

const mobileConnectionActionSchema = z.object({
  hqUserId: z.string().trim().min(1).max(120),
  note: z.string().trim().max(500).optional(),
});

// Thiết bị được tự động ghi nhận sau khi đăng nhập đúng. HQ chỉ giám sát và
// thu hồi phiên khi mất thiết bị/nghi ngờ truy cập; secret không bao giờ lộ ra.
internalRouter.get(
  "/mobile-connections",
  requireInternalServiceKey,
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" && req.query.status ? req.query.status : undefined;
    const search = typeof req.query.search === "string" && req.query.search ? req.query.search : undefined;
    const items = await mobileConnectionsRepo.list({ status, search });
    res.json({
      items: items.map(({ request_secret_hash: _secret, ...item }) => item),
      total: items.length,
      pending: items.filter((item) => item.status === "PENDING").length,
    });
  })
);

// HQ chỉ đọc metadata tài khoản để bàn giao/hỗ trợ; tuyệt đối không trả
// password_hash hoặc dữ liệu xác thực thiết bị.
internalRouter.get(
  "/pms-users",
  requireInternalServiceKey,
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT pu.id, pu.property_id, pu.tenant_id, pu.username, pu.email,
              pu.full_name, pu.role::text, pu.status::text, pu.created_at,
              p.name AS property_name, p.login_code AS property_code
       FROM property_users pu
       JOIN properties p ON p.id = pu.property_id
       ORDER BY p.name, pu.created_at`
    );
    res.json({ items: rows, total: rows.length });
  })
);

internalRouter.post(
  "/mobile-connections/:id/revoke",
  requireInternalServiceKey,
  asyncHandler(async (req, res) => {
    const parsed = mobileConnectionActionSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const existing = await mobileConnectionsRepo.findById(req.params.id);
    if (!existing) throw Errors.notFound("thiết bị đăng nhập");
    if (existing.status !== "APPROVED") throw Errors.conflict("Chỉ có thể thu hồi thiết bị đang kết nối.");
    const updated = await mobileConnectionsRepo.setStatus(req.params.id, "REVOKED", parsed.data.hqUserId, parsed.data.note);
    if (!updated) throw Errors.notFound("thiết bị đăng nhập");
    const { request_secret_hash: _secret, ...safe } = updated;
    res.json(safe);
  })
);
