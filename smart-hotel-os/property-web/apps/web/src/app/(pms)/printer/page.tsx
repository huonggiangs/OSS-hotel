"use client";

import { Fragment, useEffect, useState } from "react";
import { useSettings } from "@/lib/useSettings";
import { StatusPill } from "@/components/ui/StatusPill";
import { AddPrintTemplateModal, PAPER_SIZE_OPTIONS, PrintTemplate } from "@/components/printer/AddPrintTemplateModal";

interface PrinterData {
  defaultPrinter: string;
  paperSize: string;
  templates: PrintTemplate[];
}
const FALLBACK: PrinterData = { defaultPrinter: "", paperSize: PAPER_SIZE_OPTIONS[0], templates: [] };

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `tpl-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Tương thích dữ liệu cũ (trước khi templates có id).
function normalise(value: Partial<PrinterData> | null | undefined): PrinterData {
  return {
    defaultPrinter: value?.defaultPrinter ?? "",
    paperSize: value?.paperSize ?? FALLBACK.paperSize,
    templates: Array.isArray(value?.templates)
      ? value.templates.map((raw): PrintTemplate => {
          const t = raw as Partial<PrintTemplate>;
          return {
            id: typeof t.id === "string" && t.id ? t.id : newId(),
            doc: t.doc ?? "",
            template: t.template ?? "",
            size: t.size ?? "",
            linked: t.linked === true,
            content: t.content ?? "",
            sourceUrl: t.sourceUrl ?? "",
            legalNotice: t.legalNotice ?? "",
          };
        })
      : [],
  };
}

// Mở 1 tab in thử với hoá đơn mẫu tối giản rồi gọi window.print() — đây là mức
// tối đa "trung thực" mà 1 web app có thể làm: không có API trình duyệt nào
// liệt kê được máy in cài trên máy, nên ta không giả lập danh sách máy in mà
// dùng đúng hộp thoại in gốc của hệ điều hành/trình duyệt.
function openTestPrint(printerName: string, paperSize: string) {
  const win = window.open("", "_blank", "width=420,height=600");
  if (!win) return;
  const now = new Date();
  const dateStr = now.toLocaleString("vi-VN");
  win.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>In thử</title>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; color: #23262F; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  .muted { color: #777E90; font-size: 12px; margin-bottom: 16px; }
  .box { border: 1px dashed #777E90; padding: 12px; text-align: center; font-weight: bold; margin-top: 16px; }
  .row { display: flex; justify-content: space-between; font-size: 13px; margin: 4px 0; }
</style>
</head>
<body>
  <h1>[Tên cơ sở lưu trú]</h1>
  <div class="muted">Bản in thử — ${dateStr}</div>
  <div class="row"><span>Máy in:</span><span>${escapeHtml(printerName || "(chưa đặt tên)")}</span></div>
  <div class="row"><span>Khổ giấy:</span><span>${escapeHtml(paperSize)}</span></div>
  <div class="box">ĐÂY LÀ BẢN IN THỬ</div>
</body>
</html>`);
  win.document.close();
  win.focus();
  win.print();
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function openTemplatePrint(template: PrintTemplate, printerName: string) {
  const win = window.open("", "_blank", "width=820,height=900");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8" /><title>${escapeHtml(template.template)}</title><style>body{font-family:Arial,sans-serif;margin:28px;color:#23262f}h1{font-size:18px;margin:0 0 8px}.meta{font-size:12px;color:#777e90;margin-bottom:20px}pre{white-space:pre-wrap;font-family:Arial,sans-serif;font-size:13px;line-height:1.55}.notice{margin-top:22px;border-top:1px solid #e6e8ec;padding-top:10px;font-size:11px;color:#777e90}</style></head><body><h1>${escapeHtml(template.doc)}</h1><div class="meta">${escapeHtml(template.template)} · ${escapeHtml(template.size)} · Máy in: ${escapeHtml(printerName || "chọn trong hộp thoại")}</div><pre>${escapeHtml(template.content)}</pre>${template.legalNotice ? `<div class="notice">${escapeHtml(template.legalNotice)}</div>` : ""}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

// Trang "Máy in & mẫu in" (mở từ panel Cài đặt) — ĐÃ NỐI API THẬT:
// property_settings nhóm "printer". "Máy in mặc định" là ô nhập tên tự do
// (trình duyệt không thể liệt kê máy in hệ điều hành), "Khổ giấy" là select
// cố định. "In thử" mở hộp thoại in thật của trình duyệt.
export default function PrinterPage() {
  const { data, loading, saving, error, save } = useSettings<PrinterData>("printer", FALLBACK);
  const [form, setForm] = useState<PrinterData>(FALLBACK);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PrintTemplate | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) setForm(normalise(data));
  }, [loading, data]);

  async function persist(next: PrinterData) {
    setForm(next);
    try {
      await save(next);
    } catch {
      // Lỗi đã được useSettings hiển thị.
    }
  }

  async function handleSavePrinterSettings() {
    await persist(form);
  }

  function openAdd() {
    setEditing(null);
    setShowModal(true);
  }
  function openEdit(t: PrintTemplate) {
    setEditing(t);
    setShowModal(true);
  }
  async function handleModalSave(item: PrintTemplate) {
    const next = editing
      ? { ...form, templates: form.templates.map((t) => (t.id === item.id ? item : t)) }
      : { ...form, templates: [...form.templates, item] };
    await persist(next);
    setShowModal(false);
    setEditing(null);
  }
  async function handleDeleteTemplate(t: PrintTemplate) {
    if (!window.confirm(`Xóa mẫu in "${t.template}"?`)) return;
    await persist({ ...form, templates: form.templates.filter((x) => x.id !== t.id) });
  }

  return (
    <div>
      <h1 className="mb-1 text-[22px] font-bold">Máy in &amp; mẫu in</h1>
      <p className="mb-[22px] text-[13px] text-pms-muted">Cấu hình máy in tại quầy và chọn mẫu in áp dụng cho từng loại chứng từ</p>

      {loading && <div className="text-[13px] text-pms-muted">Đang tải...</div>}
      {error && <div className="text-[13px] text-red-500">{error}</div>}

      {!loading && (
        <>
          <div className="mb-4 rounded-xl bg-white p-6 shadow-card">
            <h3 className="mb-3.5 text-[15px] font-semibold">Máy in</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[12px]">Máy in mặc định</label>
                <input
                  value={form.defaultPrinter}
                  onChange={(e) => setForm((f) => ({ ...f, defaultPrinter: e.target.value }))}
                  className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]"
                  placeholder="VD: Epson TM-T82 (Quầy lễ tân)"
                />
                <p className="mt-1.5 text-[11px] text-pms-muted">
                  Trình duyệt không thể tự phát hiện máy in kết nối với máy tính — bạn có thể nhập tên máy in bạn dùng, và khi in thử/in thật hệ thống sẽ mở
                  hộp thoại in của trình duyệt để bạn chọn đúng máy in đó.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-[12px]">Khổ giấy</label>
                <select
                  value={form.paperSize}
                  onChange={(e) => setForm((f) => ({ ...f, paperSize: e.target.value }))}
                  className="w-full rounded-lg border border-pms-border bg-white px-3 py-2.5 text-[13px]"
                >
                  {PAPER_SIZE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                disabled={saving}
                className="rounded-lg bg-pms-primary px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
                onClick={handleSavePrinterSettings}
              >
                {saving ? "Đang lưu..." : "Cập nhật"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-pms-primary px-4 py-2.5 text-[13px] font-semibold text-pms-primary"
                onClick={() => openTestPrint(form.defaultPrinter, form.paperSize)}
              >
                🖨 In thử
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="m-0 text-[15px] font-semibold">Mẫu in</h3>
              <div className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white" onClick={openAdd}>
                + Thêm mẫu in
              </div>
            </div>
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {["Loại chứng từ", "Mẫu đang dùng", "Khổ giấy", "Trạng thái", ""].map((h) => (
                    <th key={h} className="border-b border-pms-border px-2 py-2.5 text-left font-medium text-pms-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {form.templates.map((t) => (
                  <Fragment key={t.id}>
                    <tr>
                      <td className="border-b border-pms-divider px-2 py-3 font-semibold">{t.doc}</td>
                      <td className="border-b border-pms-divider px-2 py-3">{t.template}</td>
                      <td className="border-b border-pms-divider px-2 py-3">{t.size}</td>
                      <td className="border-b border-pms-divider px-2 py-3">
                        <StatusPill bg={t.linked ? "#E9FBEF" : "#F4F5F6"} fg={t.linked ? "#00C853" : "#777E90"}>
                          {t.linked ? "Đang dùng" : "Chưa cấu hình"}
                        </StatusPill>
                      </td>
                      <td className="border-b border-pms-divider px-2 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="font-semibold text-pms-primary"
                            onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                          >
                            {expandedId === t.id ? "Ẩn mẫu" : "Xem mẫu"}
                          </button>
                          <button type="button" className="text-pms-primary" onClick={() => openEdit(t)}>
                            Sửa
                          </button>
                          <button type="button" className="text-pms-primary" onClick={() => openTemplatePrint(t, form.defaultPrinter)}>
                            In mẫu
                          </button>
                          <button type="button" className="text-pms-danger" onClick={() => handleDeleteTemplate(t)}>
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === t.id && (
                      <tr>
                        <td colSpan={5} className="border-b border-pms-divider bg-pms-divider/30 px-2 py-3">
                          <div className="grid grid-cols-2 gap-3 text-[12px] text-pms-muted lg:grid-cols-4">
                            <div>
                              <b className="block text-pms-text">Loại chứng từ</b>
                              {t.doc}
                            </div>
                            <div>
                              <b className="block text-pms-text">Tên mẫu</b>
                              {t.template}
                            </div>
                            <div>
                              <b className="block text-pms-text">Khổ giấy</b>
                              {t.size}
                            </div>
                            <div>
                              <b className="block text-pms-text">Đang dùng</b>
                              {t.linked ? "Có" : "Không"}
                            </div>
                          </div>
                          {t.content ? <pre className="mt-3 max-h-[280px] overflow-auto whitespace-pre-wrap rounded-lg border border-pms-border bg-white p-3 font-sans text-[12px] leading-5 text-pms-text">{t.content}</pre> : <p className="mt-3 text-[12px] text-pms-muted">Mẫu cũ chưa có nội dung. Bấm “Sửa” để soạn nội dung.</p>}
                          {t.sourceUrl && <a href={t.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 block text-[12px] font-semibold text-pms-primary">Mở nguồn tham chiếu</a>}
                          {t.legalNotice && <p className="mb-0 mt-2 text-[11.5px] text-pms-muted">{t.legalNotice}</p>}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showModal && (
        <AddPrintTemplateModal
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
