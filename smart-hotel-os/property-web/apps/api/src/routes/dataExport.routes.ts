import { Router } from "express";
import { pool } from "../lib/db";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { roomsRepo } from "../repositories/rooms.repo";
import { roomTypesRepo } from "../repositories/roomTypes.repo";
import { customersRepo } from "../repositories/customers.repo";
import { bookingsRepo } from "../repositories/bookings.repo";
import { invoicesRepo } from "../repositories/invoices.repo";
import { expensesRepo } from "../repositories/expenses.repo";
import { devicesRepo } from "../repositories/devices.repo";

export const dataExportRouter = Router();
dataExportRouter.use(requireAuth);

// "Xuất dữ liệu" — trả về TOÀN BỘ dữ liệu nghiệp vụ của property hiện tại dưới
// dạng 1 file JSON để khách hàng tự tải về lưu trữ (yêu cầu chủ khách sạn: "cho
// phép khách hàng lưu lại cơ sở dữ liệu của mình"). Đây là export dữ liệu THẬT
// (không phải bản sao lưu hạ tầng — không có cron/cloud storage đứng sau, xem
// ghi chú ở db/page.tsx phía frontend). Chỉ OWNER/MANAGER được xuất (dữ liệu
// nhạy cảm: khách hàng, doanh thu...).
dataExportRouter.get(
  "/",
  requireRole("OWNER", "MANAGER"),
  asyncHandler(async (req, res) => {
    const propertyId = req.user!.propertyId;

    const [propertyRows, roomTypes, rooms, customers, bookings, invoices, expenses, devices, propertyUsersResult, propertySettingsResult] = await Promise.all([
      pool.query(`SELECT * FROM properties WHERE id = $1`, [propertyId]),
      roomTypesRepo.list(propertyId),
      roomsRepo.list(propertyId),
      customersRepo.list(propertyId),
      bookingsRepo.list(propertyId),
      invoicesRepo.list(propertyId),
      expensesRepo.list(propertyId),
      devicesRepo.list(propertyId),
      // Cố tình KHÔNG select password_hash — dữ liệu xuất ra là file khách hàng
      // tự tải về máy, tuyệt đối không được chứa mật khẩu (dù đã hash).
      pool.query(
        `SELECT id, username, email, full_name, role, status, created_at FROM property_users WHERE property_id = $1`,
        [propertyId]
      ),
      pool.query(`SELECT * FROM property_settings WHERE property_id = $1`, [propertyId]),
    ]);

    const exportDoc = {
      exportedAt: new Date().toISOString(),
      property: propertyRows.rows[0] ?? null,
      roomTypes,
      rooms,
      customers,
      bookings,
      invoices,
      expenses,
      devices,
      propertyUsers: propertyUsersResult.rows,
      propertySettings: propertySettingsResult.rows,
    };

    const fileDate = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Disposition", `attachment; filename="export-${propertyId}-${fileDate}.json"`);

    // Không lưu toàn bộ dữ liệu xuất vào audit log (quá lớn, trùng lặp với
    // chính file tải về) — chỉ ghi lại danh sách bảng đã xuất để có bằng chứng
    // "ai đã xuất dữ liệu, lúc nào".
    await writeAuditLog({
      req,
      action: "EXPORT_PROPERTY_DATA",
      entityType: "property",
      entityId: propertyId,
      afterData: {
        tables: ["property", "roomTypes", "rooms", "customers", "bookings", "invoices", "expenses", "devices", "propertyUsers", "propertySettings"],
      },
    });

    res.json(exportDoc);
  })
);
