import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/errors";
import { settingsRepo } from "../repositories/settings.repo";
import { normalizeRuntimeBusinessModules, type RuntimeBusinessModuleKey } from "../lib/runtimeBusinessModules";

export async function getRuntimeBusinessModules(propertyId: string): Promise<Array<{ moduleKey: RuntimeBusinessModuleKey; enabled: boolean; disabledReason: string | null }>> {
  return normalizeRuntimeBusinessModules(await settingsRepo.get(propertyId, "hq_modules"));
}

/** Mặc định cho phép nếu HQ chưa từng đồng bộ, bảo toàn vận hành offline. */
export function requireModuleEnabled(moduleKey: RuntimeBusinessModuleKey) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) return next(new ApiError(401, "UNAUTHORIZED", "Thiếu hoặc token không hợp lệ."));
      const items = await getRuntimeBusinessModules(req.user.propertyId);
      const state = items.find((item) => item.moduleKey === moduleKey);
      if (state?.enabled === false) {
        return next(new ApiError(503, "MODULE_DISABLED", state.disabledReason
          ? `Chức năng đang tạm tắt: ${state.disabledReason}`
          : "Chức năng đang được HQ tạm tắt."));
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
