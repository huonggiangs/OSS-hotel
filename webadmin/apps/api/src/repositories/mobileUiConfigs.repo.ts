import { randomUUID } from "node:crypto";
import { pool } from "../lib/db";
import type { AppKey } from "../types/domain";

export type MobileUiConfigStatus = "DRAFT" | "READY_FOR_RELEASE" | "RELEASED" | "ARCHIVED";

export interface MobileUiConfiguration {
  id: string;
  app_key: AppKey;
  name: string;
  config: unknown;
  status: MobileUiConfigStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export const mobileUiConfigsRepo = {
  async list(appKey?: AppKey): Promise<MobileUiConfiguration[]> {
    const { rows } = await pool.query<MobileUiConfiguration>(
      `SELECT * FROM mobile_ui_configurations ${appKey ? "WHERE app_key = $1" : ""} ORDER BY updated_at DESC`,
      appKey ? [appKey] : []
    );
    return rows;
  },

  async findById(id: string): Promise<MobileUiConfiguration | null> {
    const { rows } = await pool.query<MobileUiConfiguration>(`SELECT * FROM mobile_ui_configurations WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async create(input: { appKey: AppKey; name: string; config: unknown; actorId: string }): Promise<MobileUiConfiguration> {
    const { rows } = await pool.query<MobileUiConfiguration>(
      `INSERT INTO mobile_ui_configurations (id, app_key, name, config, status, created_by, updated_by)
       VALUES ($1,$2,$3,$4::jsonb,'DRAFT',$5,$5) RETURNING *`,
      [randomUUID(), input.appKey, input.name, JSON.stringify(input.config), input.actorId]
    );
    return rows[0];
  },

  async update(id: string, input: { name?: string; config?: unknown; status?: MobileUiConfigStatus; actorId: string }): Promise<MobileUiConfiguration | null> {
    const fields: string[] = ["updated_by = $2", "updated_at = now()"];
    const values: unknown[] = [id, input.actorId];
    if (input.name !== undefined) { values.push(input.name); fields.push(`name = $${values.length}`); }
    if (input.config !== undefined) { values.push(JSON.stringify(input.config)); fields.push(`config = $${values.length}::jsonb`); }
    if (input.status !== undefined) { values.push(input.status); fields.push(`status = $${values.length}`); }
    const { rows } = await pool.query<MobileUiConfiguration>(`UPDATE mobile_ui_configurations SET ${fields.join(", ")} WHERE id = $1 RETURNING *`, values);
    return rows[0] ?? null;
  },

  async markReleased(id: string, actorId: string): Promise<void> {
    await pool.query(`UPDATE mobile_ui_configurations SET status = 'RELEASED', updated_by = $2, updated_at = now() WHERE id = $1`, [id, actorId]);
  },
};
