"use client";

import { useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";

export interface PrintTemplate {
  id: string;
  doc: string;
  template: string;
  size: string;
  linked: boolean;
  content: string;
  sourceUrl: string;
  legalNotice: string;
}

export const PAPER_SIZE_OPTIONS = ["K80 (80mm)", "K58 (58mm)", "A4", "A5"];

export const VIETNAM_LODGING_TEMPLATE_PRESETS = [
  {
    key: "stay-notice",
    doc: "Thông báo lưu trú công dân Việt Nam",
    template: "Mẫu tham khảo thông báo lưu trú",
    size: "A4",
    content: `CƠ SỞ LƯU TRÚ: [TEN_CO_SO]\nĐỊA CHỈ: [DIA_CHI_CO_SO]\n\nTHÔNG BÁO LƯU TRÚ\n\nHọ và tên người lưu trú: [HO_TEN]\nNgày sinh: [NGAY_SINH]\nSố định danh cá nhân / Hộ chiếu: [SO_GIAY_TO]\nLý do lưu trú: [LY_DO]\nThời gian lưu trú: từ [GIO_NHAN_PHONG] ngày [NGAY_NHAN_PHONG] đến [GIO_TRA_PHONG] ngày [NGAY_TRA_PHONG]\nĐịa chỉ lưu trú: [DIA_CHI_CO_SO]\nPhòng: [SO_PHONG]\n\nNgười khai báo / đại diện cơ sở\n[KÝ, GHI RÕ HỌ TÊN]`,
    sourceUrl: "https://tbltkbtt.bocongan.gov.vn/auth/register",
    legalNotice: "Mẫu tham khảo để chuẩn bị dữ liệu thông báo lưu trú. Đối chiếu phương thức, thời hạn và biểu mẫu hiện hành trên cổng Bộ Công an trước khi nộp.",
  },
  {
    key: "na17-reference",
    doc: "Khai báo tạm trú người nước ngoài",
    template: "Bản nháp tham chiếu NA17",
    size: "A4",
    content: `CƠ SỞ LƯU TRÚ: [TEN_CO_SO]\nĐỊA CHỈ: [DIA_CHI_CO_SO]\n\nPHIẾU KHAI BÁO TẠM TRÚ NGƯỜI NƯỚC NGOÀI\n(Bản nháp tham chiếu để nhập liệu trước khi dùng biểu mẫu chính thức)\n\nHọ và tên: [HO_TEN]\nQuốc tịch: [QUOC_TICH]\nNgày sinh: [NGAY_SINH]\nSố hộ chiếu / giấy tờ đi lại quốc tế: [SO_HO_CHIEU]\nNgày đến Việt Nam: [NGAY_DEN]\nNgày nhận phòng: [NGAY_NHAN_PHONG]\nNgày dự kiến trả phòng: [NGAY_TRA_PHONG]\nSố phòng: [SO_PHONG]\n\nĐại diện cơ sở lưu trú\n[KÝ, GHI RÕ HỌ TÊN]`,
    sourceUrl: "https://dichvucong.bocongan.gov.vn/block/phieu-huong-dan/thu-tuc/26244",
    legalNotice: "Đây là bản nháp tham chiếu NA17, không thay thế biểu mẫu chính thức hoặc khai báo điện tử. Tải/đối chiếu mẫu đang có hiệu lực từ Bộ Công an trước khi sử dụng.",
  },
] as const;

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `tpl-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AddPrintTemplateModal({ onClose, onSave, initial }: { onClose: () => void; onSave: (item: PrintTemplate) => void; initial?: PrintTemplate }) {
  const [doc, setDoc] = useState(initial?.doc ?? "");
  const [template, setTemplate] = useState(initial?.template ?? "");
  const [size, setSize] = useState(initial?.size ?? PAPER_SIZE_OPTIONS[0]);
  const [linked, setLinked] = useState(initial?.linked ?? true);
  const [content, setContent] = useState(initial?.content ?? "");
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? "");
  const [legalNotice, setLegalNotice] = useState(initial?.legalNotice ?? "");
  const [error, setError] = useState<string | null>(null);

  function applyPreset(key: string) {
    const preset = VIETNAM_LODGING_TEMPLATE_PRESETS.find((item) => item.key === key);
    if (!preset) return;
    setDoc(preset.doc);
    setTemplate(preset.template);
    setSize(preset.size);
    setContent(preset.content);
    setSourceUrl(preset.sourceUrl);
    setLegalNotice(preset.legalNotice);
  }
  function handleSave() {
    if (!doc.trim() || !template.trim() || !content.trim()) return setError("Nhập loại chứng từ, tên mẫu và nội dung in.");
    onSave({ id: initial?.id ?? newId(), doc: doc.trim(), template: template.trim(), size, linked, content: content.trim(), sourceUrl: sourceUrl.trim(), legalNotice: legalNotice.trim() });
  }

  return (
    <Modal title={initial ? "Soạn mẫu in" : "Thêm mẫu in"} onClose={onClose} width={760} footer={<><ButtonGhost onClick={onClose}>Hủy</ButtonGhost><ButtonPrimary onClick={handleSave}>Lưu mẫu</ButtonPrimary></>}>
      <div className="flex flex-col gap-4 px-6 py-5">
        {error && <p className="m-0 rounded-lg bg-pms-danger-bg px-3 py-2 text-[12px] text-pms-danger">{error}</p>}
        <div className="rounded-lg bg-pms-primary-soft p-3"><label className="mb-1.5 block text-[12px] font-semibold text-pms-primary">Dùng mẫu tham khảo lưu trú Việt Nam</label><select defaultValue="" onChange={(event) => applyPreset(event.target.value)} className="w-full rounded-lg border border-pms-border bg-white px-3 py-2.5 text-[13px]"><option value="">— Chọn mẫu để nạp vào trình soạn thảo —</option>{VIETNAM_LODGING_TEMPLATE_PRESETS.map((preset) => <option key={preset.key} value={preset.key}>{preset.doc}</option>)}</select><p className="mb-0 mt-2 text-[11px] text-pms-muted">Nội dung sau khi nạp có thể chỉnh sửa toàn bộ trước khi lưu/in.</p></div>
        <div className="grid grid-cols-2 gap-4"><Field label="Loại chứng từ" value={doc} onChange={setDoc} placeholder="VD: Hoá đơn thanh toán" /><Field label="Tên mẫu in" value={template} onChange={setTemplate} placeholder="VD: Phiếu lưu trú A4" /></div>
        <div><label className="mb-1.5 block text-[12px]">Khổ giấy</label><select value={size} onChange={(event) => setSize(event.target.value)} className="w-full rounded-lg border border-pms-border bg-white px-3 py-2.5 text-[13px]">{PAPER_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
        <div><label className="mb-1.5 block text-[12px]">Nội dung mẫu (có thể chỉnh sửa trực tiếp)</label><textarea value={content} onChange={(event) => setContent(event.target.value)} className="min-h-[260px] w-full rounded-lg border border-pms-border p-3 font-mono text-[12px] outline-none focus:border-pms-primary" placeholder="Nhập nội dung. Dùng [TEN_CO_SO], [HO_TEN], [SO_PHONG]... làm biến thay thế khi cần." /></div>
        <Field label="Nguồn tham chiếu (nếu là mẫu pháp lý)" value={sourceUrl} onChange={setSourceUrl} placeholder="https://..." />
        <div><label className="mb-1.5 block text-[12px]">Lưu ý áp dụng</label><textarea value={legalNotice} onChange={(event) => setLegalNotice(event.target.value)} className="min-h-[65px] w-full rounded-lg border border-pms-border p-3 text-[13px]" placeholder="Nêu phạm vi áp dụng và việc cần đối chiếu quy định hiện hành." /></div>
        <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={linked} onChange={(event) => setLinked(event.target.checked)} />Đang dùng (áp dụng mẫu này cho chứng từ)</label>
      </div>
    </Modal>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div><label className="mb-1.5 block text-[12px]">{label}</label><input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-pms-border px-3 py-2.5 text-[13px]" placeholder={placeholder} /></div>;
}
