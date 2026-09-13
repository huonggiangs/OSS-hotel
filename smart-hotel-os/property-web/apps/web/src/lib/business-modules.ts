"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "./api-client";

export type BusinessModuleKey = "IOT_CONTROL" | "MAINTENANCE_ASSETS" | "CRM_MARKETING" | "CHANNEL_MANAGER" | "REPORTING_VALUE";
export interface BusinessModuleState { moduleKey: BusinessModuleKey; enabled: boolean; disabledReason: string | null }

export function useBusinessModules() {
  const [items, setItems] = useState<BusinessModuleState[]>([]);
  useEffect(() => {
    api.get<{ items: BusinessModuleState[] }>("/api/v1/business-modules")
      .then((response) => setItems(response.items))
      .catch(() => setItems([]));
  }, []);
  const byKey = useMemo(() => new Map(items.map((item) => [item.moduleKey, item])), [items]);
  return {
    items,
    isEnabled: (key: BusinessModuleKey) => byKey.get(key)?.enabled !== false,
    state: (key: BusinessModuleKey) => byKey.get(key),
  };
}
