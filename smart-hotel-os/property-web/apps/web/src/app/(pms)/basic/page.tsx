"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSettings } from "@/lib/useSettings";

type Tab = "info" | "owner" | "payment";

const TABS: { key: Tab; label: string }[] = [
  { key: "info", label: "Thông tin cơ sở" },
  { key: "owner", label: "Thông tin chủ sở hữu" },
  { key: "payment", label: "Thông tin thanh toán" },
];

// Trang "Cơ bản" (mở từ Danh sách cơ sở → Sửa) — ĐÃ NỐI API THẬT:
// property_settings nhóm "basic" (floorInputs + info/owner/payment). Các
// trường text giờ là input thật (bản gốc để placeholder tĩnh không bind
// state) — bổ sung tối thiểu để nút "Cập nhật" hoạt động thật, đúng yêu cầu
// "đọc/lưu được qua API thật" cho nhóm màn hình Cài đặt. Các select-box
// (tín ngưỡng/hình thức lưu trú/phân loại/khu phân khu/ngôn ngữ...) chưa có
// danh mục lựa chọn tương ứng trong DB — giữ tĩnh đúng bản gốc.
interface BasicData {
  floorInputs: string[];
  info: { intro: string; website: string; ctvCode: string };
  owner: { fullName: string; idNumber: string; phone: string; email: string };
  payment: { bankName: string; accountNumber: string; accountHolder: string };
}
const FALLBACK: BasicData = {
  floorInputs: [],
  info: { intro: "", website: "", ctvCode: "" },
  owner: { fullName: "", idNumber: "", phone: "", email: "" },
  payment: { bankName: "", accountNumber: "", accountHolder: "" },
};

export default function BasicPage() {
  const [tab, setTab] = useState<Tab>("info");
  const { data, loading, saving, save } = useSettings<BasicData>("basic", FALLBACK);
  const [form, setForm] = useState<BasicData>(FALLBACK);

  useEffect(() => {
    if (!loading) setForm(data);
  }, [loading, data]);

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

        {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}

        {!loading && tab === "info" && (
          <div className="flex max-w-[900px] flex-col gap-5">
            <Row label="Giới thiệu" tall>
              <textarea
                value={form.info.intro}
                onChange={(e) => setForm((f) => ({ ...f, info: { ...f.info, intro: e.target.value } }))}
                className="min-h-[80px] w-full rounded-lg border border-pms-border p-3 text-[13px]"
                placeholder="Giới thiệu cơ sở"
              />
            </Row>
            <Row label="Logo cơ sở">
              <div className="rounded-lg border border-pms-border px-3 py-2.5 text-right text-[13px] text-pms-muted-2">Chọn tệp</div>
            </Row>
            <Row label="Website">
              <input
                value={form.info.website}
                onChange={(e) => setForm((f) => ({ ...f, info: { ...f.info, website: e.target.value } }))}
                className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
                placeholder="Địa chỉ website"
              />
            </Row>
            <Row label="Mã CTV">
              <input
                value={form.info.ctvCode}
                onChange={(e) => setForm((f) => ({ ...f, info: { ...f.info, ctvCode: e.target.value } }))}
                className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
                placeholder="Mã CTV nếu có"
              />
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
              <SelectBox placeholder="Tên tòa nhà" />
            </Row>
            <div className="grid grid-cols-[220px_1fr] gap-4">
              <label className="pt-2.5 text-[13px]">Số lượng tầng</label>
              <div className="grid grid-cols-3 gap-2.5">
                {form.floorInputs.map((f) => (
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
            <div
              className="w-[140px] cursor-pointer rounded-lg bg-pms-primary p-3 text-center text-[14px] font-semibold text-white"
              onClick={() => save(form)}
            >
              {saving ? "Đang lưu..." : "Cập nhật"}
            </div>
          </div>
        )}

        {!loading && tab === "owner" && (
          <div className="flex max-w-[900px] flex-col gap-5">
            <Row label="Họ tên chủ sở hữu">
              <input
                value={form.owner.fullName}
                onChange={(e) => setForm((f) => ({ ...f, owner: { ...f.owner, fullName: e.target.value } }))}
                className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
                placeholder="Họ tên"
              />
            </Row>
            <Row label="Số CMND/CCCD">
              <input
                value={form.owner.idNumber}
                onChange={(e) => setForm((f) => ({ ...f, owner: { ...f.owner, idNumber: e.target.value } }))}
                className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
                placeholder="Số giấy tờ"
              />
            </Row>
            <Row label="Số điện thoại">
              <input
                value={form.owner.phone}
                onChange={(e) => setForm((f) => ({ ...f, owner: { ...f.owner, phone: e.target.value } }))}
                className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
                placeholder="Số điện thoại"
              />
            </Row>
            <Row label="Email">
              <input
                value={form.owner.email}
                onChange={(e) => setForm((f) => ({ ...f, owner: { ...f.owner, email: e.target.value } }))}
                className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
                placeholder="Email"
              />
            </Row>
            <div
              className="w-[140px] cursor-pointer rounded-lg bg-pms-primary p-3 text-center text-[14px] font-semibold text-white"
              onClick={() => save(form)}
            >
              {saving ? "Đang lưu..." : "Cập nhật"}
            </div>
          </div>
        )}

        {!loading && tab === "payment" && (
          <div className="flex max-w-[900px] flex-col gap-5">
            <Row label="Ngân hàng">
              <input
                value={form.payment.bankName}
                onChange={(e) => setForm((f) => ({ ...f, payment: { ...f.payment, bankName: e.target.value } }))}
                className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
                placeholder="Chọn ngân hàng"
              />
            </Row>
            <Row label="Số tài khoản">
              <input
                value={form.payment.accountNumber}
                onChange={(e) => setForm((f) => ({ ...f, payment: { ...f.payment, accountNumber: e.target.value } }))}
                className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
                placeholder="Số tài khoản"
              />
            </Row>
            <Row label="Chủ tài khoản">
              <input
                value={form.payment.accountHolder}
                onChange={(e) => setForm((f) => ({ ...f, payment: { ...f.payment, accountHolder: e.target.value } }))}
                className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
                placeholder="Tên chủ tài khoản"
              />
            </Row>
            <div
              className="w-[140px] cursor-pointer rounded-lg bg-pms-primary p-3 text-center text-[14px] font-semibold text-white"
              onClick={() => save(form)}
            >
              {saving ? "Đang lưu..." : "Cập nhật"}
            </div>
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
