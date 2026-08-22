"use client";

import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/lib/useSettings";
import { AddAssetModal, AssetItem } from "@/components/assets/AddAssetModal";

interface AssetsData {
  items: AssetItem[];
}
const FALLBACK: AssetsData = { items: [] };

const TH = "border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted";
const TD = "border-b border-pms-divider px-2 py-3";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function exportCsv(items: AssetItem[]) {
  const header = ["STT", "Tên tài sản", "Mã TS", "Phòng lắp đặt", "Giá trị", "Số lượng", "ĐVT", "Khấu hao (tháng)", "Giá trị KH", "Trạng thái"];
  const rows = items.map((a) => [
    String(a.stt),
    a.name,
    a.code,
    a.room,
    a.value,
    String(a.qty),
    a.unit,
    String(a.depMonths),
    a.depValue,
    a.status,
  ]);
  const csv = [header, ...rows].map((row) => row.map((cell) => csvEscape(cell)).join(",")).join("\r\n");
  // BOM UTF-8 để Excel hiển thị đúng dấu tiếng Việt khi mở file.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `tai-san-${today}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Trang "Quản lý tài sản" (mở từ panel Cài đặt) — ĐÃ NỐI API THẬT:
// property_settings nhóm "assets". Modal Thêm/Sửa tài sản nay là form thật
// (lưu ngay qua PUT settings), menu "⋯" mỗi dòng có Sửa/Xóa thật, nút "📄
// Export" xuất CSV client-side thật (không cần backend riêng vì dữ liệu đã có
// sẵn trên trình duyệt). Bỏ nút "Update" tĩnh ở cuối trang vì mọi thao tác
// thêm/sửa/xóa đã lưu ngay lập tức, không cần bước "Cập nhật" gộp nữa.
export default function AssetsPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<AssetItem | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const { data, loading, error, save } = useSettings<AssetsData>("assets", FALLBACK);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function upsertItem(item: AssetItem) {
    const exists = data.items.some((i) => i.id === item.id);
    const nextItems = exists ? data.items.map((i) => (i.id === item.id ? item : i)) : [...data.items, item];
    save({ items: nextItems });
    setShowAdd(false);
    setEditing(null);
  }

  function removeItem(item: AssetItem) {
    if (!window.confirm(`Xóa tài sản "${item.name}"? Thao tác này không thể hoàn tác.`)) return;
    save({ items: data.items.filter((i) => i.id !== item.id) });
    setOpenMenuId(null);
  }

  const nextStt = (data.items.reduce((max, i) => Math.max(max, i.stt), 0) || 0) + 1;

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Quản lý tài sản</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">Thiết bị &amp; tài sản theo từng phòng</p>

      <div className="rounded-xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-[15px] font-semibold">Danh sách tài sản</h3>
          <div className="flex items-center gap-2.5">
            <div
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-pms-border px-3.5 py-2 text-[13px] font-semibold text-pms-primary"
              onClick={() => exportCsv(data.items)}
            >
              📄 Export
            </div>
            <div className="flex min-w-[180px] items-center gap-2 rounded-lg border border-pms-border px-3 py-2 text-[13px] text-pms-muted-2">
              Tìm kiếm <span className="ml-auto text-pms-muted">🔍</span>
            </div>
            <div
              className="cursor-pointer whitespace-nowrap rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
              onClick={() => setShowAdd(true)}
            >
              + Thêm mới
            </div>
          </div>
        </div>
        {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}
        {error && <div className="text-[13px] text-red-500">{error}</div>}
        {!loading && (
          <table className="w-full min-w-[1200px] border-collapse whitespace-nowrap text-[13px]">
            <thead>
              <tr>
                <th className={`${TH} w-7`}>
                  <input type="checkbox" />
                </th>
                {["STT", "Tên tài sản", "Mã TS", "Phòng lắp đặt", "Giá trị", "S.lượng", "ĐVT", "Khấu hao (tháng)", "Giá trị KH", "Hình ảnh", "Trạng thái", ""].map(
                  (h) => (
                    <th key={h} className={TH}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a.id}>
                  <td className={TD}>
                    <input type="checkbox" />
                  </td>
                  <td className={`${TD} text-pms-muted`}>{a.stt}</td>
                  <td className={`${TD} font-semibold`}>{a.name}</td>
                  <td className={`${TD} text-pms-muted`}>{a.code}</td>
                  <td className={TD}>{a.room}</td>
                  <td className={TD}>{a.value}</td>
                  <td className={TD}>{a.qty}</td>
                  <td className={TD}>{a.unit}</td>
                  <td className={TD}>{a.depMonths}</td>
                  <td className={TD}>{a.depValue}</td>
                  <td className={TD}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-pms-primary text-[14px] text-white">🖼</div>
                  </td>
                  <td className={TD} style={{ fontWeight: 600, color: a.fg }}>
                    {a.status}
                  </td>
                  <td className={`${TD} relative text-center text-pms-muted`}>
                    <span className="cursor-pointer px-1" onClick={() => setOpenMenuId(openMenuId === a.id ? null : a.id)}>
                      ⋯
                    </span>
                    {openMenuId === a.id && (
                      <div ref={menuRef} className="absolute right-2 top-9 z-10 w-32 rounded-lg border border-pms-border bg-white py-1.5 text-left shadow-xl">
                        <div
                          className="cursor-pointer px-3 py-2 text-[12.5px] font-medium text-pms-text hover:bg-pms-divider"
                          onClick={() => {
                            setEditing(a);
                            setOpenMenuId(null);
                          }}
                        >
                          Sửa
                        </div>
                        <div className="cursor-pointer px-3 py-2 text-[12.5px] font-medium text-pms-danger hover:bg-pms-divider" onClick={() => removeItem(a)}>
                          Xóa
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && <AddAssetModal onClose={() => setShowAdd(false)} onSave={upsertItem} nextStt={nextStt} />}
      {editing && <AddAssetModal onClose={() => setEditing(null)} onSave={upsertItem} initial={editing} nextStt={nextStt} />}
    </div>
  );
}
