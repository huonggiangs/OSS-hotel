"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

interface Supplier {
  id: string;
  name: string;
  supplies_types: string | null;
  contact_email: string | null;
  lead_time_days: number | null;
  status: string;
}

export default function SuppliersPage() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [suppliesTypes, setSuppliesTypes] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("14");

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ items: Supplier[] }>("/api/v1/suppliers");
      setItems(res.items);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Không tải được danh sách nhà cung cấp.");
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
      await api.post("/api/v1/suppliers", {
        name,
        suppliesTypes: suppliesTypes || undefined,
        contactEmail: contactEmail || undefined,
        leadTimeDays: Number(leadTimeDays) || undefined,
      });
      setShowForm(false);
      setName("");
      setSuppliesTypes("");
      setContactEmail("");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Tạo nhà cung cấp thất bại.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Nhà cung cấp</h1>
          <p className="mt-1 text-sm text-gray-500">Hồ sơ nhà cung cấp phần cứng, thời gian giao hàng.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
          {showForm ? "Đóng" : "+ Thêm nhà cung cấp"}
        </button>
      </div>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tên nhà cung cấp</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Loại linh kiện cung cấp</label>
            <input placeholder="camera, card_dispenser..." value={suppliesTypes} onChange={(e) => setSuppliesTypes(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email liên hệ</label>
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Thời gian giao hàng (ngày)</label>
            <input type="number" value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Lưu nhà cung cấp</button>
          </div>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Tên</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Loại linh kiện</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Email</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Lead time</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Đang tải...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Chưa có nhà cung cấp nào.</td></tr>}
            {items.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2 font-medium text-gray-900">{s.name}</td>
                <td className="px-4 py-2 text-gray-600">{s.supplies_types ?? "—"}</td>
                <td className="px-4 py-2 text-gray-600">{s.contact_email ?? "—"}</td>
                <td className="px-4 py-2 text-gray-600">{s.lead_time_days ? `${s.lead_time_days} ngày` : "—"}</td>
                <td className="px-4 py-2"><StatusBadge status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
