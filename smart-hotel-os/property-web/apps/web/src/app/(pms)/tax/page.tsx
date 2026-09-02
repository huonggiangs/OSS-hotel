"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/lib/useSettings";
import { AddTaxModal, TaxItem } from "@/components/tax/AddTaxModal";

interface TaxData {
  items: TaxItem[];
}
const FALLBACK: TaxData = { items: [] };

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `tax-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Tương thích dữ liệu cũ (trước khi có id/visibleToGuest).
function normalise(value: Partial<TaxData> | null | undefined): TaxData {
  return {
    items: Array.isArray(value?.items)
      ? value.items.map((raw): TaxItem => {
          const item = raw as Partial<TaxItem>;
          return {
            id: typeof item.id === "string" && item.id ? item.id : newId(),
            name: item.name ?? "",
            rate: item.rate ?? "",
            applyTo: item.applyTo ?? "Toàn bộ hoá đơn",
            visibleToGuest: item.visibleToGuest !== false,
          };
        })
      : [],
  };
}

// Trang "Thuế & phí" (mở từ panel Cài đặt) — ĐÃ NỐI API THẬT: property_settings
// nhóm "tax". Thêm/sửa/xóa loại thuế/phí qua AddTaxModal (form thật).
export default function TaxPage() {
  const { data, loading, error, save } = useSettings<TaxData>("tax", FALLBACK);
  const [form, setForm] = useState<TaxData>(FALLBACK);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TaxItem | null>(null);

  useEffect(() => {
    if (!loading) setForm(normalise(data));
  }, [loading, data]);

  async function persist(next: TaxData) {
    setForm(next);
    try {
      await save(next);
    } catch {
      // Lỗi đã được useSettings hiển thị.
    }
  }

  function openAdd() {
    setEditing(null);
    setShowModal(true);
  }
  function openEdit(item: TaxItem) {
    setEditing(item);
    setShowModal(true);
  }

  async function handleModalSave(item: TaxItem) {
    const next = editing
      ? { items: form.items.map((i) => (i.id === item.id ? item : i)) }
      : { items: [...form.items, item] };
    await persist(next);
    setShowModal(false);
    setEditing(null);
  }

  async function handleDelete(item: TaxItem) {
    if (!window.confirm(`Xóa "${item.name}"?`)) return;
    await persist({ items: form.items.filter((i) => i.id !== item.id) });
  }

  return (
    <div>
      <h1 className="mb-5 text-[22px] font-bold">Thuế &amp; phí</h1>
      <div className="rounded-xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-[15px] font-semibold">Danh sách thuế/phí áp dụng</h3>
          <div className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white" onClick={openAdd}>
            + Thêm
          </div>
        </div>
        {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}
        {error && <div className="text-[13px] text-red-500">{error}</div>}
        {!loading && (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[13px]">
            <thead>
              <tr>
                {["Tên", "Mức thu", "Áp dụng cho", "Hiển thị khách", ""].map((h) => (
                  <th key={h} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {form.items.map((t) => (
                <tr key={t.id}>
                  <td className="border-b border-pms-divider px-2 py-3 font-semibold">{t.name}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{t.rate}</td>
                  <td className="border-b border-pms-divider px-2 py-3 text-pms-muted">{t.applyTo}</td>
                  <td className="border-b border-pms-divider px-2 py-3 text-pms-muted">{t.visibleToGuest ? "Hiển thị" : "Nội bộ"}</td>
                  <td className="border-b border-pms-divider px-2 py-3">
                    <div className="flex gap-2">
                      <button type="button" className="text-pms-primary" onClick={() => openEdit(t)}>
                        Sửa
                      </button>
                      <button type="button" className="text-pms-danger" onClick={() => handleDelete(t)}>
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {showModal && (
        <AddTaxModal
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSave={handleModalSave}
          initial={editing ?? undefined}
        />
      )}
    </div>
  );
}
