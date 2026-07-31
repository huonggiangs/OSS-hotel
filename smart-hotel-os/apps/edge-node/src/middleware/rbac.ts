import { NextFunction, Request, Response } from "express";
import type { PropertyUserRole } from "../types/domain";
import { Errors } from "../utils/errors";

export function requireRole(...allowed: PropertyUserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(Errors.unauthorized());
    if (!allowed.includes(req.user.role)) return next(Errors.forbidden());
    next();
  };
}
