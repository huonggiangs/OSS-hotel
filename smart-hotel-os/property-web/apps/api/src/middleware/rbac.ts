import { NextFunction, Request, Response } from "express";
import type { PropertyUserRole } from "../types/domain";
import { Errors } from "../utils/errors";

// requireRole — đối chiếu docs/PERMISSION_MATRIX.md ("Mọi endpoint API kiểm tra
// permission ở backend trước khi xử lý — không tin tưởng vào việc UI đã ẩn nút").
export function requireRole(...allowed: PropertyUserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(Errors.unauthorized());
    if (!allowed.includes(req.user.role)) return next(Errors.forbidden());
    next();
  };
}
