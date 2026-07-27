import { pool } from "../lib/db";

export const dashboardRepo = {
  async summary() {
    const [
      partnerCount,
      activePartnerCount,
      supplierCount,
      customerCount,
      customersBoth,
      hardwareByStatus,
      pendingCommissionCount,
      openTickets,
    ] = await Promise.all([
      pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM partners`),
      pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM partners WHERE status = 'ACTIVE'`),
      pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM suppliers`),
      pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM customers_unified`),
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM customers_unified WHERE uses_kiosk = true AND uses_smart_hotel_os = true`
      ),
      pool.query<{ status: string; count: string }>(
        `SELECT status, COUNT(*)::text AS count FROM hardware_assets GROUP BY status`
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM commission_records WHERE status IN ('CALCULATED','PENDING_APPROVAL')`
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM customer_support_tickets WHERE status IN ('OPEN','IN_PROGRESS')`
      ),
    ]);

    return {
      partners: { total: Number(partnerCount.rows[0]?.count ?? 0), active: Number(activePartnerCount.rows[0]?.count ?? 0) },
      suppliers: { total: Number(supplierCount.rows[0]?.count ?? 0) },
      customers: {
        total: Number(customerCount.rows[0]?.count ?? 0),
        using_both_products: Number(customersBoth.rows[0]?.count ?? 0),
      },
      hardware_assets_by_status: hardwareByStatus.rows.map((r) => ({ status: r.status, count: Number(r.count) })),
      commissions_pending_review: Number(pendingCommissionCount.rows[0]?.count ?? 0),
      support_tickets_open: Number(openTickets.rows[0]?.count ?? 0),
    };
  },
};
