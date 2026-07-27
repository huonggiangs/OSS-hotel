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
}

export const hardwareAssetsRepo = {
  async list(opts: { status?: string; assetType?: string; search?: string }): Promise<HardwareAsset[]> {
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
      clauses.push(`serial_number ILIKE $${params.length}`);
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

  async create(input: HardwareAssetInput): Promise<HardwareAsset> {
    const { rows } = await pool.query<HardwareAsset>(
      `INSERT INTO hardware_assets
        (id, asset_type, brand, model, serial_number, supplier_id, purchase_cost, purchased_at, warranty_until, status, customer_id, device_id_external)
       VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
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
