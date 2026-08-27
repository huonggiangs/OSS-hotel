import { randomUUID } from "node:crypto";
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
  checkinAt?: string;
  checkoutAt?: string;
  stayType?: "HOURLY" | "OVERNIGHT" | "DAILY";
  totalPrice?: number;
  deposit?: number;
  notes?: string | null;
  guestDetails?: GuestDetailsInput;
}

export interface GuestDetailsInput {
  dateOfBirth?: string | null;
  gender?: string | null;
  nationality?: string | null;
  identityType?: string | null;
  identityNumber?: string | null;
  identityIssuedDate?: string | null;
  identityIssuedPlace?: string | null;
  permanentAddress?: string | null;
  occupation?: string | null;
  stayPurpose?: string | null;
  expectedCheckoutAt?: string | null;
}

export interface BookingAdjustment {
  id: string;
  booking_id: string;
  kind: "EXTENSION" | "ROOM_TRANSFER" | "SERVICE" | "PAYMENT_NOTE";
  description: string;
  amount: string;
  payment_timing: "PREPAID" | "POSTPAID" | null;
  created_at: Date;
}

export interface BookingOperationSummary {
  booking: BookingWithDetails;
  adjustments: BookingAdjustment[];
  paidAmount: number;
  amountDue: number;
}

// Kèm tên khách + số phòng/loại phòng qua JOIN — khớp thẳng shape BookingRow của
// UI (guest/room) mà không cần gọi thêm request phụ.
export interface BookingWithDetails extends Booking {
  guest_name: string | null;
  room_number: string | null;
  room_type_name: string | null;
}

function defaultCheckinAt(date: string) {
  return `${date}T00:00:00+07:00`;
}

function defaultCheckoutAt(date: string) {
  return `${date}T23:59:59+07:00`;
}

async function ensureRoomAvailable(db: DbPool, propertyId: string, roomId: string, checkinAt: string, checkoutAt: string, excludeBookingId?: string) {
  const { rows: roomRows } = await db.query<{ id: string }>(
    `SELECT id FROM rooms WHERE property_id = $1 AND id = $2 FOR UPDATE`,
    [propertyId, roomId]
  );
  if (!roomRows[0]) throw Errors.notFound("phòng");

  const params: unknown[] = [propertyId, roomId, checkinAt, checkoutAt];
  let excludeClause = "";
  if (excludeBookingId) {
    params.push(excludeBookingId);
    excludeClause = ` AND id <> $${params.length}`;
  }
  const { rows: conflicts } = await db.query<{ id: string }>(
    `SELECT id FROM bookings
     WHERE property_id = $1 AND room_id = $2
       AND status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
       AND COALESCE(checkin_at, checkin_date::timestamp) < $4::timestamptz
       AND COALESCE(checkout_at, checkout_date::timestamp) > $3::timestamptz${excludeClause}
     LIMIT 1`,
    params
  );
  if (conflicts[0]) throw Errors.conflict("Phòng đã có đặt chỗ trong khoảng ngày đã chọn.");
}

async function upsertGuestDetails(
  db: DbPool,
  propertyId: string,
  tenantId: string,
  bookingId: string,
  details: GuestDetailsInput | undefined
) {
  if (!details) return;
  await db.query(
    `INSERT INTO booking_guest_details
      (booking_id, property_id, tenant_id, date_of_birth, gender, nationality, identity_type, identity_number,
       identity_issued_date, identity_issued_place, permanent_address, occupation, stay_purpose, expected_checkout_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (booking_id) DO UPDATE SET
       date_of_birth = EXCLUDED.date_of_birth, gender = EXCLUDED.gender, nationality = EXCLUDED.nationality,
       identity_type = EXCLUDED.identity_type, identity_number = EXCLUDED.identity_number,
       identity_issued_date = EXCLUDED.identity_issued_date, identity_issued_place = EXCLUDED.identity_issued_place,
       permanent_address = EXCLUDED.permanent_address, occupation = EXCLUDED.occupation,
       stay_purpose = EXCLUDED.stay_purpose, expected_checkout_at = EXCLUDED.expected_checkout_at, updated_at = now()`,
    [
      bookingId, propertyId, tenantId, details.dateOfBirth ?? null, details.gender ?? null, details.nationality ?? null,
      details.identityType ?? null, details.identityNumber ?? null, details.identityIssuedDate ?? null,
      details.identityIssuedPlace ?? null, details.permanentAddress ?? null, details.occupation ?? null,
      details.stayPurpose ?? null, details.expectedCheckoutAt ?? null,
    ]
  );
}

