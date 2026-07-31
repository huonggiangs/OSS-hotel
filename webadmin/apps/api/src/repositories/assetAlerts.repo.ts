import { pool } from "../lib/db";
import type { AssetAlert } from "../types/domain";

export const assetAlertsRepo = {
  /** Toàn bộ cảnh báo CHƯA resolve, kèm join tối thiểu để hiển thị nhanh (khối "Cảnh báo thiết bị" đầu trang). */
  async listUnresolved(): Promise<(AssetAlert & { asset_code: string; asset_type: string; property_name: string | null })[]> {
    const { rows } = await pool.query(
      `SELECT aa.*, ha.asset_code, ha.asset_type, ha.property_name
       FROM asset_alerts aa
       JOIN hardware_assets ha ON ha.id = aa.asset_id
       WHERE aa.resolved_at IS NULL
       ORDER BY aa.severity DESC, aa.created_at DESC`
    );
    return rows;
  },

  async listByAsset(assetId: string): Promise<AssetAlert[]> {
    const { rows } = await pool.query<AssetAlert>(
      `SELECT * FROM asset_alerts WHERE asset_id = $1 ORDER BY created_at DESC`,
      [assetId]
    );
    return rows;
  },

  /** Có cảnh báo CHƯA resolve cùng loại cho thiết bị này không — dùng để tránh sinh trùng lặp mỗi lần chạy job. */
  async hasUnresolvedOfType(assetId: string, alertType: string): Promise<boolean> {
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM asset_alerts WHERE asset_id = $1 AND alert_type = $2 AND resolved_at IS NULL LIMIT 1`,
      [assetId, alertType]
    );
    return rows.length > 0;
  },

  async create(input: { assetId: string; alertType: string; message: string; severity: string }): Promise<AssetAlert> {
    const { rows } = await pool.query<AssetAlert>(
      `INSERT INTO asset_alerts (id, asset_id, alert_type, message, severity)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4)
       RETURNING *`,
      [input.assetId, input.alertType, input.message, input.severity]
    );
    return rows[0];
  },

  /** Tự động resolve cảnh báo loại này nếu điều kiện không còn đúng nữa (vd: thiết bị online lại). */
  async resolveOpenOfType(assetId: string, alertType: string): Promise<void> {
    await pool.query(
      `UPDATE asset_alerts SET resolved_at = now() WHERE asset_id = $1 AND alert_type = $2 AND resolved_at IS NULL`,
      [assetId, alertType]
    );
  },

  async resolveById(id: string): Promise<AssetAlert | null> {
    const { rows } = await pool.query<AssetAlert>(
      `UPDATE asset_alerts SET resolved_at = now() WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0] ?? null;
  },
};
