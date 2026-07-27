"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

interface Partner {
  id: string;
  name: string;
  territory: string | null;
  contact_email: string | null;
  default_commission_pct: string;
  max_customers: number | null;
  status: string;
}

export default function PartnersPage() {
  const [items, setItems] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [territory, setTerritory] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [defaultCommissionPct, setDefaultCommissionPct] = useState("10");

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ items: Partner[] }>("/api/v1/partners");
      setItems(res.items);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Không tải được danh sách đối tác.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/api/v1/partners", {
        name,
        territory: territory || undefined,
        contactEmail: contactEmail || undefined,
        defaultCommissionPct: Number(defaultCommissionPct) || 0,
      });
      setShowForm(false);
      setName("");
      setTerritory("");
      setContactEmail("");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Tạo đối tác thất bại.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Đối tác / Đại lý</h1>
          <p className="mt-1 text-sm text-gray-500">Quản lý hồ sơ, khu vực phụ trách và tỷ lệ hoa hồng mặc định.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          {showForm ? "Đóng" : "+ Thêm đối tác"}
        </button>
      </div>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tên đối tác</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Khu vực phụ trách</label>
            <input value={territory} onChange={(e) => setTerritory(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email liên hệ</label>
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Hoa hồng mặc định (%)</label>
            <input type="number" step="0.01" value={defaultCommissionPct} onChange={(e) => setDefaultCommissionPct(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              Lưu đối tác
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Tên</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Khu vực</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Email</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Hoa hồng</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Hạn mức KH</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">Đang tải...</td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">Chưa có đối tác nào.</td>
              </tr>
            )}
            {items.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-2 text-gray-600">{p.territory ?? "—"}</td>
                <td className="px-4 py-2 text-gray-600">{p.contact_email ?? "—"}</td>
                <td className="px-4 py-2 text-gray-600">{p.default_commission_pct}%</td>
                <td className="px-4 py-2 text-gray-600">{p.max_customers ?? "Không giới hạn"}</td>
                <td className="px-4 py-2"><StatusBadge status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
