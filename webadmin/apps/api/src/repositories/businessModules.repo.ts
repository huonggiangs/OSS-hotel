import { pool } from "../lib/db";
import type { BusinessModuleKey, CustomerBusinessModule } from "../types/domain";

export const businessModulesRepo = {
  async ensureForCustomer(customerId: string): Promise<void> {
    await pool.query(
      `INSERT INTO customer_business_modules (customer_id, module_key, enabled)
       SELECT $1, module_key, true FROM business_module_catalog
       ON CONFLICT (customer_id, module_key) DO NOTHING`,
      [customerId]
    );
  },

  async list(customerId: string): Promise<CustomerBusinessModule[]> {
    await this.ensureForCustomer(customerId);
    const { rows } = await pool.query<CustomerBusinessModule>(
      `SELECT cbm.*, catalog.name, catalog.description, catalog.pms_route_scope,
              catalog.display_order, catalog.can_disable_completely
       FROM customer_business_modules cbm
       JOIN business_module_catalog catalog ON catalog.module_key = cbm.module_key
       WHERE cbm.customer_id = $1
       ORDER BY catalog.display_order`,
      [customerId]
    );
    return rows;
  },

  async setEnabled(input: {
    customerId: string;
    moduleKey: BusinessModuleKey;
    enabled: boolean;
    reason?: string | null;
    actorId: string;
  }): Promise<CustomerBusinessModule | null> {
    await this.ensureForCustomer(input.customerId);
    const { rows } = await pool.query<CustomerBusinessModule>(
      `UPDATE customer_business_modules cbm
       SET enabled = $3,
           disabled_reason = CASE WHEN $3 THEN NULL ELSE $4 END,
           updated_by = $5,
           sync_status = 'PENDING',
           last_sync_error = NULL,
           updated_at = now()
       FROM business_module_catalog catalog
       WHERE cbm.customer_id = $1 AND cbm.module_key = $2
         AND catalog.module_key = cbm.module_key
         AND catalog.can_disable_completely = true
       RETURNING cbm.*, catalog.name, catalog.description, catalog.pms_route_scope,
                 catalog.display_order, catalog.can_disable_completely`,
      [input.customerId, input.moduleKey, input.enabled, input.reason ?? null, input.actorId]
    );
    return rows[0] ?? null;
  },

  async markSync(customerId: string, result: { ok: boolean; error?: string | null }): Promise<void> {
    await pool.query(
      `UPDATE customer_business_modules
       SET sync_status = $2,
           last_sync_at = CASE WHEN $2 = 'SYNCED' THEN now() ELSE last_sync_at END,
           last_sync_error = $3,
           updated_at = now()
       WHERE customer_id = $1`,
      [customerId, result.ok ? "SYNCED" : "FAILED", result.error?.slice(0, 1000) ?? null]
    );
  },
};
