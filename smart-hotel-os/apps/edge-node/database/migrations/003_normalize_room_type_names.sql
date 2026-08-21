-- Edge bootstrap và Cloud có thể tạo cùng một room type với ID khác nhau.
-- Chuẩn hóa theo khóa nghiệp vụ (property_id, name), đổi toàn bộ phòng sang ID
-- canonical trước khi xóa bản dư, rồi bảo vệ bằng unique index.
WITH canonical AS (
  SELECT property_id, name, MIN(id) AS canonical_id
  FROM room_types
  GROUP BY property_id, name
), remap AS (
  SELECT rt.id AS duplicate_id, c.canonical_id
  FROM room_types rt
  JOIN canonical c ON c.property_id = rt.property_id AND c.name = rt.name
  WHERE rt.id <> c.canonical_id
)
UPDATE rooms r
SET room_type_id = remap.canonical_id
FROM remap
WHERE r.room_type_id = remap.duplicate_id;

WITH canonical AS (
  SELECT property_id, name, MIN(id) AS canonical_id
  FROM room_types
  GROUP BY property_id, name
)
DELETE FROM room_types rt
USING canonical c
WHERE rt.property_id = c.property_id
  AND rt.name = c.name
  AND rt.id <> c.canonical_id;

CREATE UNIQUE INDEX IF NOT EXISTS room_types_property_name_key
  ON room_types(property_id, name);
