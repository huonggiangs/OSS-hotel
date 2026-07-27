"use client";

import { useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api";

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  user?: { email: string; full_name: string } | null;
}

export default function AuditLogsPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ items: AuditLog[] }>("/api/v1/audit-logs")
      .then((res) => setItems(res.items))
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Không tải được audit log."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900">Audit log</h1>
      <p className="mt-1 text-sm text-gray-500">
        Ghi lại mọi thao tác quản trị nhạy cảm — chỉ SUPER_ADMIN và OPS_SUPPORT xem được.
      </p>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Thời gian</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Người thực hiện</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Hành động</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Đối tượng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Đang tải...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Chưa có audit log nào.</td></tr>}
            {items.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-2 text-gray-600">{new Date(log.created_at).toLocaleString("vi-VN")}</td>
                <td className="px-4 py-2 text-gray-600">{log.user?.full_name ?? "Hệ thống"}</td>
                <td className="px-4 py-2 font-mono text-xs text-gray-900">{log.action}</td>
                <td className="px-4 py-2 text-gray-600">
                  {log.entity_type}
                  {log.entity_id ? ` #${log.entity_id.slice(0, 8)}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
