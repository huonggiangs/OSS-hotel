"use client";

import { useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

interface CommissionRecord {
  id: string;
  partner_id: string;
  period: string;
  amount: string;
  status: string;
}

export default function CommissionsPage() {
  const [items, setItems] = useState<CommissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ items: CommissionRecord[] }>("/api/v1/commissions/records");
      setItems(res.items);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Không tải được danh sách hoa hồng.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/api/v1/commissions/records/${id}/approve`);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Duyệt hoa hồng thất bại.");
    } finally {
      setBusyId(null);
    }
  }

  async function markPaid(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/api/v1/commissions/records/${id}/mark-paid`);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Ghi nhận thanh toán thất bại.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900">Hoa hồng</h1>
      <p className="mt-1 text-sm text-gray-500">
        Quy trình: CALCULATED → duyệt (APPROVED) → thanh toán (PAID). Không sửa quy tắc đã áp dụng cho kỳ đã tính.
      </p>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Kỳ</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Số tiền</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Trạng thái</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Đang tải...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Chưa có bản ghi hoa hồng nào.</td></tr>}
            {items.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 text-gray-600">{r.period}</td>
                <td className="px-4 py-2 font-medium text-gray-900">{Number(r.amount).toLocaleString("vi-VN")} đ</td>
                <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-2">
                  {(r.status === "CALCULATED" || r.status === "PENDING_APPROVAL") && (
                    <button disabled={busyId === r.id} onClick={() => approve(r.id)} className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-50">
                      Duyệt
                    </button>
                  )}
                  {r.status === "APPROVED" && (
                    <button disabled={busyId === r.id} onClick={() => markPaid(r.id)} className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-50">
                      Ghi nhận đã thanh toán
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
