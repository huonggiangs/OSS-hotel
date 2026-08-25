# Quy ước chung cho mọi coding agent

Áp dụng cho Codex, Claude, Cursor và mọi người sửa trực tiếp workspace
`D:\hotel\OSS`.

1. Chỉ sửa source trong workspace này; không sửa trực tiếp file bên trong Docker
   container. Docker/LAN sẽ tự nhận source đã lưu qua `ops/scripts/Watch-Oss.ps1`.
2. Docker/LAN là bản dùng chung: HQ Console `3000`, PMS `3100`, Edge Node `4200`.
   API Docker chỉ dùng loopback. Kiểm tra bằng `ops/scripts/Get-OssStatus.ps1` và
   `ops/scripts/Test-OssLan.ps1`.
3. Chế độ dev không Docker dùng cổng riêng: HQ `13000/14000`, PMS `13100/14100`,
   Edge `14200`; chạy `start-all.ps1`. Có thể chạy song song Docker nhưng hai chế
   độ dùng database khác nhau (PGlite và PostgreSQL).
4. Watcher chỉ deploy sau typecheck. Nếu thay đổi `database/migrations/*.sql`,
   watcher tạo backup trước migration. Không chỉnh file migration đã áp dụng.
5. Trước thay đổi dữ liệu lớn/khó rollback, chạy `ops/scripts/Backup-Oss.ps1`.
   Không dùng `docker compose down -v` trừ khi được yêu cầu xóa dữ liệu.
6. Sau thay đổi, kiểm tra health/LAN; commit kèm mô tả rõ và push `main` khi đã
   được xác minh. Xem `ops/PUBLIC_DEPLOYMENT_CHECKLIST.md` trước khi public Internet.
