"use client";

import { useCallback, useEffect, useState } from "react";
import { api, isApiError } from "./api-client";

// Hook dùng chung cho các màn hình Cài đặt dạng form cấu hình — đọc/ghi 1 blob
// JSON qua GET/PUT /api/v1/settings/:group (bảng property_settings, xem lý do
// kiến trúc ở database/migrations/003_property_settings.sql). Dùng chung 1 hook
// để 18 màn hình Cài đặt không phải viết lặp lại logic loading/error/save.
export function useSettings<T>(group: string, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ group: string; data: T }>(`/api/v1/settings/${group}`);
      const hasData =
        res.data !== null &&
        res.data !== undefined &&
        (Array.isArray(res.data) ? res.data.length > 0 : Object.keys(res.data as object).length > 0);
      setData(hasData ? res.data : fallback);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không tải được cấu hình.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (next: T) => {
      setSaving(true);
      setError(null);
      try {
        const res = await api.put<{ group: string; data: T }>(`/api/v1/settings/${group}`, { data: next });
        setData(res.data);
        setSavedAt(Date.now());
        return res.data;
      } catch (err) {
        setError(isApiError(err) ? err.message : "Lưu cấu hình thất bại.");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [group]
  );

  return { data, setData, loading, saving, error, savedAt, save, reload: load };
}
