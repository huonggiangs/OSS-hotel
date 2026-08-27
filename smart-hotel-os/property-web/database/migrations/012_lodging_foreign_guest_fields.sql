-- Property Web — Migration 012: trường bắt buộc riêng khi khai báo tạm trú cho
-- người nước ngoài. Không dùng chung với ngày hết hạn hộ chiếu vì đây là hạn
-- chứng nhận/gia hạn tạm trú hoặc thẻ tạm trú do cơ quan có thẩm quyền cấp.
ALTER TABLE "booking_guest_details"
  ADD COLUMN "temporary_residence_expires_at" DATE;
