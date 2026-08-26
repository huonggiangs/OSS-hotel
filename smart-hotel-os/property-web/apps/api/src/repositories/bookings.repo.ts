import { pool, type DbPool } from "../lib/db";
import { Errors } from "../utils/errors";
import type { Booking, BookingChannel, BookingStatus } from "../types/domain";

export interface BookingInput {
  customerId?: string | null;
  roomId?: string | null;
  channel?: BookingChannel;
  status?: BookingStatus;
  checkinDate: string;
  checkoutDate: string;
  totalPrice?: number;
  deposit?: number;
  notes?: string | null;
}

// Kèm tên khách + số phòng/loại phòng qua JOIN — khớp thẳng shape BookingRow của
// UI (guest/room) mà không cần gọi thêm request phụ.
export interface BookingWithDetails extends Booking {
  guest_name: string | null;
  room_number: string | null;
  room_type_name: string | null;
}

async function ensureRoomAvailable(db: DbPool, propertyId: string, roomId: string, checkinDate: string, checkoutDate: string, excludeBookingId?: string) {
  const { rows: roomRows } = await db.query<{ id: string }>(
    `SELECT id FROM rooms WHERE property_id = $1 AND id = $2 FOR UPDATE`,
    [propertyId, roomId]
  );
  if (!roomRows[0]) throw Errors.notFound("phòng");

  const params: unknown[] = [propertyId, roomId, checkinDate, checkoutDate];
  let excludeClause = "";
  if (excludeBookingId) {
    params.push(excludeBookingId);
    excludeClause = ` AND id <> $${params.length}`;
  }
  const { rows: conflicts } = await db.query<{ id: string }>(
    `SELECT id FROM bookings
     WHERE property_id = $1 AND room_id = $2
       AND status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
       AND checkin_date < $4 AND checkout_date > $3${excludeClause}
     LIMIT 1`,
    params
  );
  if (conflicts[0]) throw Errors.conflict("Phòng đã có đặt chỗ trong khoảng ngày đã chọn.");
}

