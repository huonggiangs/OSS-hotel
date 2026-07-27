import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth, signAccessToken } from "../middleware/auth";
import { usersRepo } from "../repositories/users.repo";

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
    const user = await usersRepo.findByEmail(email);
    if (!user || user.status !== "ACTIVE") throw Errors.invalidCredentials();

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw Errors.invalidCredentials();

    const token = signAccessToken({ id: user.id, email: user.email, role: user.role });
    res.json({
      access_token: token,
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
    });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await usersRepo.findById(req.user!.id);
    if (!user) throw Errors.notFound("người dùng");
    res.json({ id: user.id, email: user.email, full_name: user.full_name, role: user.role, status: user.status });
  })
);
