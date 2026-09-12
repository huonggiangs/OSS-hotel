"use client";

import { useEffect, useRef, useState } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import { contractTokensRoom, contractTokensGuest } from "@/lib/mock-data";
import { useSettings } from "@/lib/useSettings";

// Modal "Mẫu hợp đồng lưu trú" — editor mẫu hợp đồng có panel tham số chèn nhanh.
// Pixel-perfect theo khối `showContractTemplate` (dòng 573-624). Vùng nội dung dùng
// contentEditable + document.execCommand('insertText') để chèn tham số tại vị trí
// con trỏ (tương đương hành vi `tk.onInsert` của bản gốc — bản gốc để hàm rỗng,
// đây là bổ sung hợp lý tối thiểu để nút "chèn tham số" thực sự hoạt động).
export function ContractTemplateModal({ guestName, onClose }: { guestName: string; onClose: () => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const settings = useSettings<{ language: string; contentHtml: string }>("contract-template", { language: "vi", contentHtml: "" });
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!settings.loading && settings.data.contentHtml && editorRef.current) editorRef.current.innerHTML = settings.data.contentHtml;
  }, [settings.loading, settings.data.contentHtml]);

  function insertToken(token: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    if (typeof document.execCommand === "function") {
      document.execCommand("insertText", false, ` ${token} `);
    }
  }

  function format(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  }

  async function saveTemplate() {
    const contentHtml = editorRef.current?.innerHTML.trim() ?? "";
    if (!contentHtml) return setNotice("Mẫu hợp đồng không được để trống.");
    await settings.save({ ...settings.data, contentHtml });
    setNotice("Đã lưu mẫu hợp đồng vào cơ sở dữ liệu.");
  }

  async function copyTemplate() {
    const text = editorRef.current?.innerText.trim() ?? "";
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setNotice("Đã sao chép nội dung mẫu.");
  }

  return (
    <Modal title="Mẫu hợp đồng lưu trú" onClose={onClose} width={1040} footer={<>
      <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
      <ButtonPrimary onClick={() => void saveTemplate()} disabled={settings.saving}>{settings.saving ? "Đang lưu..." : "Lưu mẫu"}</ButtonPrimary>
    </>}>
      <div className="flex min-h-0 flex-1">
        <div className="w-[230px] flex-shrink-0 overflow-y-auto border-r border-pms-divider p-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-pms-muted-2">Tham số</div>
          <p className="m-0 mb-3 text-[11.5px] text-pms-muted">
            Bấm để chèn tham số vào mẫu — hệ thống tự thay bằng thông tin thật của từng hợp đồng khi in.
          </p>
          <div className="my-2.5 flex items-center justify-between text-[12px] font-bold">Hợp đồng &amp; phòng <span>⌄</span></div>
          {contractTokensRoom.map((tk) => (
            <button type="button" key={tk} className="mb-1.5 block w-full rounded-md border-0 bg-pms-primary-soft px-2 py-1.5 text-left text-[12px] text-pms-primary" onClick={() => insertToken(tk)}>
              {tk}
            </button>
          ))}
          <div className="my-2.5 flex items-center justify-between text-[12px] font-bold">Khách hàng <span>⌄</span></div>
          {contractTokensGuest.map((tk) => (
            <button type="button" key={tk} className="mb-1.5 block w-full rounded-md border-0 bg-pms-primary-soft px-2 py-1.5 text-left text-[12px] text-pms-primary" onClick={() => insertToken(tk)}>
              {tk}
            </button>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-pms-divider px-5 py-3.5">
            <b className="text-[14px]">Nội dung hợp đồng</b>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-[12px] text-pms-muted">
                Ngôn ngữ
                <select aria-label="Ngôn ngữ mẫu" value={settings.data.language} onChange={(event) => settings.setData({ ...settings.data, language: event.target.value })} className="rounded-lg border border-pms-border bg-white px-2.5 py-1.5 text-[12.5px] text-pms-text"><option value="vi">Tiếng Việt</option><option value="en">English</option></select>
              </div>
              <button type="button" onClick={() => void copyTemplate()} className="rounded-lg border border-pms-border bg-white px-3.5 py-2 text-[12.5px] font-semibold">Sao chép mẫu</button>
            </div>
          </div>
          <div className="flex gap-1 border-b border-pms-divider px-5 py-2 text-[13px] text-pms-muted">
            <button type="button" aria-label="In đậm" title="In đậm" onClick={() => format("bold")} className="border-0 bg-transparent px-2 py-1 font-bold">B</button>
            <button type="button" aria-label="In nghiêng" title="In nghiêng" onClick={() => format("italic")} className="border-0 bg-transparent px-2 py-1 italic">I</button>
            <button type="button" aria-label="Gạch chân" title="Gạch chân" onClick={() => format("underline")} className="border-0 bg-transparent px-2 py-1 underline">U</button>
            <button type="button" aria-label="Danh sách" title="Danh sách" onClick={() => format("insertUnorderedList")} className="border-0 bg-transparent px-2 py-1">≡</button>
            <button type="button" aria-label="Chèn liên kết" title="Chèn liên kết" onClick={() => { const url = window.prompt("Nhập liên kết"); if (url) format("createLink", url); }} className="border-0 bg-transparent px-2 py-1">🔗</button>
            <button type="button" aria-label="Chèn bảng" title="Chèn bảng 2 cột" onClick={() => format("insertHTML", "<table><tbody><tr><td>Nội dung</td><td>Nội dung</td></tr></tbody></table>")} className="border-0 bg-transparent px-2 py-1">▦</button>
          </div>
          {(notice || settings.error) && <p className={`m-0 px-5 py-2 text-[11.5px] ${settings.error ? "text-pms-danger" : "text-pms-success"}`}>{settings.error ?? notice}</p>}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="flex-1 overflow-y-auto px-5 py-5 text-[13px] leading-[1.9] text-pms-text outline-none"
          >
            <p className="mb-4 text-center text-[15px] font-bold">HỢP ĐỒNG LƯU TRÚ</p>
            <p>
              Họ và tên khách: <Token>{guestName || "[Full_name]"}</Token> &nbsp; Số giấy tờ: <Token>[Customer_identity_number]</Token>
            </p>
            <p>
              Quốc tịch: <Token>[Customer_country]</Token> &nbsp; Số điện thoại: <Token>[Customer_phone]</Token>
            </p>
            <p>
              Phòng: <Token>[Room_name]</Token> &nbsp; Loại phòng: <Token>[Room_type]</Token> &nbsp; Giá/đêm: <Token>[Price_room_per_night]</Token>
            </p>
            <p>
              Nhận phòng: <Token>[Arrival]</Token> &nbsp; Trả phòng: <Token>[Departure]</Token> &nbsp; Số đêm: <Token>[Total_night]</Token>
            </p>
            <p>
              Tiền cọc: <Token>[Deposit]</Token> &nbsp; Tổng tiền: <Token>[Total_price]</Token>
            </p>
            <p className="mt-[18px]">
              Khách xác nhận đã đọc và đồng ý các điều khoản lưu trú, quy định phòng cháy chữa cháy và an ninh của cơ sở. Cơ sở không
              chịu trách nhiệm với tài sản không gửi tại quầy lễ tân.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 text-center">
              <div>
                Chữ ký khách
                <div className="h-[60px]" />
              </div>
              <div>
                Đại diện cơ sở
                <div className="h-[60px]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Token({ children }: { children: React.ReactNode }) {
  return <b className="rounded-[3px] bg-[#FFF7E0] px-1 py-px">{children}</b>;
}
