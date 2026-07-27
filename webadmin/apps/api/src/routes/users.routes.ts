import { randomBytes } from "node:crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { usersRepo } from "../repositories/users.repo";
import type { User } from "../types/domain";

// Quản lý user/role qua UI — theo PERMISSION_MATRIX.md: "Quản lý user/role
// HQ Console: ✓ (SUPER_ADMIN only)". Toàn bộ router này chỉ SUPER_ADMIN gọi
// được, kể cả GET (khác các module khác vốn mở GET cho mọi role đăng nhập —
// vì danh sách user là dữ liệu nhạy cảm nhất trong hệ thống).
export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole("SUPER_ADMIN"));

const roleEnum = z.enum(["SUPER_ADMIN", "OPS_SUPPORT", "SALES_MANAGER", "ACCOUNTANT", "SUPPLY_CHAIN", "RELEASE_MANAGER"]);

function omitPasswordHash(user: User): Omit<User, "password_hash"> {
  const { password_hash: _passwordHash, ...safe } = user;
  return safe;
}

usersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const items = await usersRepo.list();
    res.json({ items: items.map(omitPasswordHash), total: items.length });
  })
);

const createSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  role: roleEnum,
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự."),
});

usersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());

    const existing = await usersRepo.findByEmail(parsed.data.email);
    if (existing) throw Errors.conflict("Email này đã có tài khoản trong hệ thống.");

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const user = await usersRepo.create({
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      role: parsed.data.role,
      passwordHash,
    });
    await writeAuditLog({ req, action: "CREATE_USER", entityType: "user", entityId: user.id, afterData: omitPasswordHash(user) });
    res.status(201).json(omitPasswordHash(user));
  })
);

const updateSchema = z.object({
  role: roleEnum.optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  fullName: z.string().min(1).optional(),
});

usersRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await usersRepo.findById(req.params.id);
    if (!existing) throw Errors.notFound("người dùng");

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());

    // Không cho tự khoá chính tài khoản đang đăng nhập — tránh tự khoá mình
    // ngoài hệ thống nếu đây là SUPER_ADMIN duy nhất.
    if (existing.id === req.user!.id && parsed.data.status === "DISABLED") {
      throw Errors.conflict("Không thể tự khoá tài khoản đang đăng nhập.");
    }

    const user = await usersRepo.update(req.params.id, parsed.data);
    await writeAuditLog({
      req,
      action: "UPDATE_USER",
      entityType: "user",
      entityId: req.params.id,
      beforeData: omitPasswordHash(existing),
      afterData: user ? omitPasswordHash(user) : null,
    });
    res.json(user ? omitPasswordHash(user) : null);
  })
);

usersRouter.post(
  "/:id/reset-password",
  asyncHandler(async (req, res) => {
    const existing = await usersRepo.findById(req.params.id);
    if (!existing) throw Errors.notFound("người dùng");

    // Sinh mật khẩu tạm ngẫu nhiên, trả về DUY NHẤT MỘT LẦN trong response.
    // Chưa có dịch vụ gửi email trong MVP này (xem PROGRESS.md) nên
    // SUPER_ADMIN phải tự truyền lại mật khẩu tạm cho người dùng qua kênh
    // khác (điện thoại, chat nội bộ...). Không lưu lại dạng plaintext.
    const tempPassword = randomBytes(6).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await usersRepo.updatePasswordHash(req.params.id, passwordHash);
    await writeAuditLog({ req, action: "RESET_USER_PASSWORD", entityType: "user", entityId: req.params.id });

    res.json({ temporary_password: tempPassword });
  })
);
