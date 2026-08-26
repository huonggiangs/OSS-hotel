import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ApiError, Errors } from "../utils/errors";
import type { PropertyUserRole } from "../types/domain";
import { isRequestIpAllowed } from "./ipAllowlist";

// AuthUser gắn vào req.user sau khi verify JWT — CHỨA propertyId/tenantId vì
// property_users luôn thuộc về đúng 1 property (đúng nguyên tắc multi-tenant ở
// RULES.md/SYSTEM_ARCHITECTURE.md: mọi truy vấn nghiệp vụ phải lọc theo property_id,
// không tin dữ liệu client gửi lên).
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

// Ở môi trường production BẮT BUỘC phải cấu hình JWT_SECRET (throw để chặn khởi
// động nếu quên). Ở dev/local (NODE_ENV khác "production") — vd. người dùng chạy
// `npm run dev` chế độ embedded không tạo file .env — dùng giá trị mặc định kèm
// cảnh báo, để "chỉ cần npm run dev" là chạy được ngay, không cần thêm bước nào.
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
  return jwt.sign(user, JWT_SECRET as string, { expiresIn: "12h" });
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(Errors.unauthorized());
  }
  const token = header.slice("Bearer ".length);
  let payload: AuthUser;
  try {
    payload = jwt.verify(token, JWT_SECRET as string) as AuthUser;
  } catch {
    return next(Errors.unauthorized());
  }
  req.user = payload;
  try {
    if (!(await isRequestIpAllowed(req, payload.propertyId))) {
      return next(new ApiError(403, "IP_NOT_ALLOWED", "IP hiện tại không nằm trong danh sách được phép."));
    }
    next();
  } catch (error) {
    next(error);
  }
}
