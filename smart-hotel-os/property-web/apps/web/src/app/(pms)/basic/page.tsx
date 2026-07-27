"use client";

import { useState } from "react";
import Link from "next/link";
import { floorInputs } from "@/lib/mock-data";
import { FieldBox } from "@/components/ui/Modal";

type Tab = "info" | "owner" | "payment";

const TABS: { key: Tab; label: string }[] = [
  { key: "info", label: "Thông tin cơ sở" },
  { key: "owner", label: "Thông tin chủ sở hữu" },
  { key: "payment", label: "Thông tin thanh toán" },
];

// Trang "Cơ bản" (mở từ Danh sách cơ sở → Sửa) — pixel-perfect theo khối `isBasic`
// (dòng 1553-1608 bản gốc): 3 tab con (Thông tin cơ sở/Chủ sở hữu/Thanh toán), toàn bộ
// trường là placeholder tĩnh đúng bản gốc.
export default function BasicPage() {
  const [tab, setTab] = useState<Tab>("info");

  return (
    <div>
      <Link href="/branches" className="mb-4 flex items-center gap-3 text-[#23262F]">
        <span className="text-[18px]">←</span>
        <h1 className="m-0 text-[20px] font-bold">Tên cơ sở</h1>
      </Link>

      <div className="rounded-xl bg-white p-6 shadow-card">
        <div className="mb-6 flex gap-7 border-b border-pms-border text-[14px]">
          {TABS.map((t) => (
            <div
              key={t.key}
              className="cursor-pointer pb-3 font-semibold"
              style={{ color: tab === t.key ? "#284AB1" : "#777E90", borderBottom: `2px solid ${tab === t.key ? "#284AB1" : "transparent"}` }}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </div>
          ))}
        </div>

        {tab === "info" && (
          <div className="flex max-w-[900px] flex-col gap-5">
            <Row label="Giới thiệu" tall>
              <div className="min-h-[80px] rounded-lg border border-pms-border p-3 text-[13px] text-pms-muted-2">Giới thiệu cơ sở</div>
            </Row>
            <Row label="Tên cơ sở">
              <FieldBox placeholder>Tên cơ sở</FieldBox>
            </Row>
            <Row label="Logo cơ sở">
              <div className="rounded-lg border border-pms-border px-3 py-2.5 text-right text-[13px] text-pms-muted-2">Chọn tệp</div>
            </Row>
            <Row label="Website">
              <FieldBox placeholder>Địa chỉ website</FieldBox>
            </Row>
            <Row label="Mã CTV">
              <FieldBox placeholder>Mã CTV nếu có</FieldBox>
            </Row>
            <Row label="Tín ngưỡng tôn giáo">
              <SelectBox placeholder="Chọn tín ngưỡng tôn giáo" />
            </Row>
            <Row label="Hình thức cơ sở lưu trú">
              <SelectBox placeholder="Chọn hình thức cơ sở lưu trú" />
            </Row>
            <Row label="Phân loại cơ sở">
              <SelectBox placeholder="Chọn phân loại cơ sở" />
            </Row>
            <Row label="Khu, phân khu">
              <SelectBox placeholder="Chọn khu, phân khu" />
            </Row>
            <Row label="Tòa nhà">
              <FieldBox placeholder>Tên tòa nhà</FieldBox>
            </Row>
            <div className="grid grid-cols-[220px_1fr] gap-4">
              <label className="pt-2.5 text-[13px]">Số lượng tầng</label>
              <div className="grid grid-cols-3 gap-2.5">
                {floorInputs.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[12px]">
                    <span className="text-pms-danger">●</span>
                    {f}
                    <div className="w-11 rounded-lg border border-pms-border px-2.5 py-1.5 text-center text-pms-muted-2">0</div>
                    Phòng
                  </div>
                ))}
              </div>
            </div>
            <Row label="Ngôn ngữ">
              <SelectBox placeholder="Chọn ngôn ngữ" />
            </Row>
            <Row label="Vị trí" tall>
              <div className="flex h-[180px] items-center justify-center gap-1.5 rounded-[10px] border border-pms-border bg-pms-divider text-[12px] text-pms-muted">
                📍 Bản đồ vị trí cơ sở
              </div>
            </Row>
            <div className="w-[140px] cursor-pointer rounded-lg bg-pms-primary p-3 text-center text-[14px] font-semibold text-white">Cập nhật</div>
          </div>
        )}

        {tab === "owner" && (
          <div className="flex max-w-[900px] flex-col gap-5">
            <Row label="Họ tên chủ sở hữu">
              <FieldBox placeholder>Họ tên</FieldBox>
            </Row>
            <Row label="Số CMND/CCCD">
              <FieldBox placeholder>Số giấy tờ</FieldBox>
            </Row>
            <Row label="Số điện thoại">
              <FieldBox placeholder>Số điện thoại</FieldBox>
            </Row>
            <Row label="Email">
              <FieldBox placeholder>Email</FieldBox>
            </Row>
            <div className="w-[140px] cursor-pointer rounded-lg bg-pms-primary p-3 text-center text-[14px] font-semibold text-white">Cập nhật</div>
          </div>
        )}

        {tab === "payment" && (
          <div className="flex max-w-[900px] flex-col gap-5">
            <Row label="Ngân hàng">
              <SelectBox placeholder="Chọn ngân hàng" />
            </Row>
            <Row label="Số tài khoản">
              <FieldBox placeholder>Số tài khoản</FieldBox>
            </Row>
            <Row label="Chủ tài khoản">
              <FieldBox placeholder>Tên chủ tài khoản</FieldBox>
            </Row>
            <div className="w-[140px] cursor-pointer rounded-lg bg-pms-primary p-3 text-center text-[14px] font-semibold text-white">Cập nhật</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, tall, children }: { label: string; tall?: boolean; children: React.ReactNode }) {
  return (
    <div className={`grid grid-cols-[220px_1fr] gap-4 ${tall ? "" : "items-center"}`}>
      <label className={`text-[13px] ${tall ? "pt-2.5" : ""}`}>{label}</label>
      {children}
    </div>
  );
}

function SelectBox({ placeholder }: { placeholder: string }) {
  return (
    <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">
      {placeholder} <span>⌄</span>
    </div>
  );
}
