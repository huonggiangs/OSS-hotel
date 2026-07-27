"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

interface Customer {
  id: string;
  name: string;
  contact_email: string | null;
  uses_kiosk: boolean;
  uses_smart_hotel_os: boolean;
  billing_status: string;
}

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [usesKiosk, setUsesKiosk] = useState(false);
  const [usesSmartHotelOs, setUsesSmartHotelOs] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ items: Customer[] }>("/api/v1/customers");
      setItems(res.items);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Không tải được danh sách khách hàng.");
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
      await api.post("/api/v1/customers", {
        name,
        contactEmail: contactEmail || undefined,
        usesKiosk,
        usesSmartHotelOs,
      });
      setShowForm(false);
      setName("");
      setContactEmail("");
      setUsesKiosk(false);
      setUsesSmartHotelOs(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Tạo khách hàng thất bại.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Khách hàng 360</h1>
          <p className="mt-1 text-sm text-gray-500">Hồ sơ khách hàng hợp nhất — đang dùng Kiosk, Smart Hotel OS, hoặc cả hai.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
          {showForm ? "Đóng" : "+ Thêm khách hàng"}
        </button>
      </div>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tên khách sạn</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email liên hệ</label>
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex items-center gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={usesKiosk} onChange={(e) => setUsesKiosk(e.target.checked)} />
              Dùng Kiosk Remote Management
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={usesSmartHotelOs} onChange={(e) => setUsesSmartHotelOs(e.target.checked)} />
              Dùng Smart Hotel OS
            </label>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Lưu khách hàng</button>
          </div>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Tên</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Email</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Sản phẩm đang dùng</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Thanh toán</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Đang tải...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Chưa có khách hàng nào.</td></tr>}
            {items.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2 font-medium text-gray-900">{c.name}</td>
                <td className="px-4 py-2 text-gray-600">{c.contact_email ?? "—"}</td>
                <td className="px-4 py-2 text-gray-600">
                  {[c.uses_kiosk && "Kiosk", c.uses_smart_hotel_os && "Smart Hotel OS"].filter(Boolean).join(" + ") || "—"}
                </td>
                <td className="px-4 py-2"><StatusBadge status={c.billing_status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
