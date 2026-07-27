# ai-pricing-service

Đặc tả nghiệp vụ đầy đủ: `../../docs/MODULE_AI_PRICING.md` (Phase 1 — rule-based).

## Việc service này làm

- Lưu cấu hình `pricing_rules` theo property/room-type (giá cơ bản, biên min/max, hệ số cuối tuần, hệ số occupancy, ngày lễ, hệ số giải phóng tồn phòng cận ngày).
- Thuật toán rule-based thật ở `src/pricing/engine.ts` (hàm thuần, không phụ thuộc DB) — nhân dồn các hệ số áp dụng được rồi kẹp vào biên min/max, trả kèm lý do (`reason`) cho từng ngày.
- `POST /pricing/suggest` trả giá đề xuất cho từng ngày trong khoảng, lưu lại lịch sử vào `pricing_suggestions`.
- Giá đề xuất luôn là **suggestion** — service này không tự ghi đè giá bán ở PMS Core (đúng MODULE_AI_PRICING.md mục 1).

## Chứng minh thuật toán đúng

```powershell
npm install
npm run demo:pricing
```

Script `scripts/demo-pricing.ts` chạy 8 kịch bản (ngày thường, cuối tuần, occupancy cao, ngày lễ, giải phóng tồn phòng cận ngày, kết hợp nhiều rule, kẹp trần/sàn giá) và assert kết quả bằng `node:assert/strict` — không cần DB.

## Chạy API cục bộ (Windows)

PowerShell:
```powershell
Copy-Item .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

Mặc định chạy ở cổng 4102 (`http://localhost:4102/health`).

## Giới hạn hiện tại

Xem `../PROGRESS.md` — Phase 2 (mô hình dự đoán học từ lịch sử + giá đối thủ) chưa làm, đúng theo lộ trình MODULE_AI_PRICING.md mục 3.
