import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { propertyUsersRepo } from "../repositories/propertyUsers.repo";

// "/users" — Người dùng & phân quyền cấp cơ sở, nối vào bảng property_users đã
// có sẵn (không tạo bảng mới). RBAC: chỉ OWNER/MANAGER được xem VÀ sửa (đúng
// yêu cầu nhiệm vụ — khác các route đọc khác vốn cho phép mọi vai trò xem,
// danh sách người dùng/lương/phân quyền là dữ liệu nhạy cảm nên hạn chế đọc
// luôn, không chỉ hạn chế ghi).
export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole("OWNER", "MANAGER"));

const createSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.enum(["OWNER", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING"]),
  password: z.string().min(6).optional(),
});

const updateSchema = z.object({
  role: z.enum(["OWNER", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING"]).optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

usersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const [items, roleCounts] = await Promise.all([
      propertyUsersRepo.listByProperty(req.user!.propertyId),
      propertyUsersRepo.countByRole(req.user!.propertyId),
    ]);
    // Không trả password_hash ra ngoài.
    const safeItems = items.map(({ password_hash, ...rest }) => rest);
    res.json({ items: safeItems, total: safeItems.length, role_counts: roleCounts });
  })
);

usersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    // Mật khẩu tạm nếu không truyền — tương tự cách webadmin xử lý reset
    // password (trả 1 lần trong response, chưa có email service để gửi).
    const tempPassword = parsed.data.password ?? `Anio${Math.floor(1000 + Math.random() * 9000)}!`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const user = await propertyUsersRepo.create(req.user!.propertyId, req.user!.tenantId, {
      username: parsed.data.username,
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      role: parsed.data.role,
      passwordHash,
    });
    await writeAuditLog({ req, action: "CREATE_PROPERTY_USER", entityType: "property_user", entityId: user.id, afterData: { ...user, password_hash: undefined } });
    const { password_hash, ...safeUser } = user;
    res.status(201).json({ ...safeUser, temp_password: parsed.data.password ? undefined : tempPassword });
  })
);

usersRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await propertyUsersRepo.findById(req.params.id);
    if (!existing || existing.property_id !== req.user!.propertyId) throw Errors.notFound("người dùng");
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const updated = await propertyUsersRepo.updateRoleStatus(req.user!.propertyId, req.params.id, parsed.data);
    await writeAuditLog({
      req,
      action: "UPDATE_PROPERTY_USER",
      entityType: "property_user",
      entityId: req.params.id,
      beforeData: { role: existing.role, status: existing.status },
      afterData: parsed.data,
    });
    const { password_hash, ...safeUser } = updated!;
    res.json(safeUser);
  })
);
