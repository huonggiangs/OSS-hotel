import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Errors } from "../utils/errors";
import type { PropertyUserRole } from "../types/domain";

// AuthUser gắn vào req.user sau khi verify JWT — cùng shape với
// property-web/apps/api/src/middleware/auth.ts để 2 hệ thống có thể dùng
// chung code phía client nếu muốn (không bắt buộc — xem README.md mục
// "Quyết định xác thực").
export interface AuthUser {
  id: string;
  email: string;
  role: PropertyUserRole;
  propertyId: string;
  tenantId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// QUYẾT ĐỊNH XÁC THỰC (xem README.md): Edge Node có vòng đời JWT ĐỘC LẬP với
// Cloud property-web — không bắt buộc phải trùng JWT_SECRET. Nếu người vận
// hành muốn token issue ở Cloud dùng lại được tại Edge Node (và ngược lại),
// đặt CÙNG giá trị JWT_SECRET ở 2 nơi — đơn giản, không cần thêm cơ chế gì
// khác vì cùng thuật toán HS256 + cùng payload shape.
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
        return "dev-only-insecure-edge-node-secret-do-not-use-in-production";
      })());
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET chưa được cấu hình trong biến môi trường.");
}

export function signAccessToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET as string, { expiresIn: "12h" });
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
