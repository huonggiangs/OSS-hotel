import { roomsRepo } from "./rooms.repo";
import { bookingsRepo } from "./bookings.repo";
import { customersRepo } from "./customers.repo";
import { propertyUsersRepo } from "./propertyUsers.repo";
import { invoicesRepo } from "./invoices.repo";
import { expensesRepo } from "./expenses.repo";
import { pool } from "../lib/db";

const THIRTY_DAY_FINANCIAL_SQL = `
  WITH days AS (
    SELECT generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day')::date AS day
  ), revenue AS (
    SELECT paid_at::date AS day, SUM(amount) AS amount
    FROM invoices
    WHERE property_id = $1 AND status = 'PAID' AND paid_at >= CURRENT_DATE - INTERVAL '29 days'
    GROUP BY paid_at::date
  ), costs AS (
    SELECT expense_date AS day, SUM(amount) AS amount
    FROM expenses
    WHERE property_id = $1 AND expense_date >= CURRENT_DATE - INTERVAL '29 days'
    GROUP BY expense_date
  )
  SELECT days.day::text AS date,
         COALESCE(revenue.amount, 0)::text AS revenue,
         COALESCE(costs.amount, 0)::text AS expense
  FROM days
  LEFT JOIN revenue ON revenue.day = days.day
  LEFT JOIN costs ON costs.day = days.day
  ORDER BY days.day ASC`;

// Trả về đúng nhóm dữ liệu mà DashboardOverview cần cho 4 thẻ KPI đầu trang
// (Tổng số đặt phòng / Công suất phòng / Nhân sự đang hoạt động / Tổng số khách
// hàng) + phân bổ loại phòng/trạng thái đặt phòng để vẽ 2 biểu đồ donut — tính
// TRỰC TIẾP từ dữ liệu thật trong DB, không phải số liệu trang trí như bản mock.
export const dashboardRepo = {
  async summary(propertyId: string) {
    const [
      totalRooms,
      roomStatusBreakdown,
      roomTypeBreakdown,
      totalBookings,
      bookingStatusBreakdown,
      totalCustomers,
      activeStaff,
      paidToday,
      expenseTotal,
      financialDaily,
      incomeByMethod,
      expenseByCategory,
      bookingPeriod,
      bookingRoomTypeBreakdown,
      recentActivity,
      recentCustomers,
    ] =
      await Promise.all([
        roomsRepo.countTotal(propertyId),
        roomsRepo.statusBreakdown(propertyId),
        roomsRepo.typeBreakdown(propertyId),
        bookingsRepo.countTotal(propertyId),
        bookingsRepo.statusBreakdown(propertyId),
        customersRepo.countTotal(propertyId),
        propertyUsersRepo.countActiveByProperty(propertyId),
        invoicesRepo.sumPaidToday(propertyId),
        expensesRepo.sumTotal(propertyId),
        pool.query<{ date: string; revenue: string; expense: string }>(THIRTY_DAY_FINANCIAL_SQL, [propertyId]),
        pool.query<{ method: string; amount: string }>(
          `SELECT method, SUM(amount)::text AS amount
           FROM invoices
           WHERE property_id = $1 AND status = 'PAID' AND paid_at >= CURRENT_DATE - INTERVAL '29 days'
           GROUP BY method ORDER BY SUM(amount) DESC`,
          [propertyId]
        ),
        pool.query<{ category: string; amount: string }>(
          `SELECT category, SUM(amount)::text AS amount
           FROM expenses
           WHERE property_id = $1 AND expense_date >= CURRENT_DATE - INTERVAL '29 days'
           GROUP BY category ORDER BY SUM(amount) DESC`,
          [propertyId]
        ),
        pool.query<{ month_count: string; week_count: string }>(
          `SELECT COUNT(*) FILTER (WHERE checkin_date >= date_trunc('month', CURRENT_DATE))::text AS month_count,
                  COUNT(*) FILTER (WHERE checkin_date >= date_trunc('week', CURRENT_DATE))::text AS week_count
           FROM bookings WHERE property_id = $1 AND status <> 'CANCELLED'`,
          [propertyId]
        ),
        pool.query<{ type_name: string; count: string }>(
          `SELECT rt.name AS type_name, COUNT(*)::text AS count
           FROM bookings b
           JOIN rooms r ON r.id = b.room_id
           JOIN room_types rt ON rt.id = r.room_type_id
           WHERE b.property_id = $1 AND b.status <> 'CANCELLED'
           GROUP BY rt.name ORDER BY COUNT(*) DESC`,
          [propertyId]
        ),
        pool.query<{ action: string; entity_type: string; actor: string | null; created_at: Date }>(
          `SELECT a.action, a.entity_type, u.full_name AS actor, a.created_at
           FROM audit_log a
           LEFT JOIN property_users u ON u.id = a.user_id
           WHERE a.property_id = $1
           ORDER BY a.created_at DESC LIMIT 5`,
          [propertyId]
        ),
        pool.query<{ full_name: string; email: string | null; phone: string | null; created_at: Date }>(
          `SELECT full_name, email, phone, created_at FROM customers
           WHERE property_id = $1 ORDER BY created_at DESC LIMIT 5`,
          [propertyId]
        ),
      ]);

    const occupied = roomStatusBreakdown.find((r) => r.status === "OCCUPIED")?.count ?? 0;
    const occupancyRate = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;

    return {
      total_bookings: totalBookings,
      occupancy_rate_pct: occupancyRate,
      active_staff: activeStaff,
      total_customers: totalCustomers,
      total_rooms: totalRooms,
      room_status_breakdown: roomStatusBreakdown,
      room_type_breakdown: roomTypeBreakdown,
      booking_status_breakdown: bookingStatusBreakdown,
      revenue_paid_today: paidToday,
      expense_total: expenseTotal,
      financial_daily: financialDaily.rows.map((item) => ({ ...item, revenue: Number(item.revenue), expense: Number(item.expense) })),
      income_by_method: incomeByMethod.rows.map((item) => ({ ...item, amount: Number(item.amount) })),
      expense_by_category: expenseByCategory.rows.map((item) => ({ ...item, amount: Number(item.amount) })),
      bookings_this_month: Number(bookingPeriod.rows[0]?.month_count ?? 0),
      bookings_this_week: Number(bookingPeriod.rows[0]?.week_count ?? 0),
      booking_room_type_breakdown: bookingRoomTypeBreakdown.rows.map((item) => ({ ...item, count: Number(item.count) })),
      recent_activity: recentActivity.rows,
      recent_customers: recentCustomers.rows,
    };
  },

  async gantt(propertyId: string) {
    const [items, rooms] = await Promise.all([bookingsRepo.listForGantt(propertyId), roomsRepo.list(propertyId)]);
    return { items, rooms };
  },

  // Kế toán đêm (/night-audit) — 4 KPI đối soát cuối ngày, tính trực tiếp từ
  // invoices/rooms thật (không phải số liệu trang trí). "Chênh lệch đối soát"
  // = 0 luôn cho MVP này vì hệ thống chỉ có 1 nguồn ghi nhận doanh thu
  // (invoices) — chưa có sổ sách kế toán độc lập thứ hai để so khớp.
  async nightAudit(propertyId: string) {
    const [invoicesToday, roomRevenueToday] = await Promise.all([
      invoicesRepo.listToday(propertyId),
      invoicesRepo.sumPaidToday(propertyId),
    ]);
    return {
      invoices_issued_today: invoicesToday.length,
      room_revenue_today: roomRevenueToday,
      service_revenue_today: 0,
      reconciliation_diff: 0,
      invoices_today: invoicesToday,
    };
  },
};
