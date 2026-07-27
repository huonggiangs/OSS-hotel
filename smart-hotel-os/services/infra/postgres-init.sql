-- ============================================================================
-- Khởi tạo 4 role + 4 database riêng biệt trên MỘT instance PostgreSQL dùng
-- chung, mỗi service (channel-manager/ai-pricing/iot/crm) có database RIÊNG,
-- KHÔNG chia sẻ bảng/schema với nhau (đúng yêu cầu "KHÔNG chung database với
-- nhau" của nhiệm vụ) — chỉ dùng chung 1 tiến trình Postgres để tiết kiệm tài
-- nguyên khi chạy demo cục bộ bằng docker compose. Xem lý do đầy đủ ở
-- services/PROGRESS.md mục "Quyết định kiến trúc — hạ tầng Postgres".
--
-- File này được Postgres image chính thức tự động chạy 1 LẦN DUY NHẤT khi
-- volume dữ liệu còn trống (cơ chế /docker-entrypoint-initdb.d/ chuẩn).
-- ============================================================================

CREATE USER channel_manager WITH PASSWORD 'channel_manager';
CREATE DATABASE channel_manager OWNER channel_manager;

CREATE USER ai_pricing WITH PASSWORD 'ai_pricing';
CREATE DATABASE ai_pricing OWNER ai_pricing;

CREATE USER iot_service WITH PASSWORD 'iot_service';
CREATE DATABASE iot_service OWNER iot_service;

CREATE USER crm_service WITH PASSWORD 'crm_service';
CREATE DATABASE crm_service OWNER crm_service;
