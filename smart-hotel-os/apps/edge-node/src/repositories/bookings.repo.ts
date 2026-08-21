import { randomUUID } from "node:crypto";
import { pool, type DbPool } from "../lib/db";
import { writeOutboxEvent } from "../utils/outbox";
import type { Booking, BookingChannel, BookingStatus } from "../types/domain";
import { Errors } from "../utils/errors";

export interface BookingInput {
  guestName?: string | null;
  guestPhone?: string | null;
  roomId?: string | null;
  channel?: BookingChannel;
  status?: BookingStatus;
  checkinDate: string;
  checkoutDate: string;
  totalPrice?: number;
  deposit?: number;
  notes?: string | null;
}

export interface BookingWithDetails extends Booking {
  room_number: string | null;
  room_type_name: string | null;
}

export const bookingsRepo = {
  async list(propertyId: string): Promise<BookingWithDetails[]> {
    const { rows } = await pool.query<BookingWithDetails>(
      `SELECT b.*, r.number AS room_number, rt.name AS room_type_name
       FROM bookings b
       LEFT JOIN rooms r ON r.id = b.room_id
       LEFT JOIN room_types rt ON rt.id = r.room_type_id
       WHERE b.property_id = $1
       ORDER BY b.created_at DESC`,
      [propertyId]
    );
    return rows;
  },

  async findById(propertyId: string, id: string): Promise<BookingWithDetails | null> {
    const { rows } = await pool.query<BookingWithDetails>(
      `SELECT b.*, r.number AS room_number, rt.name AS room_type_name
       FROM bookings b
       LEFT JOIN rooms r ON r.id = b.room_id
       LEFT JOIN room_types rt ON rt.id = r.room_type_id
       WHERE b.property_id = $1 AND b.id = $2`,
      [propertyId, id]
    );
    return rows[0] ?? null;
  },

  // nextCode NHẬN db (tx hoặc pool) thay vì luôn dùng `pool` trực tiếp — BẮT
  // BUỘC gọi bằng `tx` khi đang ở trong 1 transaction đang mở (xem create() bên
  // dưới): PGlite chạy trên 1 connection/worker duy nhất, gọi `pool.query`
  // song song trong lúc `pool.transaction()` đang giữ transaction sẽ bị treo
  // (deadlock) — không được lẫn lộn 2 nguồn.
  async nextCode(db: DbPool, propertyId: string): Promise<string> {
    const { rows } = await db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM bookings WHERE property_id = $1`, [
      propertyId,
    ]);
    const seq = Number(rows[0]?.count ?? 0) + 1;
    // Tiền tố "EN-" (Edge Node) phân biệt với mã "HD-" sinh ở Cloud property-web
    // — tránh trùng mã khi 1 booking tạo offline tại Edge Node rồi đồng bộ lên
    // Cloud (Cloud coi entity_id là khoá hợp nhất, không dựa vào format code).
    return `EN-${new Date().getFullYear()}${String(seq).padStart(3, "0")}`;
  },

  async create(propertyId: string, tenantId: string, createdBy: string | undefined, input: BookingInput): Promise<Booking> {
    return pool.transaction(async (tx) => {
      const id = randomUUID();
      const code = await this.nextCode(tx, propertyId);
      const { rows } = await tx.query<Booking>(
        `INSERT INTO bookings
          (id, property_id, tenant_id, code, guest_name, guest_phone, room_id, channel, status, checkin_date, checkout_date, total_price, deposit, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING *`,
        [
          id,
          propertyId,
          tenantId,
          code,
          input.guestName ?? null,
          input.guestPhone ?? null,
          input.roomId ?? null,
          input.channel ?? "DIRECT",
          input.status ?? "PENDING",
          input.checkinDate,
          input.checkoutDate,
          input.totalPrice ?? 0,
          input.deposit ?? 0,
          input.notes ?? null,
          createdBy ?? null,
        ]
      );
      const booking = rows[0];
      await writeOutboxEvent(tx, { entityType: "booking", entityId: booking.id, eventType: "BOOKING_CREATED", payload: booking });
      return booking;
    });
  },

  async update(propertyId: string, id: string, input: Partial<BookingInput>): Promise<Booking | null> {
    return pool.transaction(async (tx) => {
      const fields: string[] = [];
      const params: unknown[] = [];
      const map: Record<string, unknown> = {
        guest_name: input.guestName,
        guest_phone: input.guestPhone,
        room_id: input.roomId,
        channel: input.channel,
        status: input.status,
        checkin_date: input.checkinDate,
        checkout_date: input.checkoutDate,
        total_price: input.totalPrice,
        deposit: input.deposit,
        notes: input.notes,
      };
      for (const [col, val] of Object.entries(map)) {
        if (val !== undefined) {
          params.push(val);
          fields.push(`${col} = $${params.length}`);
        }
      }
      if (fields.length === 0) {
        const { rows } = await tx.query<Booking>(`SELECT * FROM bookings WHERE property_id = $1 AND id = $2`, [propertyId, id]);
        return rows[0] ?? null;
      }
      params.push(propertyId, id);
      const { rows } = await tx.query<Booking>(
        `UPDATE bookings SET ${fields.join(", ")}, updated_at = now()
         WHERE property_id = $${params.length - 1} AND id = $${params.length} RETURNING *`,
        params
      );
      const booking = rows[0] ?? null;
      if (booking) {
        await writeOutboxEvent(tx, { entityType: "booking", entityId: booking.id, eventType: "BOOKING_UPDATED", payload: booking });
      }
      return booking;
    });
  },

  // checkin — chuyển booking sang CHECKED_IN + phòng sang OCCUPIED, GHI 2 sự
  // kiện outbox (booking + room) TRONG CÙNG 1 transaction. Đây chính là bước
  // "Room assignment -> Card issuing / kích hoạt phòng" mô tả ở CLAUDE.md mục
  // 2.6/2.3 — tại Edge Node vẫn chạy được khi mất mạng vì hoàn toàn cục bộ.
  async checkin(propertyId: string, id: string): Promise<Booking> {
    return pool.transaction(async (tx) => {
      const { rows: existingRows } = await tx.query<Booking>(`SELECT * FROM bookings WHERE property_id = $1 AND id = $2`, [
        propertyId,
        id,
      ]);
      const existing = existingRows[0];
      if (!existing) throw Errors.notFound("đặt phòng");
      if (existing.status === "CHECKED_IN") return existing; // idempotent — gọi lại không lỗi
      if (existing.status === "CANCELLED" || existing.status === "CHECKED_OUT") {
        throw Errors.conflict(`Không thể check-in đặt phòng đang ở trạng thái ${existing.status}.`);
      }

      const { rows } = await tx.query<Booking>(
        `UPDATE bookings SET status = 'CHECKED_IN', updated_at = now() WHERE property_id = $1 AND id = $2 RETURNING *`,
        [propertyId, id]
      );
      const booking = rows[0];
      await writeOutboxEvent(tx, { entityType: "booking", entityId: booking.id, eventType: "BOOKING_CHECKED_IN", payload: booking });

      if (booking.room_id) {
        const { rows: roomRows } = await tx.query(
          `UPDATE rooms SET status = 'OCCUPIED', power_on = true, updated_at = now() WHERE id = $1 RETURNING *`,
          [booking.room_id]
        );
        if (roomRows[0]) {
          await writeOutboxEvent(tx, { entityType: "room", entityId: booking.room_id, eventType: "ROOM_STATUS_CHANGED", payload: roomRows[0] });
        }
      }
      return booking;
    });
  },

  // checkout — chuyển booking sang CHECKED_OUT + phòng sang DIRTY (chờ dọn) và
  // TẮT điện/thiết bị (IoT rule "Turn off after checkout" — CLAUDE.md mục 2.5).
  async checkout(propertyId: string, id: string): Promise<Booking> {
    return pool.transaction(async (tx) => {
      const { rows: existingRows } = await tx.query<Booking>(`SELECT * FROM bookings WHERE property_id = $1 AND id = $2`, [
        propertyId,
        id,
      ]);
      const existing = existingRows[0];
      if (!existing) throw Errors.notFound("đặt phòng");
      if (existing.status === "CHECKED_OUT") return existing; // idempotent
      if (existing.status !== "CHECKED_IN") {
        throw Errors.conflict(`Chỉ có thể check-out đặt phòng đang CHECKED_IN (hiện tại: ${existing.status}).`);
      }

      const { rows } = await tx.query<Booking>(
        `UPDATE bookings SET status = 'CHECKED_OUT', updated_at = now() WHERE property_id = $1 AND id = $2 RETURNING *`,
        [propertyId, id]
      );
      const booking = rows[0];
      await writeOutboxEvent(tx, { entityType: "booking", entityId: booking.id, eventType: "BOOKING_CHECKED_OUT", payload: booking });

      if (booking.room_id) {
        const { rows: roomRows } = await tx.query(
          `UPDATE rooms SET status = 'DIRTY', power_on = false, updated_at = now() WHERE id = $1 RETURNING *`,
          [booking.room_id]
        );
        if (roomRows[0]) {
          await writeOutboxEvent(tx, { entityType: "room", entityId: booking.room_id, eventType: "ROOM_STATUS_CHANGED", payload: roomRows[0] });
        }
        // Tắt mọi thiết bị công tắc điện của phòng — quy tắc IoT "Turn off after
        // checkout" (CLAUDE.md mục 2.5). Cập nhật trực tiếp trạng thái cục bộ,
        // KHÔNG tạo device_commands riêng cho hành động này để giữ đơn giản
        // (khác với lệnh do lễ tân bấm tay — xem commands.repo.ts).
        const { rows: deviceRows } = await tx.query(
          `UPDATE devices SET power_on = false, updated_at = now() WHERE room_id = $1 RETURNING *`,
          [booking.room_id]
        );
        for (const device of deviceRows) {
          await writeOutboxEvent(tx, { entityType: "device", entityId: (device as { id: string }).id, eventType: "DEVICE_POWER_CHANGED", payload: device });
        }
      }
      return booking;
    });
  },

  // upsertFromCloud — pull-sync 1 chiều, KHÔNG ghi outbox.
  async upsertFromCloud(booking: Booking): Promise<void> {
    await pool.query(
      `INSERT INTO bookings (id, property_id, tenant_id, code, guest_name, guest_phone, room_id, channel, status, checkin_date, checkout_date, total_price, deposit, notes, created_by, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (code) DO UPDATE SET
         guest_name = EXCLUDED.guest_name, guest_phone = EXCLUDED.guest_phone, room_id = EXCLUDED.room_id,
         channel = EXCLUDED.channel, status = EXCLUDED.status, checkin_date = EXCLUDED.checkin_date,
         checkout_date = EXCLUDED.checkout_date, total_price = EXCLUDED.total_price, deposit = EXCLUDED.deposit,
         notes = EXCLUDED.notes, updated_at = EXCLUDED.updated_at`,
      [
        booking.id,
        booking.property_id,
        booking.tenant_id,
        booking.code,
        booking.guest_name,
        booking.guest_phone,
        booking.room_id,
        booking.channel,
        booking.status,
        booking.checkin_date,
        booking.checkout_date,
        booking.total_price,
        booking.deposit,
        booking.notes,
        booking.created_by,
        booking.created_at,
        booking.updated_at,
      ]
    );
  },
};
