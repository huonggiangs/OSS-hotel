"use client";

import { useState } from "react";
import { useSettings } from "@/lib/useSettings";
import { apiFetchBlob, isApiError } from "@/lib/api-client";

interface DbInfoItem {
  label: string;
  value: string;
}
interface DbData {
  info: DbInfoItem[];
}
const FALLBACK: DbData = { info: [] };

// Trang "Cơ sở dữ liệu" (mở từ panel Cài đặt) — ĐÃ NỐI API THẬT: property_settings
// nhóm "db" cho lưới thông tin (info) + GET /api/v1/data-export cho 2 nút hành
// động. Bảng info bên dưới vẫn giữ vài dòng mô tả tĩnh có sẵn từ trước (VD
// "Sao lưu gần nhất", "Tần suất sao lưu") — đây là dữ liệu mẫu/trang trí có sẵn
// từ trước, KHÔNG thuộc phạm vi việc cần làm thật ở đây (không dựng hạ tầng
// backup lịch tự động/cloud storage thật).
//
// "Xuất dữ liệu": gọi GET /api/v1/data-export thật, tải về 1 file JSON chứa
// toàn bộ dữ liệu nghiệp vụ của cơ sở.
// "Sao lưu ngay": KHÔNG có hạ tầng sao lưu tự động (cron + cloud storage) đứng
// sau nút này — dựng hạ tầng đó ngoài phạm vi có thể làm trong 1 lượt cập nhật
// giao diện. Vì vậy nút này dùng THẬT SỰ chung hành động tải file xuất dữ liệu
// như "Xuất dữ liệu" — tên nút giữ nguyên "Sao lưu ngay" nhưng hành động thật
// là tải về 1 bản sao dữ liệu ngay lúc đó để khách tự lưu trữ an toàn.
export default function DbPage() {
  const { data, loading, error } = useSettings<DbData>("db", FALLBACK);
  const [downloading, setDownloading] = useState<"export" | "backup" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function downloadExport(kind: "export" | "backup") {
    setDownloading(kind);
    setDownloadError(null);
    setMessage(null);
    try {
      const blob = await apiFetchBlob("/api/v1/data-export");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `export-du-lieu-${today}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage(
        kind === "backup"
          ? "Đã tải về bản sao dữ liệu — hãy lưu file này ở nơi an toàn."
          : "Đã tải về file xuất dữ liệu."
      );
    } catch (err) {
      setDownloadError(isApiError(err) ? err.message : "Tải dữ liệu thất bại. Vui lòng thử lại.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div>
      <h1 className="mb-5 text-[22px] font-bold">Cơ sở dữ liệu</h1>
      <div className="mb-4 rounded-xl bg-white p-6 shadow-card">
        {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}
        {error && <div className="text-[13px] text-red-500">{error}</div>}
        {!loading && (
          <div className="grid grid-cols-2 gap-4">
            {data.info.map((d) => (
              <div key={d.label}>
                <div className="mb-1 text-[12px] text-pms-muted">{d.label}</div>
                <b className="text-[14px]">{d.value}</b>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <div
          className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white"
          onClick={() => downloadExport("backup")}
        >
          {downloading === "backup" ? "Đang tải..." : "Sao lưu ngay"}
        </div>
        <div
          className="cursor-pointer rounded-[10px] border border-pms-border px-[18px] py-2.5 text-[13px] font-semibold text-pms-text"
          onClick={() => downloadExport("export")}
        >
          {downloading === "export" ? "Đang tải..." : "Xuất dữ liệu"}
        </div>
      </div>
      {message && <p className="mt-3 text-[13px] text-[#00A844]">{message}</p>}
      {downloadError && <p className="mt-3 text-[13px] text-pms-danger">{downloadError}</p>}
    </div>
  );
}
