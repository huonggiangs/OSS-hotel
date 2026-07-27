# Acceptance Criteria — MVP (Giai đoạn 1)

MVP chỉ được coi là hoàn thành khi chứng minh được toàn bộ luồng sau bằng test có bằng chứng (không tuyên bố xong nếu chưa test), theo đúng nguyên tắc đã áp dụng ở `kiosk.md` mục 23.

1. Super Admin tạo một tenant (khách hàng) và một property.
2. Property Manager đăng nhập Property Web, tạo loại phòng và phòng.
3. Front Desk tạo booking cho khách qua Property Web.
4. Front Desk thực hiện walk-in check-in trực tiếp, không cần booking trước.
5. Check-in cập nhật đúng trạng thái phòng sang `OCCUPIED` và phát sự kiện.
6. (Nếu Gói 3 bật) IoT Service nhận sự kiện check-in và gửi lệnh bật điện/điều hòa cho phòng, ghi nhận trạng thái thành công.
7. Front Desk thực hiện check-out, hệ thống tính đúng phụ phí nếu có.
8. Check-out cập nhật trạng thái phòng sang `VACANT_DIRTY` và (nếu Gói 3) IoT tắt điện sau thời gian cấu hình.
9. Housekeeping Mobile App hiển thị đúng phòng cần dọn theo thời gian thực, nhân viên đánh dấu hoàn thành, trạng thái đồng bộ về `VACANT_CLEAN`.
10. Revenue Dashboard trên Property Web hiển thị đúng doanh thu, occupancy, ADR, RevPAR cho ngày vừa test.
11. Owner Mobile App hiển thị đúng dữ liệu tổng hợp của property (và nhiều property nếu test multi-property).
12. (Nếu Gói 2 bật) Channel Manager đồng bộ đúng một thay đổi giá/tồn phòng sang OTA giả lập (sandbox/mock).
13. (Nếu Gói 2 bật) Tạo booking song song từ OTA giả lập và Direct Booking cho cùng phòng cuối cùng — hệ thống từ chối một trong hai, không double-book.
14. (Nếu Gói 2 bật) Một booking trực tiếp qua Direct Booking Engine hoàn tất thanh toán (sandbox) và xuất hiện đúng ở PMS Core.
15. (Nếu Gói 2 bật) AI Pricing Engine sinh đề xuất giá rule-based đúng theo cấu hình, quản lý duyệt áp dụng thành công.
16. (Nếu Gói 3 bật) CRM Service gửi đúng campaign cảm ơn sau một check-out giả lập.
17. Ngắt kết nối Internet tại Edge Node giả lập, vẫn thực hiện được check-in/check-out; khi có mạng lại, dữ liệu đồng bộ đúng lên Cloud Core.
18. Toàn bộ 17 bước trên đều xuất hiện đầy đủ, chính xác trong Audit Log kèm người/thời gian.
19. Một tài khoản `FRONT_DESK` không thể truy cập cấu hình giá/tenant/billing (kiểm tra permission ở backend, không chỉ ẩn UI).
20. Một request không có quyền/không đúng scope tới API tích hợp bên thứ 3 (giả lập vai trò Kiosk vendor) bị từ chối đúng theo `PERMISSION_MATRIX.md`.

Không được tuyên bố MVP hoàn thành nếu chưa có bằng chứng test cho đủ 20 tiêu chí trên (điều chỉnh số thứ tự nếu một số tiêu chí không áp dụng do gói dịch vụ khách hàng chọn chỉ ở Gói 1).
