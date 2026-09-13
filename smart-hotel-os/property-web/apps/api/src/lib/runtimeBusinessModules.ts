export type RuntimeBusinessModuleKey =
  | "IOT_CONTROL"
  | "MAINTENANCE_ASSETS"
  | "CRM_MARKETING"
  | "CHANNEL_MANAGER"
  | "REPORTING_VALUE";

export interface RuntimeBusinessModuleState {
  moduleKey: RuntimeBusinessModuleKey;
  enabled: boolean;
  disabledReason: string | null;
}

interface HqModuleSettings {
  items?: Array<{ moduleKey?: unknown; enabled?: unknown; disabledReason?: unknown }>;
}

export function normalizeRuntimeBusinessModules(stored: unknown): RuntimeBusinessModuleState[] {
  const settings = stored as HqModuleSettings | null;
  if (!Array.isArray(settings?.items)) return [];
  return settings.items.flatMap((item) => {
    if (typeof item.moduleKey !== "string" || typeof item.enabled !== "boolean") return [];
    return [{
      moduleKey: item.moduleKey as RuntimeBusinessModuleKey,
      enabled: item.enabled,
      disabledReason: typeof item.disabledReason === "string" ? item.disabledReason : null,
    }];
  });
}

export function isRuntimeBusinessModuleDisabled(stored: unknown, moduleKey: RuntimeBusinessModuleKey): boolean {
  return normalizeRuntimeBusinessModules(stored).some((item) => item.moduleKey === moduleKey && !item.enabled);
}
