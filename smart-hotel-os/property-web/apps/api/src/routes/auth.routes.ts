import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth, signAccessToken } from "../middleware/auth";
import { propertyUsersRepo } from "../repositories/propertyUsers.repo";
import { writeAuditLog } from "../middleware/audit";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());

    const { email, password } = parsed.data;
    const user = await propertyUsersRepo.findByEmail(email);
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

    // req.user chưa có tại đây (login chưa qua requireAuth) nên gán tay trước khi ghi
    // audit log, để log ra đúng property_id — an toàn vì user vừa xác thực mật khẩu
    // thành công ở trên.
    req.user = { id: user.id, email: user.email, role: user.role, propertyId: user.property_id, tenantId: user.tenant_id };
    await writeAuditLog({ req, action: "LOGIN", entityType: "property_user", entityId: user.id });

    res.json({
      access_token: token,
      user: {
        id: user.id,
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
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      status: user.status,
      property_id: user.property_id,
      tenant_id: user.tenant_id,
    });
  })
);
