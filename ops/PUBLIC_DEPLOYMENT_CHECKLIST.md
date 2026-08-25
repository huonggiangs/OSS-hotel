# Checklist triển khai website public và cập nhật không gián đoạn

Môi trường Docker hiện tại là **môi trường LAN/MVP**, không được đưa thẳng ra
Internet. Checklist này là điều kiện tối thiểu trước khi công khai HQ Console,
Property Web hoặc webhook thanh toán.

## 1. Hạ tầng và mạng

- [ ] Máy chủ/VPS Linux có địa chỉ IP tĩnh, backup ngoài máy chủ và giám sát cơ bản.
- [ ] DNS riêng cho từng app, ví dụ `hq.example.com`, `pms.example.com`, `edge.example.com`.
- [ ] Reverse proxy (Caddy/Nginx/Traefik) là cổng duy nhất công khai: HTTPS 443,
  redirect 80 → 443; không public trực tiếp các cổng API 4000–4104 hay PostgreSQL.
- [ ] TLS tự động (Let's Encrypt), HSTS, rate-limit/WAF và firewall chỉ cho 80/443,
  SSH quản trị giới hạn IP/VPN.
- [ ] `WEB_ORIGIN`, URL public webhook SePay và mọi secret production được đặt theo
  domain thật, không dùng giá trị demo/local.

## 2. Dữ liệu và bảo mật

- [ ] Thay toàn bộ mật khẩu demo, JWT, API key, khóa mã hóa; lưu trong secret manager.
- [ ] Backup PostgreSQL hằng ngày, mã hóa, giữ bản offsite; diễn tập restore định kỳ.
- [ ] Phân quyền RBAC, audit log, chính sách lưu dữ liệu và kiểm tra webhook signature.
- [ ] Scan dependency/container image, xác minh migration trên staging trước production.

## 3. Zero-downtime thật sự

Một container cho mỗi web/API như hiện tại sẽ có một khoảng ngắt ngắn khi image
được thay. Watcher trong `ops/scripts/Watch-Oss.ps1` tự kiểm tra type rồi cập
nhật bản LAN, nhưng **không thể cam kết zero-downtime tuyệt đối** với một replica.

- [ ] Tách production thành ít nhất 2 replica stateless cho mỗi web/API phía sau
  reverse proxy/load balancer.
- [ ] Dùng blue-green hoặc rolling deployment: build image bất biến có version,
  chạy healthcheck/migration tương thích ngược, chuyển traffic sau khi instance
  mới healthy, rồi mới dừng instance cũ.
- [ ] Migrations phải expand/contract: thêm schema trước, deploy code mới, chỉ xóa
  cột/bảng ở lượt phát hành sau; có rollback image và restore backup kiểm chứng.
- [ ] CI chạy typecheck, build, test integration/E2E và security scan trước deploy;
  CD chỉ nhận image đã qua các bước đó, không deploy trực tiếp file đang lưu dở.

## 4. Nghiệm thu trước công khai

- [ ] Đăng nhập, phân quyền, CRUD cốt lõi, upload ảnh, QR khách, backup/export data.
- [ ] Thanh toán SePay sandbox + webhook public HTTPS có signature/idempotency.
- [ ] Mất mạng Edge Node, recovery và đồng bộ lại; kiểm thử từ máy/điện thoại LAN.
- [ ] Monitoring endpoint, log tập trung, cảnh báo khi healthcheck/deploy/backup lỗi.
