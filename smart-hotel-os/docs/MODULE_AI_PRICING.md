# Module Spec — AI Pricing Engine

## 1. Nguyên tắc chung

Giá đề xuất luôn ở trạng thái **suggestion**, không tự động ghi đè giá đang bán trừ khi property chủ động bật chế độ tự động áp dụng (auto-apply, tuỳ chọn nâng cao ở Phase 2, có thể tắt bất kỳ lúc nào). Mọi giá áp dụng cuối cùng phải truy vết được: rule nào/mô hình nào tạo ra, ai duyệt (hoặc hệ thống tự áp dụng theo cấu hình nào).

## 2. Phase 1 — Rule-based

### Input
- Tỷ lệ lấp phòng hiện tại và dự kiến (từ PMS Core).
- Ngày trong tuần / cuối tuần / lễ tết (bảng sự kiện cấu hình được).
- Khoảng cách tới ngày check-in (lead time).

### Rule ví dụ (cấu hình được qua `pricing_rules`, không hard-code)
```
IF ngày_trong_tuần IN [Thứ 6, Thứ 7] THEN giá = giá_cơ_bản * 1.3
IF occupancy_dự_kiến > 80% THEN giá = giá_cơ_bản * 1.2
IF là_ngày_lễ THEN giá = giá_cơ_bản * 1.6
IF lead_time < 1 ngày AND occupancy < 50% THEN giá = giá_cơ_bản * 0.85   -- giải phóng tồn phòng cận ngày
```

### Output
Bảng giá đề xuất theo ngày (và theo giờ nếu property bán theo giờ) cho từng loại phòng, hiển thị trên Property Web để quản lý duyệt/áp dụng.

## 3. Phase 2 — Mô hình dự đoán

### Input bổ sung
- Lịch sử giá và tỷ lệ lấp phòng theo thời gian (time-series nội bộ).
- Giá đối thủ (`competitor_prices` — thu thập qua tích hợp/dịch vụ bên thứ ba, cần xác nhận nguồn dữ liệu hợp pháp trước khi triển khai, ghi giả định ở `ASSUMPTIONS.md` nếu chưa có nguồn xác định).
- Sự kiện khu vực (lễ hội, hội nghị) — nguồn dữ liệu cần xác nhận, tương tự.

### Output
Giống Phase 1 nhưng độ chính xác cao hơn nhờ mô hình học từ dữ liệu lịch sử; vẫn hiển thị lý do đề xuất ở mức tối thiểu (yếu tố ảnh hưởng chính) để người dùng tin tưởng, không phải hộp đen hoàn toàn.

## 4. Vòng đời một đề xuất giá

```
pricing_inputs_daily thu thập → tính price_suggestion → hiển thị Property Web
   → Quản lý duyệt (apply) hoặc chỉnh tay (override) hoặc bỏ qua
   → nếu apply: cập nhật rate_plans ở PMS Core → Channel Manager đồng bộ OTA
```

## 5. Ràng buộc

1. Không tự đẩy giá ra OTA nếu chưa qua bước duyệt ở Phase 1.
2. Mọi override thủ công phải lưu lại (`price_suggestion_overrides`) để dùng làm dữ liệu huấn luyện và để audit.
3. Nếu thiếu dữ liệu đầu vào (vd. chưa có giá đối thủ), hệ thống phải giảm cấp về rule-based, không được trả lỗi hoặc giá rỗng.

## 6. Tiêu chí chấp nhận module

1. Với dữ liệu occupancy giả lập, hệ thống sinh đúng giá theo rule cấu hình.
2. Quản lý áp dụng một đề xuất giá và giá đó phản ánh đúng ở PMS Core và (nếu Gói 2+) đồng bộ OTA.
3. Ghi nhận đầy đủ lịch sử đề xuất/áp dụng/override để làm bằng chứng "tăng doanh thu 10–25%" cho khách hàng.