export const bookingsRepo = {
  async list(propertyId: string): Promise<BookingWithDetails[]> {
    const { rows } = await pool.query<BookingWithDetails>(
      `SELECT b.*, c.full_name AS guest_name, r.number AS room_number, rt.name AS room_type_name
       FROM bookings b
       LEFT JOIN customers c ON c.id = b.customer_id
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
      `SELECT b.*, c.full_name AS guest_name, r.number AS room_number, rt.name AS room_type_name
       FROM bookings b
       LEFT JOIN customers c ON c.id = b.customer_id
       LEFT JOIN rooms r ON r.id = b.room_id
       LEFT JOIN room_types rt ON rt.id = r.room_type_id
       WHERE b.property_id = $1 AND b.id = $2`,
      [propertyId, id]
    );
    return rows[0] ?? null;
  },

  async nextCode(db: DbPool, propertyId: string): Promise<string> {
    const { rows } = await db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM bookings WHERE property_id = $1`, [
      propertyId,
    ]);
    const seq = Number(rows[0]?.count ?? 0) + 1;
    return `HD-${new Date().getFullYear()}${String(seq).padStart(3, "0")}`;
  },

  async create(propertyId: string, tenantId: string, createdBy: string | undefined, input: BookingInput): Promise<Booking> {
    return pool.transaction(async (tx) => {
      if (input.roomId) await ensureRoomAvailable(tx, propertyId, input.roomId, input.checkinDate, input.checkoutDate);
      const code = await this.nextCode(tx, propertyId);
      const { rows } = await tx.query<Booking>(
        `INSERT INTO bookings
        (id, property_id, tenant_id, code, customer_id, room_id, channel, status, checkin_date, checkout_date, total_price, deposit, notes, created_by)
       VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        propertyId,
        tenantId,
        code,
        input.customerId ?? null,
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
      return rows[0];
    });
  },

  async update(propertyId: string, id: string, input: Partial<BookingInput>): Promise<Booking | null> {
    const existing = await this.findById(propertyId, id);
    if (!existing) return null;
    const roomId = input.roomId ?? existing.room_id;
    const checkinDate = input.checkinDate ?? existing.checkin_date;
    const checkoutDate = input.checkoutDate ?? existing.checkout_date;
    if (roomId) await ensureRoomAvailable(pool, propertyId, roomId, checkinDate, checkoutDate, id);
    const fields: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, unknown> = {
      customer_id: input.customerId,
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
    if (fields.length === 0) return this.findById(propertyId, id);
    params.push(propertyId, id);
    const { rows } = await pool.query<Booking>(
      `UPDATE bookings SET ${fields.join(", ")}, updated_at = now()
       WHERE property_id = $${params.length - 1} AND id = $${params.length} RETURNING *`,
      params
    );
    return rows[0] ?? null;
  },

  async checkin(propertyId: string, id: string): Promise<Booking> {
    return pool.transaction(async (tx) => {
      const { rows: bookingRows } = await tx.query<Booking>(`SELECT * FROM bookings WHERE property_id = $1 AND id = $2`, [propertyId, id]);
      const existing = bookingRows[0];
      if (!existing) throw Errors.notFound("hợp đồng");
      if (existing.status === "CHECKED_IN") return existing;
      if (existing.status === "CHECKED_OUT" || existing.status === "CANCELLED") {
        throw Errors.conflict(`Không thể nhận phòng khi hợp đồng đang ${existing.status}.`);
      }
      if (!existing.room_id) throw Errors.conflict("Cần gán phòng trước khi nhận phòng.");

      const { rows: roomRows } = await tx.query<{ id: string; status: string }>(
        `SELECT id, status FROM rooms WHERE property_id = $1 AND id = $2`,
        [propertyId, existing.room_id]
      );
      const room = roomRows[0];
      if (!room) throw Errors.conflict("Phòng được gán không thuộc cơ sở hiện tại.");
      if (room.status !== "VACANT") throw Errors.conflict(`Phòng không sẵn sàng để nhận khách (trạng thái: ${room.status}).`);

      const { rows } = await tx.query<Booking>(
        `UPDATE bookings SET status = 'CHECKED_IN', updated_at = now() WHERE property_id = $1 AND id = $2 RETURNING *`,
        [propertyId, id]
      );
      await tx.query(`UPDATE rooms SET status = 'OCCUPIED', power_on = true, updated_at = now() WHERE property_id = $1 AND id = $2`, [
        propertyId,
        existing.room_id,
      ]);
      await tx.query(`UPDATE devices SET power_on = true, updated_at = now() WHERE property_id = $1 AND room_id = $2`, [propertyId, existing.room_id]);
      return rows[0];
    });
  },

  async checkout(propertyId: string, id: string): Promise<Booking> {
    return pool.transaction(async (tx) => {
      const { rows: bookingRows } = await tx.query<Booking>(`SELECT * FROM bookings WHERE property_id = $1 AND id = $2`, [propertyId, id]);
      const existing = bookingRows[0];
      if (!existing) throw Errors.notFound("hợp đồng");
      if (existing.status === "CHECKED_OUT") return existing;
      if (existing.status !== "CHECKED_IN") throw Errors.conflict(`Chỉ có thể trả phòng khi hợp đồng đang CHECKED_IN (hiện tại: ${existing.status}).`);

      const { rows } = await tx.query<Booking>(
        `UPDATE bookings SET status = 'CHECKED_OUT', updated_at = now() WHERE property_id = $1 AND id = $2 RETURNING *`,
        [propertyId, id]
      );
      if (existing.room_id) {
        await tx.query(`UPDATE rooms SET status = 'DIRTY', power_on = false, updated_at = now() WHERE property_id = $1 AND id = $2`, [
          propertyId,
          existing.room_id,
        ]);
        await tx.query(`UPDATE devices SET power_on = false, updated_at = now() WHERE property_id = $1 AND room_id = $2`, [propertyId, existing.room_id]);
      }
      return rows[0];
    });
  },

  async countTotal(propertyId: string): Promise<number> {
    const { rows } = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM bookings WHERE property_id = $1`, [
      propertyId,
    ]);
    return Number(rows[0]?.count ?? 0);
  },

  async statusBreakdown(propertyId: string): Promise<{ status: BookingStatus; count: number }[]> {
    const { rows } = await pool.query<{ status: BookingStatus; count: string }>(
      `SELECT status, COUNT(*)::text AS count FROM bookings WHERE property_id = $1 GROUP BY status`,
      [propertyId]
    );
    return rows.map((r) => ({ status: r.status, count: Number(r.count) }));
  },

  // Dữ liệu Gantt cho tab "Lịch đặt phòng" ở Dashboard — trả booking theo phòng,
  // đã JOIN room/room_type, để frontend tự tính cột ngày theo tuần đang xem.
  async listForGantt(propertyId: string): Promise<
    { room_id: string; room_number: string; room_type_name: string; guest_name: string | null; checkin_date: string; checkout_date: string; status: BookingStatus }[]
  > {
    const { rows } = await pool.query(
      `SELECT r.id AS room_id, r.number AS room_number, rt.name AS room_type_name, c.full_name AS guest_name,
              b.checkin_date, b.checkout_date, b.status
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       JOIN room_types rt ON rt.id = r.room_type_id
       LEFT JOIN customers c ON c.id = b.customer_id
       WHERE b.property_id = $1 AND b.status <> 'CANCELLED'
       ORDER BY b.checkin_date ASC`,
      [propertyId]
    );
    return rows;
  },
};
