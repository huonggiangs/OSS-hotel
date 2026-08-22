"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PhotoUploadModal, type UploadedPropertyImage } from "@/components/images/PhotoUploadModal";
import { api, isApiError } from "@/lib/api-client";

interface RoomType {
  id: string;
  name: string;
}

interface UploadTarget {
  roomTypeId: string | null;
  label: string;
}

export default function ImagesPage() {
  const [images, setImages] = useState<UploadedPropertyImage[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadTarget, setUploadTarget] = useState<UploadTarget | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [imagesResponse, roomTypesResponse] = await Promise.all([
        api.get<{ items: UploadedPropertyImage[] }>("/api/v1/property-images"),
        api.get<{ items: RoomType[] }>("/api/v1/room-types"),
      ]);
      setImages(imagesResponse.items);
      setRoomTypes(roomTypesResponse.items);
    } catch (loadError) {
      setError(isApiError(loadError) ? loadError.message : "Không tải được thư viện ảnh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const propertyImages = useMemo(() => images.filter((image) => image.room_type_id === null), [images]);
  const imagesByRoomType = useMemo(() => new Map(roomTypes.map((roomType) => [roomType.id, images.filter((image) => image.room_type_id === roomType.id)])), [images, roomTypes]);

  return (
    <div>
      <div className="rounded-xl bg-white p-6 shadow-card">
        <h3 className="mb-1 text-[20px] font-bold">Thư viện ảnh</h3>
        <p className="mb-4 text-[13px] text-pms-text">Ảnh giới thiệu cơ sở được lưu an toàn trong cơ sở dữ liệu.</p>
        {error && <p className="mb-4 text-[13px] text-pms-danger">{error}</p>}
        {loading ? <p className="text-[13px] text-pms-muted">Đang tải...</p> : <ImageCollection images={propertyImages} onUpload={() => setUploadTarget({ roomTypeId: null, label: "cơ sở" })} />}

        <div className="mb-1 mt-8 flex items-center justify-between">
          <h3 className="m-0 text-[15px] font-semibold">Hình ảnh phòng</h3>
          <button type="button" disabled={roomTypes.length === 0} onClick={() => roomTypes[0] && setUploadTarget({ roomTypeId: roomTypes[0].id, label: roomTypes[0].name })} className="rounded-[10px] bg-pms-primary px-[18px] py-2.5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">+ Thêm</button>
        </div>
        <p className="mb-4 text-[13px] text-pms-text">Chọn loại phòng rồi thêm ảnh để khách nhận diện đúng hạng phòng.</p>
        {!loading && roomTypes.length === 0 && <p className="text-[13px] text-pms-muted">Chưa có loại phòng để thêm ảnh.</p>}
        {!loading && roomTypes.map((roomType) => <div key={roomType.id} className="mb-5"><div className="mb-3 text-[16px] font-medium">{roomType.name}</div><ImageCollection images={imagesByRoomType.get(roomType.id) ?? []} onUpload={() => setUploadTarget({ roomTypeId: roomType.id, label: roomType.name })} /></div>)}
      </div>

      {uploadTarget && <PhotoUploadModal roomTypeId={uploadTarget.roomTypeId} targetLabel={uploadTarget.label} onClose={() => setUploadTarget(null)} onUploaded={(image) => setImages((current) => [...current, image])} />}
    </div>
  );
}

function ImageCollection({ images, onUpload }: { images: UploadedPropertyImage[]; onUpload: () => void }) {
  return <div className="flex flex-wrap gap-4">{images.map((image) => <div key={image.id} className="h-[150px] w-[150px] overflow-hidden rounded-[10px] border border-pms-border bg-pms-divider"><img src={image.data_url} alt={image.file_name} className="h-full w-full object-cover" /></div>)}<button type="button" onClick={onUpload} className="flex h-[150px] w-[150px] items-center justify-center rounded-[10px] border border-dashed border-pms-muted-2 text-[12px] text-pms-muted hover:bg-pms-divider">+ Tải ảnh</button></div>;
}
