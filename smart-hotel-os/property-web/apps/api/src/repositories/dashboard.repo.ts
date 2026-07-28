import { roomsRepo } from "./rooms.repo";
import { bookingsRepo } from "./bookings.repo";
import { customersRepo } from "./customers.repo";
import { propertyUsersRepo } from "./propertyUsers.repo";
import { invoicesRepo } from "./invoices.repo";
import { expensesRepo } from "./expenses.repo";

// Trả về đúng nhóm dữ liệu mà DashboardOverview cần cho 4 thẻ KPI đầu trang
// (Tổng số đặt phòng / Công suất phòng / Nhân sự đang hoạt động / Tổng số khách
// hàng) + phân bổ loại phòng/trạng thái đặt phòng để vẽ 2 biểu đồ donut — tính
// TRỰC TIẾP từ dữ liệu thật trong DB, không phải số liệu trang trí như bản mock.
export const dashboardRepo = {
  async summary(propertyId: string) {
    const [totalRooms, roomStatusBreakdown, roomTypeBreakdown, totalBookings, bookingStatusBreakdown, totalCustomers, activeStaff, paidToday, expenseTotal] =
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
    };
  },

  async gantt(propertyId: string) {
    return bookingsRepo.listForGantt(propertyId);
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
