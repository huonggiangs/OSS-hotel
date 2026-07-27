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

const JWT_SECRET = process.env.JWT_SECRET;
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
