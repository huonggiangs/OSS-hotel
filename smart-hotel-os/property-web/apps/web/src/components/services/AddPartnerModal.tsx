"use client";

import { Modal, ButtonGhost, ButtonPrimary, FieldBox } from "@/components/ui/Modal";

// Modal "Thêm đối tác mới" — pixel-perfect theo khối `showAddPartner` (dòng 2215-2244
// bản gốc). Bản gốc để các trường là placeholder tĩnh (nút "Thêm đối tác" chỉ đóng
// modal, không lưu dữ liệu thật) — giữ nguyên hành vi đó.
export function AddPartnerModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="Thêm đối tác mới"
      onClose={onClose}
      width={520}
      footer={
        <>
          <ButtonGhost onClick={onClose}>Hủy</ButtonGhost>
          <ButtonPrimary onClick={onClose}>Thêm đối tác</ButtonPrimary>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <label className="block cursor-pointer rounded-[10px] border border-dashed border-pms-muted-2 p-4 text-center text-[13px] text-pms-muted">
          📷 Tải lên hình ảnh đối tác (logo, không gian, dịch vụ)
          <input type="file" accept="image/*" multiple className="hidden" />
        </label>
        <div>
          <label className="mb-1.5 block text-[12px]">Tên đối tác</label>
          <FieldBox placeholder>VD: Spa Hương Sen</FieldBox>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Loại hình dịch vụ</label>
          <div className="flex justify-between rounded-lg border border-pms-border px-3 py-2.5 text-[13px] text-pms-muted-2">
            Chọn loại hình <span>⌄</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12px]">Khoảng cách</label>
            <FieldBox placeholder>VD: 150m</FieldBox>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px]">Hoa hồng</label>
            <FieldBox placeholder>VD: 10%</FieldBox>
          </div>
        </div>
        <div className="border-t border-pms-divider pt-3.5">
          <b className="text-[13.5px]">Thông tin liên hệ</b>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Địa chỉ</label>
          <FieldBox placeholder>Nhập địa chỉ đối tác</FieldBox>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[12px]">Số điện thoại</label>
            <FieldBox placeholder>Số điện thoại</FieldBox>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px]">Email</label>
            <FieldBox placeholder>email@doitac.vn</FieldBox>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[12px]">Người liên hệ</label>
          <FieldBox placeholder>Họ tên người phụ trách</FieldBox>
        </div>
      </div>
    </Modal>
  );
}
