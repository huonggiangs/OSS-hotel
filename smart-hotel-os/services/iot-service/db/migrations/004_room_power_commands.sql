-- Lệnh cấp điện theo lưu trú cho bộ điều khiển nhiều kênh (Anionote): nhận/trả phòng, gia hạn, xác nhận sự cố,
-- chuyển kênh/phòng giữ giờ còn lại. Đích đặt trong payload: {channel} (0..15) hoặc {room} (số phòng PMS) / {roomId}.
ALTER TYPE "CommandType" ADD VALUE IF NOT EXISTS 'CHECKIN';      -- {room|channel, until_unix|minutes}
ALTER TYPE "CommandType" ADD VALUE IF NOT EXISTS 'CHECKOUT';     -- {room|channel}
ALTER TYPE "CommandType" ADD VALUE IF NOT EXISTS 'TIME_GRANT';   -- {room|channel, minutes}
ALTER TYPE "CommandType" ADD VALUE IF NOT EXISTS 'TIME_CANCEL';  -- {room|channel}
ALTER TYPE "CommandType" ADD VALUE IF NOT EXISTS 'CLEAR_TRIP';   -- {channel}
ALTER TYPE "CommandType" ADD VALUE IF NOT EXISTS 'MOVE';         -- {channel, to}
ALTER TYPE "CommandType" ADD VALUE IF NOT EXISTS 'ROOM_MOVE';    -- {room, to_room}
