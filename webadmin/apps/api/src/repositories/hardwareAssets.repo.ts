import { pool } from "../lib/db";
import type { HardwareAsset, WarrantyClaim } from "../types/domain";

export interface HardwareAssetInput {
  assetType: string;
  brand?: string | null;
  model?: string | null;
  serialNumber: string;
  supplierId?: string | null;
  purchaseCost?: number | null;
  purchasedAt?: string | null;
  warrantyUntil?: string | null;
  status?: string;
  customerId?: string | null;
  deviceIdExternal?: string | null;
  // ---- Migration 004 ----
  activatedAt?: string | null;
  supportingPartnerId?: string | null;
  connectivityProvider?: string | null;
  subscriptionFee?: number | null;
  subscriptionCycle?: string | null;
  connectedServer?: string | null;
  propertyId?: string | null;
  propertyName?: string | null;
  parentAssetId?: string | null;
  installationLocation?: string | null;
  description?: string | null;
  deactivatedAt?: string | null;
  deactivationReason?: string | null;
}

export const hardwareAssetsRepo = {
  async list(opts: {
    status?: string;
    assetType?: string;
    search?: string;
    propertyId?: string;
    connectionStatus?: string;
    parentAssetId?: string | null;
  }): Promise<HardwareAsset[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (opts.status) {
      params.push(opts.status);
      clauses.push(`status = $${params.length}`);
    }
    if (opts.assetType) {
      params.push(opts.assetType);
      clauses.push(`asset_type = $${params.length}`);
    }
    if (opts.search) {
      params.push(`%${opts.search}%`);
      clauses.push(`(serial_number ILIKE $${params.length} OR asset_code ILIKE $${params.length})`);
    }
    if (opts.propertyId) {
      params.push(opts.propertyId);
      clauses.push(`property_id = $${params.length}`);
    }
    if (opts.connectionStatus) {
      params.push(opts.connectionStatus);
      clauses.push(`connection_status = $${params.length}`);
    }
    if (opts.parentAssetId !== undefined) {
      if (opts.parentAssetId === null) {
        clauses.push(`parent_asset_id IS NULL`);
      } else {
        params.push(opts.parentAssetId);
        clauses.push(`parent_asset_id = $${params.length}`);
      }
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await pool.query<HardwareAsset>(
      `SELECT * FROM hardware_assets ${where} ORDER BY created_at DESC`,
      params
    );
    return rows;
  },

  async findById(id: string): Promise<HardwareAsset | null> {
    const { rows } = await pool.query<HardwareAsset>(`SELECT * FROM hardware_assets WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async findBySerial(serialNumber: string): Promise<HardwareAsset | null> {
    const { rows } = await pool.query<HardwareAsset>(`SELECT * FROM hardware_assets WHERE serial_number = $1`, [serialNumber]);
    return rows[0] ?? null;
  },

  async findByAssetCode(assetCode: string): Promise<HardwareAsset | null> {
    const { rows } = await pool.query<HardwareAsset>(`SELECT * FROM hardware_assets WHERE asset_code = $1`, [assetCode]);
    return rows[0] ?? null;
  },

  /** Danh sách thiết bị phụ trợ gắn vào 1 thiết bị chính (vd: máy in/máy quét gắn vào Kiosk). */
  async listChildren(parentAssetId: string): Promise<HardwareAsset[]> {
    const { rows } = await pool.query<HardwareAsset>(
      `SELECT * FROM hardware_assets WHERE parent_asset_id = $1 ORDER BY created_at ASC`,
      [parentAssetId]
    );
    return rows;
  },

  /** Sinh asset_code mới, dạng AST-XXXXXX — atomic qua nextval(), không cần transaction riêng. */
  async nextAssetCode(): Promise<string> {
    const { rows } = await pool.query<{ code: string }>(
      `SELECT 'AST-' || LPAD(nextval('hardware_assets_asset_code_seq')::text, 6, '0') AS code`
    );
    return rows[0].code;
  },

  async create(input: HardwareAssetInput): Promise<HardwareAsset> {
    const assetCode = await this.nextAssetCode();
    const { rows } = await pool.query<HardwareAsset>(
      `INSERT INTO hardware_assets
        (id, asset_type, brand, model, serial_number, supplier_id, purchase_cost, purchased_at, warranty_until, status,
         customer_id, device_id_external, asset_code, activated_at, supporting_partner_id, connectivity_provider,
         subscription_fee, subscription_cycle, connected_server, property_id, property_name, parent_asset_id,
         installation_location, description, deactivated_at, deactivation_reason)
       VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
       RETURNING *`,
      [
        input.assetType,
        input.brand ?? null,
        input.model ?? null,
        input.serialNumber,
        input.supplierId ?? null,
        input.purchaseCost ?? null,
        input.purchasedAt ?? null,
        input.warrantyUntil ?? null,
        input.status ?? "IN_STOCK",
        input.customerId ?? null,
        input.deviceIdExternal ?? null,
        assetCode,
        input.activatedAt ?? null,
        input.supportingPartnerId ?? null,
        input.connectivityProvider ?? null,
        input.subscriptionFee ?? null,
        input.subscriptionCycle ?? null,
        input.connectedServer ?? null,
        input.propertyId ?? null,
        input.propertyName ?? null,
        input.parentAssetId ?? null,
        input.installationLocation ?? null,
        input.description ?? null,
        input.deactivatedAt ?? null,
        input.deactivationReason ?? null,
      ]
    );
    return rows[0];
  },

  async update(id: string, input: Partial<HardwareAssetInput>): Promise<HardwareAsset | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, unknown> = {
      asset_type: input.assetType,
      brand: input.brand,
      model: input.model,
      serial_number: input.serialNumber,
      supplier_id: input.supplierId,
      purchase_cost: input.purchaseCost,
      purchased_at: input.purchasedAt,
      warranty_until: input.warrantyUntil,
      status: input.status,
      customer_id: input.customerId,
      device_id_external: input.deviceIdExternal,
      activated_at: input.activatedAt,
      supporting_partner_id: input.supportingPartnerId,
      connectivity_provider: input.connectivityProvider,
      subscription_fee: input.subscriptionFee,
      subscription_cycle: input.subscriptionCycle,
      connected_server: input.connectedServer,
      property_id: input.propertyId,
      property_name: input.propertyName,
      parent_asset_id: input.parentAssetId,
      installation_location: input.installationLocation,
      description: input.description,
      deactivated_at: input.deactivatedAt,
      deactivation_reason: input.deactivationReason,
    };
    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        params.push(val);
        fields.push(`${col} = $${params.length}`);
      }
    }
    if (fields.length === 0) return this.findById(id);
    params.push(id);
    const { rows } = await pool.query<HardwareAsset>(
      `UPDATE hardware_assets SET ${fields.join(", ")}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
      params
    );
    return rows[0] ?? null;
  },

  async activate(id: string): Promise<HardwareAsset | null> {
    const { rows } = await pool.query<HardwareAsset>(
      `UPDATE hardware_assets SET status = 'DEPLOYED', activated_at = COALESCE(activated_at, now()), deactivated_at = NULL, deactivation_reason = NULL, updated_at = now() WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0] ?? null;
  },

  async deactivate(id: string, reason: string): Promise<HardwareAsset | null> {
    const { rows } = await pool.query<HardwareAsset>(
      `UPDATE hardware_assets SET status = 'INACTIVE', deactivated_at = now(), deactivation_reason = $2, updated_at = now() WHERE id = $1 RETURNING *`,
      [id, reason]
    );
    return rows[0] ?? null;
  },

  /**
   * Cập nhật trạng thái kết nối từ dữ liệu vận hành thật của iot-service —
   * KHÔNG nhập tay được qua PATCH thường (xem hardware-assets.routes.ts,
   * upsertSchema không có connection_status/disconnect_count/last_seen_at).
   */
  async updateConnectionState(
    id: string,
    input: {
      connectionStatus: string;
      disconnectCount: number;
      lastSeenAt: string | null;
      connectedServer: string | null;
    }
  ): Promise<HardwareAsset | null> {
    const { rows } = await pool.query<HardwareAsset>(
      `UPDATE hardware_assets
       SET connection_status = $2, disconnect_count = $3, last_seen_at = $4, connected_server = $5,
           last_connection_check_at = now(), updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, input.connectionStatus, input.disconnectCount, input.lastSeenAt, input.connectedServer]
    );
    return rows[0] ?? null;
  },

  /** Chỉ cập nhật mốc "đã kiểm tra kết nối" khi không tìm thấy thiết bị khớp asset_code bên iot-service. */
  async touchConnectionCheck(id: string): Promise<void> {
    await pool.query(`UPDATE hardware_assets SET last_connection_check_at = now(), updated_at = now() WHERE id = $1`, [id]);
  },

  async createWarrantyClaim(hardwareAssetId: string, issueDescription: string, cost?: number): Promise<WarrantyClaim> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query<WarrantyClaim>(
        `INSERT INTO warranty_claims (id, hardware_asset_id, issue_description, cost)
         VALUES (gen_random_uuid()::text, $1, $2, $3)
         RETURNING *`,
        [hardwareAssetId, issueDescription, cost ?? null]
      );
      await client.query(`UPDATE hardware_assets SET status = 'UNDER_WARRANTY_CLAIM', updated_at = now() WHERE id = $1`, [
        hardwareAssetId,
      ]);
      await client.query("COMMIT");
      return rows[0];
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  async listWarrantyClaims(hardwareAssetId: string): Promise<WarrantyClaim[]> {
    const { rows } = await pool.query<WarrantyClaim>(
      `SELECT * FROM warranty_claims WHERE hardware_asset_id = $1 ORDER BY created_at DESC`,
      [hardwareAssetId]
    );
    return rows;
  },
};
