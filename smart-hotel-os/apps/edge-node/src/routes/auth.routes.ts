import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth, signAccessToken } from "../middleware/auth";
import { propertyUsersRepo } from "../repositories/propertyUsers.repo";

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// POST /login — đăng nhập cục bộ tại Edge Node, hoạt động HOÀN TOÀN OFFLINE
// (không gọi ra ngoài). Dùng property_users lưu tại chính Edge Node — được
// seed sẵn lúc bootstrap + cập nhật hồ sơ (không phải mật khẩu) qua pull-sync.
// Đây chính là cơ chế cho phép "máy hỏng vẫn dùng máy khác/điện thoại được
// ngay" (CLAUDE.md) — bất kỳ thiết bị nào trong LAN đăng nhập vào Edge Node
// đều dùng chung 1 trạng thái, không phụ thuộc máy tính cụ thể nào.
authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());

    const { username, password } = parsed.data;
    const user = await propertyUsersRepo.findByUsernameOrEmail(username);
    if (!user || user.status !== "ACTIVE") throw Errors.invalidCredentials();

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw Errors.invalidCredentials();

    const token = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      propertyId: user.property_id,
      tenantId: user.tenant_id,
    });

    res.json({
      access_token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        property_id: user.property_id,
        tenant_id: user.tenant_id,
      },
    });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await propertyUsersRepo.findById(req.user!.id);
    if (!user) throw Errors.notFound("người dùng");
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      status: user.status,
      property_id: user.property_id,
      tenant_id: user.tenant_id,
    });
  })
);
