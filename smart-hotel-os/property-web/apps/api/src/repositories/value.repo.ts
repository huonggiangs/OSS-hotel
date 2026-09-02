import { randomUUID } from "node:crypto";
import { pool } from "../lib/db";

export type ValueEventType = "ENERGY_SAVED" | "LABOR_SAVED" | "LOSS_PREVENTED" | "ADDITIONAL_REVENUE";
export type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";

function periodBounds(from?: string, to?: string) {
  const safeFrom = from && !Number.isNaN(Date.parse(from)) ? from : new Date(Date.now() - 29 * 86400000).toISOString();
  const safeTo = to && !Number.isNaN(Date.parse(to)) ? to : new Date().toISOString();
  return [safeFrom, safeTo];
}

export const valueRepo = {
  async ensureSystemAlerts(propertyId: string, tenantId: string) {
    const [edges, maintenance] = await Promise.all([
      pool.query<{ edge_node_id: string; last_seen_at: Date }>(
        `SELECT edge_node_id, last_seen_at FROM edge_node_heartbeats WHERE property_id = $1 AND last_seen_at < now() - INTERVAL '5 minutes'`, [propertyId]
      ),
      pool.query<{ id: string; priority: string; category: string; room_number: string; created_at: Date }>(
        `SELECT mr.id, mr.priority, mr.category, r.number AS room_number, mr.created_at
         FROM maintenance_requests mr JOIN rooms r ON r.id = mr.room_id
         WHERE mr.property_id = $1 AND mr.status IN ('OPEN','IN_PROGRESS')`, [propertyId]
      ),
    ]);
    await Promise.all([
      ...edges.rows.map((edge) => this.createAlert({
        propertyId, tenantId, alertType: "EDGE_HEARTBEAT", severity: "CRITICAL",
        title: `Edge ${edge.edge_node_id} mất heartbeat`, message: `Heartbeat cuối lúc ${new Date(edge.last_seen_at).toLocaleString("vi-VN")}. Kiểm tra mạng và outbox trước khi điều khiển thiết bị.`,
        sourceType: "EDGE", sourceId: edge.edge_node_id, dueAt: new Date(Date.now() + 15 * 60_000).toISOString(), idempotencyKey: `edge-stale-${edge.edge_node_id}`,
      })),
      ...maintenance.rows.map((item) => this.createAlert({
        propertyId, tenantId, alertType: "MAINTENANCE_SLA", severity: item.priority === "URGENT" ? "CRITICAL" : item.priority === "HIGH" ? "HIGH" : "MEDIUM",
        title: `Bảo trì phòng ${item.room_number}: ${item.category}`, message: "Phiếu bảo trì chưa hoàn tất; cập nhật người xử lý và thời điểm hoàn thành.", sourceType: "MAINTENANCE", sourceId: item.id,
        dueAt: new Date(new Date(item.created_at).getTime() + (item.priority === "URGENT" ? 60 : item.priority === "HIGH" ? 240 : 1440) * 60_000).toISOString(), idempotencyKey: `maintenance-${item.id}`,
      })),
    ]);
  },

  async dashboard(propertyId: string, from?: string, to?: string) {
    const property = await pool.query<{ tenant_id: string }>(`SELECT tenant_id FROM properties WHERE id = $1`, [propertyId]);
    if (property.rows[0]) await this.ensureSystemAlerts(propertyId, property.rows[0].tenant_id);
    const [fromAt, toAt] = periodBounds(from, to);
    const [financial, energy, value, alerts, maintenance, automation, edge] = await Promise.all([
      pool.query<{ revenue: string; expense: string }>(
        `SELECT
           (SELECT COALESCE(SUM(amount), 0)::text FROM invoices WHERE property_id = $1 AND status = 'PAID' AND paid_at >= $2::timestamptz AND paid_at <= $3::timestamptz) AS revenue,
           (SELECT COALESCE(SUM(amount), 0)::text FROM expenses WHERE property_id = $1 AND expense_date >= $2::date AND expense_date <= $3::date) AS expense`,
        [propertyId, fromAt, toAt]
      ),
      pool.query<{ energy_kwh: string; energy_cost_vnd: string }>(
        `SELECT COALESCE(SUM(kwh), 0)::text AS energy_kwh, COALESCE(SUM(cost_vnd), 0)::text AS energy_cost_vnd
         FROM energy_readings WHERE property_id = $1 AND measured_at >= $2::timestamptz AND measured_at <= $3::timestamptz`,
        [propertyId, fromAt, toAt]
      ),
      pool.query<{ event_type: ValueEventType; amount_vnd: string }>(
        `SELECT event_type, COALESCE(SUM(amount_vnd), 0)::text AS amount_vnd
         FROM value_ledger WHERE property_id = $1 AND occurred_at >= $2::timestamptz AND occurred_at <= $3::timestamptz
         GROUP BY event_type`,
        [propertyId, fromAt, toAt]
      ),
      pool.query<{ open_count: string; overdue_count: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE status IN ('OPEN','ACKNOWLEDGED'))::text AS open_count,
           COUNT(*) FILTER (WHERE status IN ('OPEN','ACKNOWLEDGED') AND due_at IS NOT NULL AND due_at < now())::text AS overdue_count
         FROM operational_alerts WHERE property_id = $1`,
        [propertyId]
      ),
      pool.query<{ open_count: string; urgent_count: string }>(
        `SELECT COUNT(*) FILTER (WHERE status IN ('OPEN','IN_PROGRESS'))::text AS open_count,
                COUNT(*) FILTER (WHERE status IN ('OPEN','IN_PROGRESS') AND priority IN ('HIGH','URGENT'))::text AS urgent_count
         FROM maintenance_requests WHERE property_id = $1`,
        [propertyId]
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM audit_log
         WHERE property_id = $1 AND created_at >= $2::timestamptz AND created_at <= $3::timestamptz
           AND action IN ('TOGGLE_ROOM_POWER','TOGGLE_DEVICE_POWER','CHECKIN_BOOKING','CHECKOUT_BOOKING','GUEST_LEFT_ROOM','GUEST_RETURNED_ROOM','COMPLETE_HOUSEKEEPING')`,
        [propertyId, fromAt, toAt]
      ),
      pool.query<{ stale_count: string }>(
        `SELECT COUNT(*) FILTER (WHERE last_seen_at < now() - INTERVAL '5 minutes')::text AS stale_count
         FROM edge_node_heartbeats WHERE property_id = $1`,
        [propertyId]
      ),
    ]);

    const revenue = Number(financial.rows[0]?.revenue ?? 0);
    const expense = Number(financial.rows[0]?.expense ?? 0);
    const byType = Object.fromEntries(value.rows.map((item) => [item.event_type, Number(item.amount_vnd)])) as Partial<Record<ValueEventType, number>>;
    const cvg = (byType.ENERGY_SAVED ?? 0) + (byType.LABOR_SAVED ?? 0) + (byType.LOSS_PREVENTED ?? 0) + (byType.ADDITIONAL_REVENUE ?? 0);
    return {
      from: fromAt,
      to: toAt,
      revenue_vnd: revenue,
      expense_vnd: expense,
      profit_vnd: revenue - expense,
      energy_kwh: Number(energy.rows[0]?.energy_kwh ?? 0),
      energy_cost_vnd: Number(energy.rows[0]?.energy_cost_vnd ?? 0),
      energy_savings_vnd: byType.ENERGY_SAVED ?? 0,
      labor_savings_vnd: byType.LABOR_SAVED ?? 0,
      loss_prevented_vnd: byType.LOSS_PREVENTED ?? 0,
      additional_revenue_vnd: byType.ADDITIONAL_REVENUE ?? 0,
      cvg_vnd: cvg,
      service_fee_vnd: 0,
      value_multiple: null,
      open_alerts: Number(alerts.rows[0]?.open_count ?? 0),
      overdue_alerts: Number(alerts.rows[0]?.overdue_count ?? 0),
      open_maintenance: Number(maintenance.rows[0]?.open_count ?? 0),
      urgent_maintenance: Number(maintenance.rows[0]?.urgent_count ?? 0),
      automation_actions: Number(automation.rows[0]?.count ?? 0),
      stale_edge_nodes: Number(edge.rows[0]?.stale_count ?? 0),
    };
  },

  async createEnergyReading(input: {
    propertyId: string; tenantId: string; roomId?: string | null; deviceId?: string | null; assetCode?: string | null;
    measuredAt: string; kwh: number; costVnd?: number; source: "MANUAL" | "IOT" | "IMPORT"; idempotencyKey: string; note?: string | null;
  }) {
    const { rows } = await pool.query(
      `INSERT INTO energy_readings (id, property_id, tenant_id, room_id, device_id, asset_code, measured_at, kwh, cost_vnd, source, idempotency_key, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (property_id, idempotency_key) DO UPDATE SET note = EXCLUDED.note
       RETURNING *`,
      [randomUUID(), input.propertyId, input.tenantId, input.roomId ?? null, input.deviceId ?? null, input.assetCode ?? null,
        input.measuredAt, input.kwh, input.costVnd ?? 0, input.source, input.idempotencyKey, input.note ?? null]
    );
    return rows[0];
  },

  async createValueEvent(input: {
    propertyId: string; tenantId: string; createdBy?: string; eventType: ValueEventType; amountVnd: number;
    sourceType: string; sourceId?: string | null; occurredAt?: string; idempotencyKey: string; note?: string | null;
  }) {
    const { rows } = await pool.query(
      `INSERT INTO value_ledger (id, property_id, tenant_id, event_type, amount_vnd, source_type, source_id, occurred_at, idempotency_key, note, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::timestamptz, now()),$9,$10,$11)
       ON CONFLICT (property_id, idempotency_key) DO UPDATE SET note = EXCLUDED.note
       RETURNING *`,
      [randomUUID(), input.propertyId, input.tenantId, input.eventType, input.amountVnd, input.sourceType, input.sourceId ?? null,
        input.occurredAt ?? null, input.idempotencyKey, input.note ?? null, input.createdBy ?? null]
    );
    return rows[0];
  },

  async listAlerts(propertyId: string, status?: AlertStatus) {
    const property = await pool.query<{ tenant_id: string }>(`SELECT tenant_id FROM properties WHERE id = $1`, [propertyId]);
    if (property.rows[0]) await this.ensureSystemAlerts(propertyId, property.rows[0].tenant_id);
    const params: string[] = [propertyId];
    let where = "WHERE property_id = $1";
    if (status) { params.push(status); where += " AND status = $2"; }
    const { rows } = await pool.query(`SELECT * FROM operational_alerts ${where} ORDER BY CASE WHEN status IN ('OPEN','ACKNOWLEDGED') THEN 0 ELSE 1 END, due_at NULLS LAST, created_at DESC`, params);
    return rows;
  },

  async createAlert(input: {
    propertyId: string; tenantId: string; alertType: string; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    title: string; message: string; sourceType: string; sourceId?: string | null; assetCode?: string | null; dueAt?: string | null; idempotencyKey?: string | null;
  }) {
    const { rows } = await pool.query(
      `INSERT INTO operational_alerts (id, property_id, tenant_id, alert_type, severity, title, message, source_type, source_id, asset_code, due_at, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (property_id, idempotency_key) DO UPDATE SET message = EXCLUDED.message, updated_at = now()
       RETURNING *`,
      [randomUUID(), input.propertyId, input.tenantId, input.alertType, input.severity, input.title, input.message, input.sourceType,
        input.sourceId ?? null, input.assetCode ?? null, input.dueAt ?? null, input.idempotencyKey ?? null]
    );
    return rows[0];
  },

  async updateAlert(propertyId: string, id: string, status: AlertStatus) {
    const { rows } = await pool.query(
      `UPDATE operational_alerts SET status = $3,
         acknowledged_at = CASE WHEN $3 = 'ACKNOWLEDGED' AND acknowledged_at IS NULL THEN now() ELSE acknowledged_at END,
         resolved_at = CASE WHEN $3 IN ('RESOLVED','DISMISSED') THEN now() ELSE resolved_at END,
         updated_at = now()
       WHERE property_id = $1 AND id = $2 RETURNING *`, [propertyId, id, status]
    );
    return rows[0] ?? null;
  },
};
