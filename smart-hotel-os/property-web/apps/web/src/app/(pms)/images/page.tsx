"use client";

import { useState } from "react";
import { PhotoUploadModal } from "@/components/images/PhotoUploadModal";
import { useSettings } from "@/lib/useSettings";

// Trang "Hình ảnh" — ĐÃ NỐI API THẬT (đọc): property_settings nhóm "images"
// (galleryCount + roomTypes). Chưa có kho lưu trữ file thật (S3/CDN) nên
// chưa upload được ảnh thật — các ô ảnh vẫn là khung placeholder tĩnh đúng
// bản gốc, chỉ SỐ LƯỢNG khung/loại phòng lấy từ DB thay vì hard-code.
interface RoomImageType {
  name: string;
  photoCount: number;
}
interface ImagesData {
  galleryCount: number;
  roomTypes: RoomImageType[];
}
const FALLBACK: ImagesData = { galleryCount: 5, roomTypes: [] };

export default function ImagesPage() {
  const { data, loading } = useSettings<ImagesData>("images", FALLBACK);
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div>
      <div className="rounded-xl bg-white p-6 shadow-card">
        <h3 className="mb-1 text-[20px] font-bold">Thư viện ảnh</h3>
        <p className="mb-4 text-[13px] text-pms-text">
          Giới thiệu về thông tin cơ sở lorem ipsum dolor sit amet consectetuer adipiscing elit
        </p>
        {!loading && (
          <div className="mb-7 flex gap-4">
            {Array.from({ length: data.galleryCount }, (_, i) => (
              <div key={i} className="h-[150px] w-[150px] flex-shrink-0 rounded-[10px] border border-dashed border-pms-border bg-pms-divider" />
            ))}
            <div
              className="flex h-[150px] w-[150px] flex-shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-dashed border-pms-muted-2 text-[12px] text-pms-muted"
              onClick={() => setShowUpload(true)}
            >
              + Tải ảnh
            </div>
          </div>
        )}

        <div className="mb-1 flex items-center justify-between">
          <h3 className="m-0 text-[15px] font-semibold">Hình ảnh phòng</h3>
          <div className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white">+ Thêm</div>
        </div>
        <p className="mb-4 text-[13px] text-pms-text">
          Giới thiệu về thông tin cơ sở lorem ipsum dolor sit amet consectetuer adipiscing elit
        </p>
        {!loading &&
          data.roomTypes.map((rt) => (
            <div key={rt.name} className="mb-5">
              <div className="mb-3 text-[16px] font-medium">{rt.name}</div>
              <div className="flex gap-4">
                {Array.from({ length: rt.photoCount }, (_, i) => (
                  <div key={i} className="h-[150px] w-[150px] flex-shrink-0 rounded-[10px] border border-dashed border-pms-border bg-pms-divider" />
                ))}
                <div
                  className="flex h-[150px] w-[150px] flex-shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-dashed border-pms-muted-2 text-[12px] text-pms-muted"
                  onClick={() => setShowUpload(true)}
                >
                  + Tải ảnh
                </div>
              </div>
            </div>
          ))}
      </div>

      {showUpload && <PhotoUploadModal onClose={() => setShowUpload(false)} />}
    </div>
  );
}
