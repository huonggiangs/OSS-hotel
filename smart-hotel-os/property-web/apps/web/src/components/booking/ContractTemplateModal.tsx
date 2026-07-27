"use client";

import { useRef } from "react";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";
import { contractTokensRoom, contractTokensGuest } from "@/lib/mock-data";

// Modal "Mẫu hợp đồng lưu trú" — editor mẫu hợp đồng có panel tham số chèn nhanh.
// Pixel-perfect theo khối `showContractTemplate` (dòng 573-624). Vùng nội dung dùng
// contentEditable + document.execCommand('insertText') để chèn tham số tại vị trí
// con trỏ (tương đương hành vi `tk.onInsert` của bản gốc — bản gốc để hàm rỗng,
// đây là bổ sung hợp lý tối thiểu để nút "chèn tham số" thực sự hoạt động).
export function ContractTemplateModal({ guestName, onClose }: { guestName: string; onClose: () => void }) {
  const editorRef = useRef<HTMLDivElement>(null);

  function insertToken(token: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    if (typeof document.execCommand === "function") {
      document.execCommand("insertText", false, ` ${token} `);
    }
  }

  return (
    <Modal title="Mẫu hợp đồng lưu trú" onClose={onClose} width={1040} footer={<>
      <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
      <ButtonPrimary onClick={onClose}>Lưu mẫu</ButtonPrimary>
    </>}>
      <div className="flex min-h-0 flex-1">
        <div className="w-[230px] flex-shrink-0 overflow-y-auto border-r border-pms-divider p-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-pms-muted-2">Tham số</div>
          <p className="m-0 mb-3 text-[11.5px] text-pms-muted">
            Bấm để chèn tham số vào mẫu — hệ thống tự thay bằng thông tin thật của từng hợp đồng khi in.
          </p>
          <div className="my-2.5 flex items-center justify-between text-[12px] font-bold">Hợp đồng &amp; phòng <span>⌄</span></div>
          {contractTokensRoom.map((tk) => (
            <div key={tk} className="mb-1.5 cursor-pointer rounded-md bg-pms-primary-soft px-2 py-1.5 text-[12px] text-pms-primary" onClick={() => insertToken(tk)}>
              {tk}
            </div>
          ))}
          <div className="my-2.5 flex items-center justify-between text-[12px] font-bold">Khách hàng <span>⌄</span></div>
          {contractTokensGuest.map((tk) => (
            <div key={tk} className="mb-1.5 cursor-pointer rounded-md bg-pms-primary-soft px-2 py-1.5 text-[12px] text-pms-primary" onClick={() => insertToken(tk)}>
              {tk}
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-pms-divider px-5 py-3.5">
            <b className="text-[14px]">Nội dung hợp đồng</b>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-[12px] text-pms-muted">
                Ngôn ngữ
                <div className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-pms-border px-2.5 py-1.5 text-[12.5px] text-pms-text">
                  Tiếng Việt <span>⌄</span>
                </div>
              </div>
              <div className="cursor-pointer rounded-lg border border-pms-border px-3.5 py-2 text-[12.5px] font-semibold">Sao chép mẫu</div>
            </div>
          </div>
          <div className="flex gap-1 border-b border-pms-divider px-5 py-2 text-[13px] text-pms-muted">
            <span className="cursor-pointer px-2 py-1 font-bold">B</span>
            <span className="cursor-pointer px-2 py-1 italic">I</span>
            <span className="cursor-pointer px-2 py-1 underline">U</span>
            <span className="cursor-pointer px-2 py-1">≡</span>
            <span className="cursor-pointer px-2 py-1">🔗</span>
            <span className="cursor-pointer px-2 py-1">▦</span>
          </div>
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
