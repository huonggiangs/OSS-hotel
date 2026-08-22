"use client";

import { ChangeEvent, useState } from "react";
import { api, isApiError } from "@/lib/api-client";
import { Modal, ButtonGhost, ButtonPrimary } from "@/components/ui/Modal";

const MAX_IMAGE_BYTES = 1024 * 1024;

export interface UploadedPropertyImage {
  id: string;
  property_id: string;
  room_type_id: string | null;
  room_type_name: string | null;
  file_name: string;
  mime_type: "image/png" | "image/jpeg" | "image/webp";
  data_url: string;
  created_at: string;
}

interface PhotoUploadModalProps {
  roomTypeId: string | null;
  targetLabel: string;
  onClose: () => void;
  onUploaded: (image: UploadedPropertyImage) => void;
}

export function PhotoUploadModal({ roomTypeId, targetLabel, onClose, onUploaded }: PhotoUploadModalProps) {
  const [dataUrl, setDataUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [mimeType, setMimeType] = useState<UploadedPropertyImage["mime_type"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Vui lòng chọn ảnh PNG, JPG hoặc WebP.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Mỗi ảnh tối đa 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setDataUrl(reader.result);
      setFileName(file.name);
      setMimeType(file.type as UploadedPropertyImage["mime_type"]);
      setError(null);
    };
    reader.onerror = () => setError("Không thể đọc ảnh đã chọn.");
    reader.readAsDataURL(file);
  }

  async function upload() {
    if (!dataUrl || !mimeType) {
      setError("Hãy chọn một ảnh trước khi tải lên.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const image = await api.post<UploadedPropertyImage>("/api/v1/property-images", { roomTypeId, fileName, mimeType, dataUrl });
      onUploaded(image);
      onClose();
    } catch (uploadError) {
      setError(isApiError(uploadError) ? uploadError.message : "Tải ảnh thất bại. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal
      title={`Thêm ảnh — ${targetLabel}`}
      onClose={onClose}
      width={400}
      footer={<><ButtonGhost onClick={onClose}>Hủy</ButtonGhost><ButtonPrimary onClick={upload}>{uploading ? "Đang tải..." : "Thêm ảnh"}</ButtonPrimary></>}
    >
      <div className="flex flex-col gap-3.5 px-6 py-5">
        <label className="block cursor-pointer rounded-[10px] border border-dashed border-pms-muted-2 p-6 text-center text-[13px] text-pms-muted">
          📁 Chọn ảnh từ máy tính
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFileChange} />
        </label>
        <p className="text-[12px] text-pms-muted">PNG, JPG hoặc WebP · tối đa 1 MB</p>
        {dataUrl && <img src={dataUrl} alt="Xem trước ảnh tải lên" className="h-40 w-full rounded-lg border border-pms-border object-cover" />}
        {fileName && <p className="text-[12px] text-pms-text">{fileName}</p>}
        {error && <p className="text-[12px] text-pms-danger">{error}</p>}
      </div>
    </Modal>
  );
}
