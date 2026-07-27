"use client";

// Modal dùng chung cho toàn bộ popup (Thêm mới hợp đồng, Xem hợp đồng, Đặt phòng nhanh...)
// — pixel-perfect theo khung modal lặp lại trong bản thiết kế gốc:
// overlay rgba(23,26,31,.45), card bo góc 14px, header có border-bottom #F4F5F6, nút đóng "✕".
import type { ReactNode } from "react";

export function Modal({
  title,
  onClose,
  width = 480,
  children,
  footer,
  titleExtra,
}: {
  title: ReactNode;
  onClose: () => void;
  width?: number | string;
  children: ReactNode;
  footer?: ReactNode;
  titleExtra?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(23,26,31,.45)]">
      <div
        className="flex max-h-[85vh] flex-col rounded-[14px] bg-white"
        style={{ width, maxWidth: "95vw" }}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-pms-divider px-6 py-5">
          <b className="text-[16px]">{title}</b>
          <div className="flex items-center gap-3">
            {titleExtra}
            <div className="cursor-pointer text-[18px] text-pms-muted" onClick={onClose}>
              ✕
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="flex flex-shrink-0 justify-end gap-2.5 border-t border-pms-divider px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function ModalField({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px]">
        {label} {required && <span className="text-pms-danger">*</span>}
      </label>
      {children}
    </div>
  );
}

export function FieldBox({ children, placeholder = false }: { children: ReactNode; placeholder?: boolean }) {
  return (
    <div className={`rounded-lg border border-pms-border px-3 py-2.5 text-[13px] ${placeholder ? "text-pms-muted-2" : ""}`}>
      {children}
    </div>
  );
}

export function ButtonPrimary({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <div className="cursor-pointer rounded-lg bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white" onClick={onClick}>
      {children}
    </div>
  );
}

export function ButtonGhost({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <div className="cursor-pointer px-[18px] py-2.5 text-[13px] font-semibold text-pms-muted" onClick={onClick}>
      {children}
    </div>
  );
}
