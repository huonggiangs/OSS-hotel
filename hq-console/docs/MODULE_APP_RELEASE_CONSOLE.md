# Module Spec — Release Console (tổng hợp ứng dụng)

## 1. Mục tiêu

Một màn hình duy nhất cho đội DevOps/Release Manager biết: khách hàng nào đang chạy phiên bản nào, trên ứng dụng nào — xuyên suốt cả bốn loại client (Windows Kiosk App, Windows PMS App, Owner Mobile, Housekeeping Mobile) và hai web admin — mà **không thay thế** cơ chế phát hành/rollout thật (vẫn nằm trong từng sản phẩm: Kiosk có Release/Update Campaign riêng theo `kiosk.md` mục 9–10; Smart Hotel OS quản lý version app riêng của mình).

## 2. Dữ liệu tổng hợp (`app_release_summary`)

Đồng bộ định kỳ từ Admin API của từng sản phẩm: tên ứng dụng, phiên bản đang chạy theo từng khách hàng/thiết bị, số lượng thiết bị theo từng phiên bản, phiên bản mới nhất đã publish, độ trễ cập nhật (số ngày kể từ khi bản mới nhất publish).

## 3. Chức năng

1. Bảng tổng hợp phân bố phiên bản theo ứng dụng (giống "Version distribution" đã có trong Kiosk Dashboard — `kiosk.md` mục 12, nhưng gộp cả app của Smart Hotel OS).
2. Cảnh báo (`release_alerts`) khi một khách hàng chạy bản quá cũ vượt ngưỡng cấu hình (vd. quá 2 phiên bản major hoặc quá 90 ngày).
3. Liên kết sâu (deep link) sang màn hình Update Campaign thật của từng sản phẩm để thao tác cập nhật — Release Console không tự gửi lệnh cập nhật, chỉ điều hướng.

## 4. Ràng buộc

- Không được thao tác cập nhật/rollback trực tiếp từ HQ Console — tránh hai nơi cùng có quyền gửi lệnh xuống thiết bị (rủi ro race condition với Update Campaign của Kiosk theo `kiosk.md` mục 21.9 "không thực hiện command trùng").

## 5. Tiêu chí chấp nhận

1. Bảng phân bố phiên bản phản ánh đúng dữ liệu tổng hợp từ hai sản phẩm (giả lập).
2. Cảnh báo bản cũ kích hoạt đúng ngưỡng cấu hình.
3. Liên kết sâu điều hướng đúng sang màn hình cập nhật của sản phẩm tương ứng.
