"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AddBranchModal } from "@/components/branches/AddBranchModal";
import { api, isApiError } from "@/lib/api-client";

// Trang "Danh sách cơ sở" — ĐÃ NỐI API THẬT: GET/POST /api/v1/branches (dùng
// lại bảng "properties" đã có, KHÔNG tạo bảng mới — 1 tenant có thể có nhiều
// property, đúng nghiệp vụ chuỗi khách sạn/multi-property của RULES.md).
// Cột "Số tầng"/"Trạng thái bảo trì" chưa có cột nguồn tương ứng trong schema
// hiện tại — hiển thị "—"/"Hoạt động" mặc định, xem PROGRESS.md.
interface ApiBranch {
  id: string;
  name: string;
  address: string | null;
  status: "ACTIVE" | "SUSPENDED";
  room_count: number;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<ApiBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ items: ApiBranch[] }>("/api/v1/branches");
      setBranches(res.items);
    } catch (err) {
      setError(isApiError(err) ? err.message : "Không tải được danh sách cơ sở.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(input: { name: string; address: string }) {
    try {
      await api.post("/api/v1/branches", input);
      setShowAdd(false);
      load();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Thêm cơ sở thất bại.");
    }
  }

  return (
    <div>
      <div className="rounded-xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="m-0 text-[18px] font-bold text-pms-primary">Danh sách cơ sở</h1>
          <div
            className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
            onClick={() => setShowAdd(true)}
          >
            + Thêm mới
          </div>
        </div>
        {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}
        {error && (
          <div className="text-[13px] text-pms-danger">
            {error} <span className="cursor-pointer font-semibold text-pms-primary" onClick={load}>Thử lại</span>
          </div>
        )}
        {!loading && !error && (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {["STT", "Tên cơ sở", "Địa chỉ", "Số phòng", "Trạng thái", "Action"].map((h) => (
                  <th key={h} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {branches.map((b, i) => (
                <tr key={b.id}>
                  <td className="border-b border-pms-divider px-2 py-3">{i + 1}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{b.name}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{b.address ?? "—"}</td>
                  <td className="border-b border-pms-divider px-2 py-3">{b.room_count}</td>
                  <td
                    className="border-b border-pms-divider px-2 py-3 font-semibold"
                    style={{ color: b.status === "ACTIVE" ? "#00C853" : "#CC2F42" }}
                  >
                    {b.status === "ACTIVE" ? "Hoạt động" : "Tạm ngưng"}
                  </td>
                  <td className="relative border-b border-pms-divider px-2 py-3">
                    <div
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg"
                      onClick={() => setOpenMenu(openMenu === b.id ? null : b.id)}
                    >
                      ⋯
                    </div>
                    {openMenu === b.id && (
                      <div className="absolute right-2 top-8 z-10 min-w-[110px] rounded-[10px] border border-pms-border bg-white shadow-popover">
                        <Link href="/basic" className="block px-3.5 py-2.5 text-[13px]">
                          Sửa
                        </Link>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-4 flex items-center justify-between text-[13px] text-pms-muted">
          <span>Hiển thị {branches.length} cơ sở</span>
        </div>
      </div>

      {showAdd && <AddBranchModal onClose={() => setShowAdd(false)} onCreate={handleCreate} />}
    </div>
  );
}
