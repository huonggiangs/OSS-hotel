"use client";

import { useState } from "react";
import { photoGalleryCount, roomImageTypes } from "@/lib/mock-data";
import { PhotoUploadModal } from "@/components/images/PhotoUploadModal";

// Trang "Hình ảnh" (mở từ panel Cài đặt) — pixel-perfect theo khối `isImages` (dòng
// 1662-1690 bản gốc): thư viện ảnh cơ sở + hình ảnh theo từng loại phòng.
export default function ImagesPage() {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div>
      <div className="rounded-xl bg-white p-6 shadow-card">
        <h3 className="mb-1 text-[20px] font-bold">Thư viện ảnh</h3>
        <p className="mb-4 text-[13px] text-pms-text">
          Giới thiệu về thông tin cơ sở lorem ipsum dolor sit amet consectetuer adipiscing elit
        </p>
        <div className="mb-7 flex gap-4">
          {Array.from({ length: photoGalleryCount }, (_, i) => (
            <div key={i} className="h-[150px] w-[150px] flex-shrink-0 rounded-[10px] border border-dashed border-pms-border bg-pms-divider" />
          ))}
          <div
            className="flex h-[150px] w-[150px] flex-shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-dashed border-pms-muted-2 text-[12px] text-pms-muted"
            onClick={() => setShowUpload(true)}
          >
            + Tải ảnh
          </div>
        </div>

        <div className="mb-1 flex items-center justify-between">
          <h3 className="m-0 text-[15px] font-semibold">Hình ảnh phòng</h3>
          <div className="cursor-pointer rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white">+ Thêm</div>
        </div>
        <p className="mb-4 text-[13px] text-pms-text">
          Giới thiệu về thông tin cơ sở lorem ipsum dolor sit amet consectetuer adipiscing elit
        </p>
        {roomImageTypes.map((rt) => (
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
