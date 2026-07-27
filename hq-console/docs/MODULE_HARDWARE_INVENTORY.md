# Module Spec — Quản lý thiết bị phần cứng (Hardware Inventory)

## 1. Phạm vi

Theo dõi **tài sản vật lý** xuyên suốt vòng đời: kiosk, máy đọc hộ chiếu, máy quét QR, máy phát thẻ, cảm biến IoT, bộ điều khiển điện/điều hòa — mọi phần cứng công ty mua vào, lắp đặt, bảo hành, thu hồi. Khác với dữ liệu "thiết bị đang hoạt động" (online/offline, heartbeat) đã có sẵn trong Kiosk Remote Management — module này là góc nhìn chuỗi cung ứng/kế toán tài sản, liên kết mềm tới `device_id` khi thiết bị đã kích hoạt phần mềm.

## 2. Vòng đời tài sản

```
NHẬP KHO (từ purchase_order) → TRONG KHO → XUẤT KHO → LẮP ĐẶT TẠI KHÁCH HÀNG
   → (liên kết device_id nếu là thiết bị có kích hoạt phần mềm)
   → BẢO HÀNH/BẢO TRÌ (nếu có claim) → THU HỒI / THANH LÝ
```

## 3. Dữ liệu mỗi tài sản (`hardware_assets`)

Loại thiết bị, hãng, model, số serial, nhà cung cấp, giá nhập, ngày nhập kho, vị trí kho hiện tại (hoặc khách hàng đang lắp đặt), trạng thái, thời hạn bảo hành, `device_id` liên kết (nếu có).

## 4. Chức năng

1. Tạo đơn mua hàng (`purchase_orders`) tới nhà cung cấp, nhận hàng vào kho, tự động sinh bản ghi `hardware_assets` theo số lượng nhận.
2. Xuất kho gán cho một khách hàng/đơn triển khai cụ thể.
3. Khi thiết bị được kích hoạt bên Kiosk (webhook `device.activated`), tự động liên kết `device_id` vào `hardware_assets` tương ứng theo số serial nhập tay lúc lắp đặt (đối soát thủ công nếu không khớp tự động).
4. Ghi nhận yêu cầu bảo hành (`warranty_claims`): mô tả lỗi, nhà cung cấp xử lý, chi phí, thời gian xử lý.
5. Báo cáo tồn kho theo loại thiết bị, cảnh báo tồn kho thấp.
6. Báo cáo chi phí phần cứng theo khách hàng/đơn triển khai (input cho tính giá gói bán).

## 5. Tiêu chí chấp nhận

1. Tạo đơn mua hàng, nhận hàng, số lượng `hardware_assets` sinh ra khớp đơn hàng.
2. Xuất kho một thiết bị cho khách hàng, sau đó thiết bị đó kích hoạt bên Kiosk (giả lập) → liên kết `device_id` thành công.
3. Tạo yêu cầu bảo hành và theo dõi được trạng thái tới khi đóng.
4. Báo cáo tồn kho phản ánh đúng số lượng thực tế sau các giao dịch nhập/xuất.
