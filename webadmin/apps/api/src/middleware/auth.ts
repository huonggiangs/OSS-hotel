import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Errors } from "../utils/errors";
import type { UserRole } from "../types/domain";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Ở môi trường production BẮT BUỘC phải cấu hình JWT_SECRET (throw để chặn khởi
// động nếu quên). Ở dev/local (NODE_ENV khác "production") — vd. người dùng chạy
// `npm run dev` chế độ embedded không tạo file .env — dùng giá trị mặc định kèm
// cảnh báo, để "chỉ cần npm run dev" là chạy được ngay, không cần thêm bước nào.
// Giống hệt cách `smart-hotel-os/property-web/apps/api/src/middleware/auth.ts`
// đã làm.
const JWT_SECRET =
  process.env.JWT_SECRET ??
  (process.env.NODE_ENV === "production"
    ? undefined
    : (() => {
        // eslint-disable-next-line no-console
        console.warn(
          "[auth] JWT_SECRET chưa được cấu hình — dùng giá trị mặc định CHỈ DÀNH CHO DEV. " +
            "Đổi biến môi trường JWT_SECRET trước khi dùng cho môi trường thật."
        );
        return "dev-only-insecure-default-secret-do-not-use-in-production";
      })());
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET chưa được cấu hình trong biến môi trường.");
}

export function signAccessToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET as string, { expiresIn: "1h" });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(Errors.unauthorized());
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, JWT_SECRET as string) as AuthUser;
    req.user = payload;
    next();
  } catch {
    next(Errors.unauthorized());
  }
}