async function addAdjustment(
  db: DbPool,
  propertyId: string,
  tenantId: string,
  bookingId: string,
  kind: BookingAdjustment["kind"],
  description: string,
  amount: number,
  createdBy?: string,
  paymentTiming?: "PREPAID" | "POSTPAID"
) {
  await db.query(
    `INSERT INTO booking_adjustments (id, property_id, tenant_id, booking_id, kind, description, amount, payment_timing, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [randomUUID(), propertyId, tenantId, bookingId, kind, description, amount, paymentTiming ?? null, createdBy ?? null]
  );
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
      const checkinAt = input.checkinAt ?? defaultCheckinAt(input.checkinDate);
      const checkoutAt = input.checkoutAt ?? defaultCheckoutAt(input.checkoutDate);
      if (input.roomId) await ensureRoomAvailable(tx, propertyId, input.roomId, checkinAt, checkoutAt);
      const code = await this.nextCode(tx, propertyId);
      const { rows } = await tx.query<Booking>(
        `INSERT INTO bookings
        (id, property_id, tenant_id, code, customer_id, room_id, channel, status, checkin_date, checkout_date, checkin_at, checkout_at, stay_type, total_price, deposit, notes, created_by)
       VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
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
        checkinAt,
        checkoutAt,
        input.stayType ?? "DAILY",
        input.totalPrice ?? 0,
        input.deposit ?? 0,
        input.notes ?? null,
        createdBy ?? null,
      ]
      );
      const booking = rows[0];
      await upsertGuestDetails(tx, propertyId, tenantId, booking.id, input.guestDetails);
      return booking;
    });
  },

  async update(propertyId: string, id: string, input: Partial<BookingInput>): Promise<Booking | null> {
    const existing = await this.findById(propertyId, id);
    if (!existing) return null;
    const roomId = input.roomId ?? existing.room_id;
    const checkinDate = input.checkinDate ?? existing.checkin_date;
    const checkoutDate = input.checkoutDate ?? existing.checkout_date;
    const checkinAt = input.checkinAt ?? existing.checkin_at?.toString() ?? defaultCheckinAt(checkinDate);
    const checkoutAt = input.checkoutAt ?? existing.checkout_at?.toString() ?? defaultCheckoutAt(checkoutDate);
    if (roomId) await ensureRoomAvailable(pool, propertyId, roomId, checkinAt, checkoutAt, id);
    const fields: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, unknown> = {
      customer_id: input.customerId,
      room_id: input.roomId,
      channel: input.channel,
      status: input.status,
      checkin_date: input.checkinDate,
      checkout_date: input.checkoutDate,
      checkin_at: input.checkinAt,
      checkout_at: input.checkoutAt,
      stay_type: input.stayType,
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
    const booking = rows[0] ?? null;
    if (booking && input.guestDetails) await upsertGuestDetails(pool, propertyId, booking.tenant_id, booking.id, input.guestDetails);
    return booking;
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

  async operationSummary(propertyId: string, id: string): Promise<BookingOperationSummary> {
    const booking = await this.findById(propertyId, id);
    if (!booking) throw Errors.notFound("hợp đồng");
    const [{ rows: adjustments }, { rows: paidRows }] = await Promise.all([
      pool.query<BookingAdjustment>(
        `SELECT id, booking_id, kind, description, amount, payment_timing, created_at
         FROM booking_adjustments WHERE property_id = $1 AND booking_id = $2 ORDER BY created_at DESC`,
        [propertyId, id]
      ),
      pool.query<{ paid_amount: string }>(
        `SELECT COALESCE(SUM(amount), 0)::text AS paid_amount
         FROM invoices WHERE property_id = $1 AND booking_id = $2 AND status = 'PAID'`,
        [propertyId, id]
      ),
    ]);
    const paidAmount = Number(paidRows[0]?.paid_amount ?? 0);
    return { booking, adjustments, paidAmount, amountDue: Math.max(0, Number(booking.total_price) - Number(booking.deposit) - paidAmount) };
  },

  async setGuestPresence(propertyId: string, id: string, present: boolean): Promise<Booking> {
    return pool.transaction(async (tx) => {
      const { rows } = await tx.query<Booking>(
        `SELECT * FROM bookings WHERE property_id = $1 AND id = $2 FOR UPDATE`,
        [propertyId, id]
      );
      const booking = rows[0];
      if (!booking) throw Errors.notFound("hợp đồng");
      if (booking.status !== "CHECKED_IN" || !booking.room_id) {
        throw Errors.conflict("Chỉ điều khiển điện khi khách đang lưu trú tại phòng.");
      }
      await tx.query(`UPDATE rooms SET power_on = $3, updated_at = now() WHERE property_id = $1 AND id = $2`, [propertyId, booking.room_id, present]);
      await tx.query(`UPDATE devices SET power_on = $3, updated_at = now() WHERE property_id = $1 AND room_id = $2`, [propertyId, booking.room_id, present]);
      return booking;
    });
  },

  async extend(
    propertyId: string,
    tenantId: string,
    createdBy: string | undefined,
    id: string,
    input: { checkoutDate: string; checkoutAt: string; additionalAmount: number; additionalDeposit: number; paymentTiming: "PREPAID" | "POSTPAID"; note?: string }
  ): Promise<Booking> {
    return pool.transaction(async (tx) => {
      const { rows: currentRows } = await tx.query<Booking>(
        `SELECT * FROM bookings WHERE property_id = $1 AND id = $2 FOR UPDATE`,
        [propertyId, id]
      );
      const current = currentRows[0];
      if (!current) throw Errors.notFound("hợp đồng");
      if (current.status !== "CHECKED_IN" || !current.room_id) throw Errors.conflict("Chỉ gia hạn cho khách đang lưu trú.");
      const checkinAt = current.checkin_at ? new Date(current.checkin_at).toISOString() : defaultCheckinAt(current.checkin_date);
      if (new Date(input.checkoutAt).getTime() <= new Date(checkinAt).getTime()) {
        throw Errors.validation({ checkoutAt: "Thời điểm trả phòng gia hạn phải sau thời điểm nhận phòng." });
      }
      await ensureRoomAvailable(tx, propertyId, current.room_id, checkinAt, input.checkoutAt, id);
      const { rows } = await tx.query<Booking>(
        `UPDATE bookings
         SET checkout_date = $3, checkout_at = $4, total_price = total_price + $5, deposit = deposit + $6, updated_at = now()
         WHERE property_id = $1 AND id = $2 RETURNING *`,
        [propertyId, id, input.checkoutDate, input.checkoutAt, input.additionalAmount, input.additionalDeposit]
      );
      await addAdjustment(
        tx,
        propertyId,
        tenantId,
        id,
        "EXTENSION",
        input.note?.trim() || `Gia hạn đến ${input.checkoutAt}${input.additionalDeposit ? `; đặt cọc thêm ${input.additionalDeposit}` : ""}`,
        input.additionalAmount,
        createdBy,
        input.paymentTiming
      );
      return rows[0];
    });
  },

  async transfer(
    propertyId: string,
    tenantId: string,
    createdBy: string | undefined,
    id: string,
    input: { targetRoomId: string; adjustmentAmount: number; reason: string }
  ): Promise<Booking> {
    return pool.transaction(async (tx) => {
      const { rows: currentRows } = await tx.query<Booking>(
        `SELECT * FROM bookings WHERE property_id = $1 AND id = $2 FOR UPDATE`,
        [propertyId, id]
      );
      const current = currentRows[0];
      if (!current) throw Errors.notFound("hợp đồng");
      if (current.status !== "CHECKED_IN" || !current.room_id) throw Errors.conflict("Chỉ chuyển phòng cho khách đang lưu trú.");
      if (current.room_id === input.targetRoomId) throw Errors.validation({ targetRoomId: "Phòng mới phải khác phòng hiện tại." });

      const { rows: sourceRows } = await tx.query<{ power_on: boolean }>(
        `SELECT power_on FROM rooms WHERE property_id = $1 AND id = $2 FOR UPDATE`,
        [propertyId, current.room_id]
      );
      const { rows: targetRows } = await tx.query<{ number: string; status: string }>(
        `SELECT number, status FROM rooms WHERE property_id = $1 AND id = $2 FOR UPDATE`,
        [propertyId, input.targetRoomId]
      );
      const source = sourceRows[0];
      const target = targetRows[0];
      if (!source) throw Errors.conflict("Không tìm thấy phòng hiện tại của khách.");
      if (!target) throw Errors.notFound("phòng mới");
      if (target.status !== "VACANT") throw Errors.conflict(`Phòng ${target.number} chưa sẵn sàng để chuyển khách.`);

      const checkinAt = current.checkin_at ? new Date(current.checkin_at).toISOString() : defaultCheckinAt(current.checkin_date);
      const checkoutAt = current.checkout_at ? new Date(current.checkout_at).toISOString() : defaultCheckoutAt(current.checkout_date);
      await ensureRoomAvailable(tx, propertyId, input.targetRoomId, checkinAt, checkoutAt, id);

      await tx.query(`UPDATE rooms SET status = 'DIRTY', power_on = false, updated_at = now() WHERE property_id = $1 AND id = $2`, [propertyId, current.room_id]);
      await tx.query(`UPDATE devices SET power_on = false, updated_at = now() WHERE property_id = $1 AND room_id = $2`, [propertyId, current.room_id]);
      await tx.query(`UPDATE rooms SET status = 'OCCUPIED', power_on = $3, updated_at = now() WHERE property_id = $1 AND id = $2`, [propertyId, input.targetRoomId, source.power_on]);
      await tx.query(`UPDATE devices SET power_on = $3, updated_at = now() WHERE property_id = $1 AND room_id = $2`, [propertyId, input.targetRoomId, source.power_on]);
      const { rows } = await tx.query<Booking>(
        `UPDATE bookings SET room_id = $3, total_price = total_price + $4, updated_at = now()
         WHERE property_id = $1 AND id = $2 RETURNING *`,
        [propertyId, id, input.targetRoomId, input.adjustmentAmount]
      );
      await addAdjustment(tx, propertyId, tenantId, id, "ROOM_TRANSFER", input.reason.trim(), input.adjustmentAmount, createdBy);
      return rows[0];
    });
  },

  async settleAndCheckout(
    propertyId: string,
    tenantId: string,
    createdBy: string | undefined,
    id: string,
    input: { serviceAmount: number; serviceNote?: string; paymentMethod: string }
  ): Promise<{ booking: Booking; paidAmount: number }> {
    return pool.transaction(async (tx) => {
      const { rows: currentRows } = await tx.query<Booking>(
        `SELECT * FROM bookings WHERE property_id = $1 AND id = $2 FOR UPDATE`,
        [propertyId, id]
      );
      const current = currentRows[0];
      if (!current) throw Errors.notFound("hợp đồng");
      if (current.status !== "CHECKED_IN") throw Errors.conflict("Chỉ thanh toán/trả phòng cho khách đang lưu trú.");
      const { rows: updatedRows } = await tx.query<Booking>(
        `UPDATE bookings SET total_price = total_price + $3, updated_at = now() WHERE property_id = $1 AND id = $2 RETURNING *`,
        [propertyId, id, input.serviceAmount]
      );
      const updated = updatedRows[0];
      if (input.serviceAmount > 0) {
        await addAdjustment(tx, propertyId, tenantId, id, "SERVICE", input.serviceNote?.trim() || "Dịch vụ phát sinh khi trả phòng", input.serviceAmount, createdBy);
      }
      const { rows: paidRows } = await tx.query<{ amount: string }>(
        `SELECT COALESCE(SUM(amount), 0)::text AS amount FROM invoices WHERE property_id = $1 AND booking_id = $2 AND status = 'PAID'`,
        [propertyId, id]
      );
      const paidBefore = Number(paidRows[0]?.amount ?? 0);
      const amountDue = Math.max(0, Number(updated.total_price) - Number(updated.deposit) - paidBefore);
      if (amountDue > 0) {
        const { rows: guestRows } = await tx.query<{ full_name: string | null }>(
          `SELECT full_name FROM customers WHERE id = $1`,
          [updated.customer_id]
        );
        await tx.query(
          `INSERT INTO invoices (id, property_id, tenant_id, booking_id, code, guest_name, method, amount, status, paid_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PAID',now())`,
          [randomUUID(), propertyId, tenantId, id, `TT-${id.slice(0, 8)}-${Date.now()}`, guestRows[0]?.full_name ?? "Khách lưu trú", input.paymentMethod, amountDue]
        );
      }
      const { rows } = await tx.query<Booking>(
        `UPDATE bookings SET status = 'CHECKED_OUT', updated_at = now() WHERE property_id = $1 AND id = $2 RETURNING *`,
        [propertyId, id]
      );
      if (current.room_id) {
        await tx.query(`UPDATE rooms SET status = 'DIRTY', power_on = false, updated_at = now() WHERE property_id = $1 AND id = $2`, [propertyId, current.room_id]);
        await tx.query(`UPDATE devices SET power_on = false, updated_at = now() WHERE property_id = $1 AND room_id = $2`, [propertyId, current.room_id]);
      }
      return { booking: rows[0], paidAmount: amountDue };
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
