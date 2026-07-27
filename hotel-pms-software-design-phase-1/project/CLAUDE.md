## Quy tắc chuẩn cho dự án Hotel PMS

Sau MỖI lần chỉnh sửa giao diện/logic trong `Hotel PMS.dc.html` (thêm màn hình, đổi bố cục, thêm popup, đổi field dữ liệu...), PHẢI cập nhật lại `BA - Luong nghiep vu PMS.dc.html` cho khớp:
- Tài liệu BA tách riêng theo 5 phần vai trò: PO, PM, UI, UX, DEV (giữ đúng cấu trúc h2 hiện có, không tạo file mới).
- Cập nhật đúng phần bị ảnh hưởng (không cần viết lại toàn bộ tài liệu mỗi lần — dùng dc_html_str_replace để sửa đúng đoạn liên quan).
- Luôn thêm 1 dòng mới vào bảng "Nhật ký cập nhật" (mục cuối tài liệu) với: ngày, màn hình/khu vực thay đổi, mô tả ngắn gọn.
- Không tự xoá các luồng/quy tắc nghiệp vụ cũ trừ khi tính năng tương ứng đã bị gỡ khỏi prototype.
