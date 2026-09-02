"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/lib/useSettings";
import { api, isApiError } from "@/lib/api-client";

interface CurrencyItem {
  id: string;
  code: string;
  name: string;
  rate: string;
  rateAuto: boolean;
  rateNumeric: number | null;
  isDefault: boolean;
}
interface CurrencyData {
  items: CurrencyItem[];
}
const FALLBACK: CurrencyData = { items: [] };

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `cur-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Tương thích dữ liệu cũ (trước khi có rateAuto/rateNumeric/id) — gán id ổn định
// và mặc định rateAuto=false, rateNumeric=null nếu thiếu.
function normalise(value: Partial<CurrencyData> | null | undefined): CurrencyData {
  return {
    items: Array.isArray(value?.items)
      ? value.items.map((raw): CurrencyItem => {
          const item = raw as Partial<CurrencyItem>;
          return {
            id: typeof item.id === "string" && item.id ? item.id : newId(),
            code: item.code ?? "",
            name: item.name ?? "",
            rate: item.rate ?? "",
            rateAuto: item.rateAuto === true,
            rateNumeric: typeof item.rateNumeric === "number" ? item.rateNumeric : null,
            isDefault: item.isDefault === true,
          };
        })
      : [],
  };
}

function formatRate(code: string, rateVnd: number): string {
  return `1 ${code} = ${rateVnd.toLocaleString("vi-VN")} VND`;
}

// Trang "Tiền tệ" (mở từ panel Cài đặt) — ĐÃ NỐI API THẬT: property_settings
// nhóm "currency". Bảng cho phép thêm/sửa/xóa tiền tệ, đặt mặc định và bật
// "lấy tỷ giá tự động" (gọi GET /api/v1/settings/currency/fx-rate — server gọi
// hộ dịch vụ tỷ giá ngoài để tránh CORS/lộ endpoint bên thứ 3 ra trình duyệt).
export default function CurrencyPage() {
  const { data, loading, saving, error, save } = useSettings<CurrencyData>("currency", FALLBACK);
  const [form, setForm] = useState<CurrencyData>(FALLBACK);
  const [fxError, setFxError] = useState<string | null>(null);
  const [fxBusyId, setFxBusyId] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [newDraft, setNewDraft] = useState({ code: "", name: "", rate: "", rateAuto: false });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ code: "", name: "", rate: "", rateAuto: false });

  useEffect(() => {
    if (!loading) setForm(normalise(data));
  }, [loading, data]);

  async function fetchFxRate(code: string): Promise<number | null> {
    setFxError(null);
    try {
      const res = await api.get<{ code: string; rateVnd: number }>(`/api/v1/settings/currency/fx-rate?code=${encodeURIComponent(code)}`);
      return res.rateVnd;
    } catch (err) {
      setFxError(isApiError(err) ? err.message : "Không lấy được tỷ giá tự động.");
      return null;
    }
  }

  async function persist(next: CurrencyData) {
    setForm(next);
    try {
      await save(next);
    } catch {
      // Lỗi đã được useSettings hiển thị.
    }
  }

  async function handleAddSubmit() {
    const code = newDraft.code.trim().toUpperCase();
    const name = newDraft.name.trim();
    if (!code || !name) return;
    let rate = newDraft.rate.trim();
    let rateNumeric: number | null = null;
    if (newDraft.rateAuto) {
      setFxBusyId("new");
      const rateVnd = await fetchFxRate(code);
      setFxBusyId(null);
      if (rateVnd !== null) {
        rateNumeric = rateVnd;
        rate = formatRate(code, rateVnd);
      }
    }
    const item: CurrencyItem = { id: newId(), code, name, rate, rateAuto: newDraft.rateAuto, rateNumeric, isDefault: form.items.length === 0 };
    await persist({ items: [...form.items, item] });
    setNewDraft({ code: "", name: "", rate: "", rateAuto: false });
    setShowAdd(false);
  }

  function startEdit(item: CurrencyItem) {
    setEditingId(item.id);
    setEditDraft({ code: item.code, name: item.name, rate: item.rate, rateAuto: item.rateAuto });
    setFxError(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(item: CurrencyItem) {
    const code = editDraft.code.trim().toUpperCase();
    const name = editDraft.name.trim();
    if (!code || !name) return;
    let rate = editDraft.rate.trim();
    let rateNumeric = item.rateNumeric;
    if (editDraft.rateAuto) {
      setFxBusyId(item.id);
      const rateVnd = await fetchFxRate(code);
      setFxBusyId(null);
      if (rateVnd !== null) {
        rateNumeric = rateVnd;
        rate = formatRate(code, rateVnd);
      }
    } else {
      rateNumeric = null;
    }
    const updated: CurrencyItem = { ...item, code, name, rate, rateAuto: editDraft.rateAuto, rateNumeric };
    await persist({ items: form.items.map((i) => (i.id === item.id ? updated : i)) });
    setEditingId(null);
  }

  async function refreshRate(item: CurrencyItem) {
    setFxBusyId(item.id);
    const rateVnd = await fetchFxRate(item.code);
    setFxBusyId(null);
    if (rateVnd === null) return;
    const updated: CurrencyItem = { ...item, rateNumeric: rateVnd, rate: formatRate(item.code, rateVnd) };
    await persist({ items: form.items.map((i) => (i.id === item.id ? updated : i)) });
  }

  async function toggleAuto(item: CurrencyItem) {
    if (item.rateAuto) {
      await persist({ items: form.items.map((i) => (i.id === item.id ? { ...i, rateAuto: false } : i)) });
      return;
    }
    setFxBusyId(item.id);
    const rateVnd = await fetchFxRate(item.code);
    setFxBusyId(null);
    const updated: CurrencyItem = rateVnd !== null ? { ...item, rateAuto: true, rateNumeric: rateVnd, rate: formatRate(item.code, rateVnd) } : { ...item, rateAuto: true };
    await persist({ items: form.items.map((i) => (i.id === item.id ? updated : i)) });
  }

  async function setDefault(item: CurrencyItem) {
    await persist({ items: form.items.map((i) => ({ ...i, isDefault: i.id === item.id })) });
  }

  async function removeItem(item: CurrencyItem) {
    if (!window.confirm(`Xóa tiền tệ "${item.code} - ${item.name}"?`)) return;
    await persist({ items: form.items.filter((i) => i.id !== item.id) });
  }

  return (
    <div>
      <h1 className="mb-5 text-[22px] font-bold">Tiền tệ</h1>
      <div className="rounded-xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-[15px] font-semibold">Danh sách tiền tệ</h3>
          <div
            className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
            onClick={() => {
              setNewDraft({ code: "", name: "", rate: "", rateAuto: false });
              setShowAdd(true);
            }}
          >
            + Thêm tiền tệ
          </div>
        </div>
        {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}
        {error && <div className="mb-3 text-[13px] text-red-500">{error}</div>}
        {fxError && <div className="mb-3 text-[13px] text-pms-danger">{fxError}</div>}
        {!loading && (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-[13px]">
            <thead>
              <tr>
                {["Mã", "Tên", "Tỷ giá", "Tự động", "Mặc định", ""].map((h) => (
                  <th key={h} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {form.items.map((c) =>
                editingId === c.id ? (
                  <tr key={c.id}>
                    <td className="border-b border-pms-divider px-2 py-2">
                      <input
                        value={editDraft.code}
                        onChange={(e) => setEditDraft((d) => ({ ...d, code: e.target.value }))}
                        className="w-[70px] rounded-md border border-pms-border px-2 py-1.5 text-[13px] uppercase"
                      />
                    </td>
                    <td className="border-b border-pms-divider px-2 py-2">
                      <input
                        value={editDraft.name}
                        onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                        className="w-full rounded-md border border-pms-border px-2 py-1.5 text-[13px]"
                      />
                    </td>
                    <td className="border-b border-pms-divider px-2 py-2">
                      <input
                        value={editDraft.rate}
                        disabled={editDraft.rateAuto}
                        onChange={(e) => setEditDraft((d) => ({ ...d, rate: e.target.value }))}
                        className="w-full rounded-md border border-pms-border px-2 py-1.5 text-[13px] disabled:bg-pms-divider disabled:text-pms-muted"
                        placeholder="VD: 1 USD = 25.400 VND"
                      />
                    </td>
                    <td className="border-b border-pms-divider px-2 py-2">
                      <input type="checkbox" checked={editDraft.rateAuto} onChange={(e) => setEditDraft((d) => ({ ...d, rateAuto: e.target.checked }))} />
                    </td>
                    <td className="border-b border-pms-divider px-2 py-2 text-pms-muted">{c.isDefault ? "Mặc định" : "—"}</td>
                    <td className="border-b border-pms-divider px-2 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={fxBusyId === c.id}
                          className="text-pms-primary font-semibold disabled:opacity-50"
                          onClick={() => saveEdit(c)}
                        >
                          {fxBusyId === c.id ? "Đang lấy tỷ giá..." : "Lưu"}
                        </button>
                        <button type="button" className="text-pms-muted" onClick={cancelEdit}>
                          Huỷ
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id}>
                    <td className="border-b border-pms-divider px-2 py-3 font-semibold">{c.code}</td>
                    <td className="border-b border-pms-divider px-2 py-3">{c.name}</td>
                    <td className="border-b border-pms-divider px-2 py-3 text-pms-muted">
                      {c.rate}
                      {c.rateAuto && (
                        <button
                          type="button"
                          disabled={fxBusyId === c.id}
                          className="ml-2 text-[12px] font-semibold text-pms-primary disabled:opacity-50"
                          onClick={() => refreshRate(c)}
                        >
                          {fxBusyId === c.id ? "Đang làm mới..." : "Làm mới tỷ giá"}
                        </button>
                      )}
                    </td>
                    <td className="border-b border-pms-divider px-2 py-3">
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" checked={c.rateAuto} onChange={() => toggleAuto(c)} disabled={fxBusyId === c.id} />
                        <span className="text-[12px] text-pms-muted">Lấy tỷ giá tự động</span>
                      </label>
                    </td>
                    <td className="border-b border-pms-divider px-2 py-3">
                      {c.isDefault ? (
                        <span className="rounded-full bg-pms-primary-soft px-2.5 py-1 text-[11px] font-semibold text-pms-primary">Mặc định</span>
                      ) : (
                        <button type="button" className="text-[12px] text-pms-muted underline" onClick={() => setDefault(c)}>
                          Đặt mặc định
                        </button>
                      )}
                    </td>
                    <td className="border-b border-pms-divider px-2 py-3">
                      <div className="flex gap-2">
                        <button type="button" className="text-pms-primary" onClick={() => startEdit(c)}>
                          Sửa
                        </button>
                        <button type="button" className="text-pms-danger" onClick={() => removeItem(c)}>
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          </div>
        )}

        {showAdd && (
          <div className="mt-4 rounded-lg border border-pms-border p-4">
            <h4 className="mb-3 text-[13px] font-semibold">Thêm tiền tệ mới</h4>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-[12px] text-pms-muted">Mã (VD: USD)</label>
                <input
                  value={newDraft.code}
                  onChange={(e) => setNewDraft((d) => ({ ...d, code: e.target.value }))}
                  className="w-full rounded-md border border-pms-border px-2.5 py-2 text-[13px] uppercase"
                  placeholder="USD"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] text-pms-muted">Tên</label>
                <input
                  value={newDraft.name}
                  onChange={(e) => setNewDraft((d) => ({ ...d, name: e.target.value }))}
                  className="w-full rounded-md border border-pms-border px-2.5 py-2 text-[13px]"
                  placeholder="Đô la Mỹ"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] text-pms-muted">Tỷ giá</label>
                <input
                  value={newDraft.rate}
                  disabled={newDraft.rateAuto}
                  onChange={(e) => setNewDraft((d) => ({ ...d, rate: e.target.value }))}
                  className="w-full rounded-md border border-pms-border px-2.5 py-2 text-[13px] disabled:bg-pms-divider disabled:text-pms-muted"
                  placeholder="1 USD = 25.400 VND"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-1.5 text-[12px]">
                  <input type="checkbox" checked={newDraft.rateAuto} onChange={(e) => setNewDraft((d) => ({ ...d, rateAuto: e.target.checked }))} />
                  Lấy tỷ giá tự động
                </label>
              </div>
            </div>
            <div className="mt-3 flex gap-2.5">
              <button
                type="button"
                disabled={fxBusyId === "new" || saving}
                className="rounded-lg bg-pms-primary px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
                onClick={handleAddSubmit}
              >
                {fxBusyId === "new" ? "Đang lấy tỷ giá..." : "Lưu"}
              </button>
              <button type="button" className="rounded-lg px-4 py-2 text-[13px] font-semibold text-pms-muted" onClick={() => setShowAdd(false)}>
                Hủy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
