-- Mobile workforce: kỹ thuật viên cần quyền riêng để cấu hình/ghép thiết bị.
ALTER TYPE "PropertyUserRole" ADD VALUE IF NOT EXISTS 'TECHNICIAN';
