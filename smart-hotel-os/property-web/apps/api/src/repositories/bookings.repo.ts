import { randomUUID } from "node:crypto";
import { pool, type DbPool } from "../lib/db";
import { Errors } from "../utils/errors";
import type { Booking, BookingChannel, BookingStatus } from "../types/domain";
import { createDeviceControlEvent, setRoomEnergyState, type DeviceControlResult } from "./roomControl.repo";

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
  identityExpiryDate?: string | null;
  temporaryResidenceExpiresAt?: string | null;
  placeOfBirth?: string | null;
  permanentAddress?: string | null;
  currentResidenceAddress?: string | null;
  arrivalFrom?: string | null;
  vehiclePlate?: string | null;
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
  services: BookingServiceCharge[];
  accessCard: RoomAccessCard | null;
  lodgingReport: LodgingReport | null;
  deviceActions: DeviceControlResult[];
  paidAmount: number;
  amountDue: number;
}

export interface BookingServiceCharge {
  id: string;
  booking_id: string;
  name: string;
  quantity: string;
  unit_price: string;
  amount: string;
  note: string | null;
  created_at: Date;
}

export interface RoomAccessCard {
  id: string;
  room_id: string;
  device_id: string | null;
  card_code: string;
  status: "ISSUED" | "RETURNED" | "LOST" | "CANCELLED";
  issued_at: Date;
  returned_at: Date | null;
}

export interface LodgingReport {
  id: string;
  booking_id: string;
  provider: string;
  status: "DRAFT" | "READY" | "NOT_REQUIRED" | "QUEUED" | "SUBMITTED" | "ACCEPTED" | "REJECTED" | "NEEDS_INFO" | "MANUAL_REQUIRED";
  payload: Record<string, unknown>;
  external_reference: string | null;
  last_error: string | null;
  prepared_at: Date | null;
  submitted_at: Date | null;
  updated_at: Date;
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
       identity_issued_date, identity_issued_place, identity_expiry_date, temporary_residence_expires_at, place_of_birth, permanent_address,
       current_residence_address, arrival_from, vehicle_plate, occupation, stay_purpose, expected_checkout_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     ON CONFLICT (booking_id) DO UPDATE SET
       date_of_birth = EXCLUDED.date_of_birth, gender = EXCLUDED.gender, nationality = EXCLUDED.nationality,
       identity_type = EXCLUDED.identity_type, identity_number = EXCLUDED.identity_number,
       identity_issued_date = EXCLUDED.identity_issued_date, identity_issued_place = EXCLUDED.identity_issued_place,
       identity_expiry_date = EXCLUDED.identity_expiry_date, temporary_residence_expires_at = EXCLUDED.temporary_residence_expires_at, place_of_birth = EXCLUDED.place_of_birth,
       permanent_address = EXCLUDED.permanent_address, current_residence_address = EXCLUDED.current_residence_address,
       arrival_from = EXCLUDED.arrival_from, vehicle_plate = EXCLUDED.vehicle_plate, occupation = EXCLUDED.occupation,
       stay_purpose = EXCLUDED.stay_purpose, expected_checkout_at = EXCLUDED.expected_checkout_at, updated_at = now()`,
    [
      bookingId, propertyId, tenantId, details.dateOfBirth ?? null, details.gender ?? null, details.nationality ?? null,
      details.identityType ?? null, details.identityNumber ?? null, details.identityIssuedDate ?? null,
      details.identityIssuedPlace ?? null, details.identityExpiryDate ?? null, details.temporaryResidenceExpiresAt ?? null, details.placeOfBirth ?? null,
      details.permanentAddress ?? null, details.currentResidenceAddress ?? null, details.arrivalFrom ?? null,
      details.vehiclePlate ?? null, details.occupation ?? null, details.stayPurpose ?? null, details.expectedCheckoutAt ?? null,
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

/** Chuẩn bị hồ sơ theo đúng bộ trường thông báo lưu trú hiện hành. API/certificate
 * chính thức của Bộ Công an không được công bố cho PMS này, nên trạng thái READY
 * chỉ có nghĩa "đủ để nhân viên gửi qua cổng/phần mềm đã được cấp quyền", không
 * được hiểu là đã nộp thành công. */
async function prepareLodgingReport(db: DbPool, propertyId: string, tenantId: string, bookingId: string): Promise<LodgingReport> {
  const { rows } = await db.query<{
    booking_id: string;
    stay_type: "HOURLY" | "OVERNIGHT" | "DAILY";
    checkin_at: Date | null;
    checkout_at: Date | null;
    checkin_date: string;
    checkout_date: string;
    guest_name: string | null;
    date_of_birth: string | null;
    identity_number: string | null;
    identity_type: string | null;
    nationality: string | null;
    gender: string | null;
    temporary_residence_expires_at: string | null;
    stay_purpose: string | null;
    property_name: string;
    property_address: string | null;
    room_number: string | null;
  }>(
    `SELECT b.id AS booking_id, b.stay_type, b.checkin_at, b.checkout_at, b.checkin_date, b.checkout_date,
            c.full_name AS guest_name, gd.date_of_birth::text, gd.identity_number, gd.identity_type,
            gd.nationality, gd.gender, gd.temporary_residence_expires_at::text, gd.stay_purpose, p.name AS property_name, p.address AS property_address,
            r.number AS room_number
     FROM bookings b
     JOIN properties p ON p.id = b.property_id
     LEFT JOIN customers c ON c.id = b.customer_id
     LEFT JOIN booking_guest_details gd ON gd.booking_id = b.id
     LEFT JOIN rooms r ON r.id = b.room_id
     WHERE b.property_id = $1 AND b.id = $2`,
    [propertyId, bookingId]
  );
  const source = rows[0];
  if (!source) throw Errors.notFound("hợp đồng");
  const crossesMidnight = source.checkout_date > source.checkin_date;
  const domestic = ["việt nam", "vietnam", "vn"].includes(source.nationality?.trim().toLocaleLowerCase("vi-VN") ?? "");
  const required = !domestic || source.stay_type === "OVERNIGHT" || crossesMidnight;
  const payload = {
    fullName: source.guest_name?.trim() || null,
    dateOfBirth: source.date_of_birth,
    personalIdOrPassport: source.identity_number?.trim() || null,
    identityType: source.identity_type?.trim() || null,
    nationality: source.nationality?.trim() || null,
    gender: source.gender?.trim() || null,
    temporaryResidenceExpiresAt: source.temporary_residence_expires_at,
    stayReason: source.stay_purpose?.trim() || "Lưu trú",
    stayFrom: source.checkin_at?.toISOString() ?? source.checkin_date,
    stayTo: source.checkout_at?.toISOString() ?? source.checkout_date,
    lodgingAddress: source.property_address?.trim() || null,
    lodgingName: source.property_name,
    roomNumber: source.room_number,
  };
  const missing = [
    !payload.fullName ? "họ tên" : null,
    !payload.dateOfBirth ? "ngày sinh" : null,
    !payload.personalIdOrPassport ? "số định danh/CMND/hộ chiếu" : null,
    !payload.lodgingAddress ? "địa chỉ cơ sở lưu trú" : null,
    !domestic && !payload.gender ? "giới tính khách nước ngoài" : null,
    !domestic && !payload.temporaryResidenceExpiresAt ? "hạn chứng nhận/thẻ tạm trú" : null,
  ].filter(Boolean);
  const status = !required ? "NOT_REQUIRED" : missing.length ? "NEEDS_INFO" : "READY";
  const lastError = missing.length ? `Thiếu: ${missing.join(", ")}.` : null;
  const { rows: saved } = await db.query<LodgingReport>(
    `INSERT INTO lodging_reports (id, property_id, tenant_id, booking_id, provider, status, payload, last_error, prepared_at)
     VALUES ($1,$2,$3,$4,'BCA_PORTAL',$5,$6::jsonb,$7,now())
     ON CONFLICT (booking_id) DO UPDATE SET status = EXCLUDED.status, payload = EXCLUDED.payload,
       last_error = EXCLUDED.last_error, prepared_at = now(), updated_at = now()
     RETURNING *`,
    [randomUUID(), propertyId, tenantId, bookingId, status, JSON.stringify(payload), lastError]
  );
  return saved[0];
}

async function createHousekeepingTask(db: DbPool, propertyId: string, tenantId: string, roomId: string, bookingId: string) {
  await db.query(
    `INSERT INTO housekeeping_tasks (id, property_id, tenant_id, room_id, booking_id, status)
     VALUES ($1,$2,$3,$4,$5,'PENDING')
     ON CONFLICT (room_id) WHERE status IN ('PENDING', 'IN_PROGRESS') DO NOTHING`,
    [randomUUID(), propertyId, tenantId, roomId, bookingId]
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

  async checkin(propertyId: string, tenantId: string, requestedBy: string | undefined, id: string): Promise<Booking> {
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
      await tx.query(`UPDATE rooms SET status = 'OCCUPIED', updated_at = now() WHERE property_id = $1 AND id = $2`, [
        propertyId,
        existing.room_id,
      ]);
      await setRoomEnergyState(tx, { propertyId, tenantId, roomId: existing.room_id, bookingId: id, powerOn: true, requestedBy });
      await prepareLodgingReport(tx, propertyId, tenantId, id);
      return rows[0];
    });
  },

  async checkout(propertyId: string, tenantId: string, requestedBy: string | undefined, id: string): Promise<Booking> {
    return pool.transaction(async (tx) => {
      const { rows: bookingRows } = await tx.query<Booking>(`SELECT * FROM bookings WHERE property_id = $1 AND id = $2`, [propertyId, id]);
      const existing = bookingRows[0];
      if (!existing) throw Errors.notFound("hợp đồng");
      if (existing.status === "CHECKED_OUT") return existing;
      if (existing.status !== "CHECKED_IN") throw Errors.conflict(`Chỉ có thể trả phòng khi hợp đồng đang CHECKED_IN (hiện tại: ${existing.status}).`);
      const { rows: issuedCards } = await tx.query<{ card_code: string }>(
        `SELECT card_code FROM room_access_cards WHERE property_id = $1 AND booking_id = $2 AND status = 'ISSUED'`,
        [propertyId, id]
      );
      if (issuedCards[0]) throw Errors.conflict(`Cần thu hồi thẻ phòng ${issuedCards[0].card_code} trước khi trả phòng.`);

      const { rows } = await tx.query<Booking>(
        `UPDATE bookings SET status = 'CHECKED_OUT', updated_at = now() WHERE property_id = $1 AND id = $2 RETURNING *`,
        [propertyId, id]
      );
      if (existing.room_id) {
        await tx.query(`UPDATE rooms SET status = 'DIRTY', power_on = false, updated_at = now() WHERE property_id = $1 AND id = $2`, [
          propertyId,
          existing.room_id,
        ]);
        await setRoomEnergyState(tx, { propertyId, tenantId, roomId: existing.room_id, bookingId: id, powerOn: false, requestedBy });
        await createHousekeepingTask(tx, propertyId, tenantId, existing.room_id, id);
      }
      return rows[0];
    });
  },

  async operationSummary(propertyId: string, id: string): Promise<BookingOperationSummary> {
    const booking = await this.findById(propertyId, id);
    if (!booking) throw Errors.notFound("hợp đồng");
    const [{ rows: adjustments }, { rows: paidRows }, { rows: services }, { rows: cards }, { rows: reports }, { rows: devices }] = await Promise.all([
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
      pool.query<BookingServiceCharge>(
        `SELECT id, booking_id, name, quantity, unit_price, amount, note, created_at
         FROM booking_service_charges WHERE property_id = $1 AND booking_id = $2 ORDER BY created_at DESC`,
        [propertyId, id]
      ),
      pool.query<RoomAccessCard>(
        `SELECT id, room_id, device_id, card_code, status, issued_at, returned_at
         FROM room_access_cards WHERE property_id = $1 AND booking_id = $2 ORDER BY issued_at DESC LIMIT 1`,
        [propertyId, id]
      ),
      pool.query<LodgingReport>(`SELECT * FROM lodging_reports WHERE property_id = $1 AND booking_id = $2`, [propertyId, id]),
      booking.room_id
        ? pool.query<DeviceControlResult>(
            `SELECT d.id AS "deviceId", d.name AS "deviceName", d.control_kind AS "controlKind",
                    COALESCE(last_event.delivery_status,
                      CASE WHEN d.asset_code IS NOT NULL AND d.iot_device_id IS NOT NULL THEN 'QUEUED' ELSE 'NOT_CONFIGURED' END
                    ) AS "deliveryStatus"
             FROM devices d
             LEFT JOIN LATERAL (
               SELECT delivery_status FROM device_control_events e
                WHERE e.property_id = d.property_id AND e.device_id = d.id AND e.booking_id = $3
                ORDER BY e.created_at DESC LIMIT 1
             ) last_event ON true
             WHERE d.property_id = $1 AND d.room_id = $2
               AND d.control_kind IN ('POWER_SWITCH', 'LIGHTING_CONTROLLER', 'AC_CONTROLLER', 'SMART_TV', 'ANNOUNCEMENT_SPEAKER', 'CARD_DISPENSER')
             ORDER BY d.created_at`,
            [propertyId, booking.room_id, id]
          )
        : Promise.resolve({ rows: [] as DeviceControlResult[] }),
    ]);
    const paidAmount = Number(paidRows[0]?.paid_amount ?? 0);
    return {
      booking, adjustments, services, accessCard: cards[0] ?? null, lodgingReport: reports[0] ?? null, deviceActions: devices,
      paidAmount, amountDue: Math.max(0, Number(booking.total_price) - Number(booking.deposit) - paidAmount),
    };
  },

  async setGuestPresence(propertyId: string, tenantId: string, requestedBy: string | undefined, id: string, present: boolean): Promise<Booking> {
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
      await setRoomEnergyState(tx, { propertyId, tenantId, roomId: booking.room_id, bookingId: id, powerOn: present, requestedBy });
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
      const { rows: issuedCards } = await tx.query<{ card_code: string }>(
        `SELECT card_code FROM room_access_cards WHERE property_id = $1 AND booking_id = $2 AND status = 'ISSUED'`,
        [propertyId, id]
      );
      if (issuedCards[0]) throw Errors.conflict(`Cần thu hồi thẻ phòng ${issuedCards[0].card_code} trước khi chuyển phòng.`);

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
      await setRoomEnergyState(tx, { propertyId, tenantId, roomId: current.room_id, bookingId: id, powerOn: false, requestedBy: createdBy });
      await createHousekeepingTask(tx, propertyId, tenantId, current.room_id, id);
      await tx.query(`UPDATE rooms SET status = 'OCCUPIED', updated_at = now() WHERE property_id = $1 AND id = $2`, [propertyId, input.targetRoomId]);
      await setRoomEnergyState(tx, { propertyId, tenantId, roomId: input.targetRoomId, bookingId: id, powerOn: source.power_on, requestedBy: createdBy });
      const { rows } = await tx.query<Booking>(
        `UPDATE bookings SET room_id = $3, total_price = total_price + $4, updated_at = now()
         WHERE property_id = $1 AND id = $2 RETURNING *`,
        [propertyId, id, input.targetRoomId, input.adjustmentAmount]
      );
      await addAdjustment(tx, propertyId, tenantId, id, "ROOM_TRANSFER", input.reason.trim(), input.adjustmentAmount, createdBy);
      return rows[0];
    });
  },

  async addService(
    propertyId: string,
    tenantId: string,
    createdBy: string | undefined,
    id: string,
    input: { name: string; quantity: number; unitPrice: number; note?: string }
  ): Promise<BookingServiceCharge> {
    return pool.transaction(async (tx) => {
      const { rows: bookings } = await tx.query<Booking>(
        `SELECT * FROM bookings WHERE property_id = $1 AND id = $2 FOR UPDATE`,
        [propertyId, id]
      );
      const booking = bookings[0];
      if (!booking) throw Errors.notFound("hợp đồng");
      if (booking.status !== "CHECKED_IN") throw Errors.conflict("Chỉ ghi nhận dịch vụ cho khách đang lưu trú.");
      const amount = Math.round(input.quantity * input.unitPrice * 100) / 100;
      const { rows } = await tx.query<BookingServiceCharge>(
        `INSERT INTO booking_service_charges
         (id, property_id, tenant_id, booking_id, name, quantity, unit_price, amount, note, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [randomUUID(), propertyId, tenantId, id, input.name.trim(), input.quantity, input.unitPrice, amount, input.note?.trim() || null, createdBy ?? null]
      );
      await tx.query(`UPDATE bookings SET total_price = total_price + $3, updated_at = now() WHERE property_id = $1 AND id = $2`, [propertyId, id, amount]);
      await addAdjustment(tx, propertyId, tenantId, id, "SERVICE", input.note?.trim() || input.name.trim(), amount, createdBy, "POSTPAID");
      return rows[0];
    });
  },

  async prepareLodgingReport(propertyId: string, tenantId: string, id: string): Promise<LodgingReport> {
    return pool.transaction((tx) => prepareLodgingReport(tx, propertyId, tenantId, id));
  },

  async issueAccessCard(
    propertyId: string,
    tenantId: string,
    createdBy: string | undefined,
    id: string,
    input: { cardCode: string; deviceId?: string }
  ): Promise<{ card: RoomAccessCard; deliveryStatus: "QUEUED" | "NOT_CONFIGURED" }> {
    return pool.transaction(async (tx) => {
      const { rows: bookings } = await tx.query<Booking>(`SELECT * FROM bookings WHERE property_id = $1 AND id = $2 FOR UPDATE`, [propertyId, id]);
      const booking = bookings[0];
      if (!booking) throw Errors.notFound("hợp đồng");
      if (booking.status !== "CHECKED_IN" || !booking.room_id) throw Errors.conflict("Chỉ cấp thẻ sau khi khách đã nhận phòng.");
      const { rows: existingCards } = await tx.query<{ id: string }>(
        `SELECT id FROM room_access_cards WHERE property_id = $1 AND booking_id = $2 AND status = 'ISSUED'`,
        [propertyId, id]
      );
      if (existingCards[0]) throw Errors.conflict("Khách đang giữ một thẻ phòng. Hãy thu hồi thẻ cũ trước.");
      const { rows: roomRows } = await tx.query<{ floor: string; zone: string }>(`SELECT floor, zone FROM rooms WHERE property_id = $1 AND id = $2`, [propertyId, booking.room_id]);
      const room = roomRows[0];
      if (!room) throw Errors.notFound("phòng");
      const params: unknown[] = [propertyId, booking.room_id, room.floor, room.zone];
      let requestedDevice = "";
      if (input.deviceId) {
        params.push(input.deviceId);
        requestedDevice = ` AND d.id = $${params.length}`;
      }
      const { rows: devices } = await tx.query<{ id: string; external_id: string | null; status: "ONLINE" | "OFFLINE" | "ERROR" }>(
        `SELECT d.id, d.external_id, d.status FROM devices d
         WHERE d.property_id = $1 AND d.control_kind = 'CARD_DISPENSER'${requestedDevice}
           AND (d.room_id = $2 OR (d.location_scope = 'FLOOR' AND d.location_label = $3)
             OR (d.location_scope = 'ZONE' AND d.location_label = $4) OR d.location_scope = 'PROPERTY')
         ORDER BY CASE WHEN d.room_id = $2 THEN 0 ELSE 1 END, d.created_at LIMIT 1`,
        params
      );
      const device = devices[0];
      if (!device) throw Errors.conflict("Chưa gán bộ cấp/thu hồi thẻ cho phòng, tầng hoặc khu này.");
      const { rows: cards } = await tx.query<RoomAccessCard>(
        `INSERT INTO room_access_cards (id, property_id, tenant_id, booking_id, room_id, device_id, card_code, issued_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [randomUUID(), propertyId, tenantId, id, booking.room_id, device.id, input.cardCode.trim(), createdBy ?? null]
      );
      const deliveryStatus = await createDeviceControlEvent(tx, {
        propertyId, tenantId, roomId: booking.room_id, bookingId: id, device, action: "ISSUE_CARD", requestedBy: createdBy,
        payload: { cardCode: input.cardCode.trim() },
      });
      return { card: cards[0], deliveryStatus };
    });
  },

  async returnAccessCard(propertyId: string, tenantId: string, returnedBy: string | undefined, id: string): Promise<RoomAccessCard> {
    return pool.transaction(async (tx) => {
      const { rows: cards } = await tx.query<RoomAccessCard & { external_id: string | null; device_status: "ONLINE" | "OFFLINE" | "ERROR" | null }>(
        `SELECT c.*, d.external_id, d.status AS device_status
         FROM room_access_cards c LEFT JOIN devices d ON d.id = c.device_id
         WHERE c.property_id = $1 AND c.booking_id = $2 AND c.status = 'ISSUED' FOR UPDATE`,
        [propertyId, id]
      );
      const card = cards[0];
      if (!card) throw Errors.conflict("Không có thẻ phòng nào đang được cấp cho khách.");
      const { rows: bookingRows } = await tx.query<Booking>(`SELECT * FROM bookings WHERE property_id = $1 AND id = $2`, [propertyId, id]);
      const booking = bookingRows[0];
      if (!booking?.room_id) throw Errors.notFound("hợp đồng/phòng");
      const { rows } = await tx.query<RoomAccessCard>(
        `UPDATE room_access_cards SET status = 'RETURNED', returned_by = $3, returned_at = now() WHERE id = $1 AND property_id = $2 RETURNING *`,
        [card.id, propertyId, returnedBy ?? null]
      );
      if (card.device_id && card.device_status) {
        await createDeviceControlEvent(tx, {
          propertyId, tenantId, roomId: booking.room_id, bookingId: id,
          device: { id: card.device_id, external_id: card.external_id, status: card.device_status }, action: "RECLAIM_CARD", requestedBy: returnedBy,
          payload: { cardCode: card.card_code },
        });
      }
      return rows[0];
    });
  },

  async createSettlementPreview(
    propertyId: string,
    tenantId: string,
    id: string,
    paymentMethod: string
  ): Promise<{ invoice: { id: string; code: string; guest_name: string; method: string; amount: string; status: string }; amountDue: number }> {
    return pool.transaction(async (tx) => {
      const { rows: bookingRows } = await tx.query<Booking>(`SELECT * FROM bookings WHERE property_id = $1 AND id = $2 FOR UPDATE`, [propertyId, id]);
      const booking = bookingRows[0];
      if (!booking) throw Errors.notFound("hợp đồng");
      if (booking.status !== "CHECKED_IN") throw Errors.conflict("Chỉ lập xác nhận thanh toán cho khách đang lưu trú.");
      const { rows: paidRows } = await tx.query<{ amount: string }>(
        `SELECT COALESCE(SUM(amount), 0)::text AS amount FROM invoices WHERE property_id = $1 AND booking_id = $2 AND status = 'PAID'`,
        [propertyId, id]
      );
      const amountDue = Math.max(0, Number(booking.total_price) - Number(booking.deposit) - Number(paidRows[0]?.amount ?? 0));
      const { rows: guests } = await tx.query<{ full_name: string | null }>(`SELECT full_name FROM customers WHERE id = $1`, [booking.customer_id]);
      const guestName = guests[0]?.full_name?.trim() || "Khách lưu trú";
      if (amountDue === 0) {
        const { rows: paidInvoices } = await tx.query<{ id: string; code: string; guest_name: string; method: string; amount: string; status: string }>(
          `SELECT id, code, guest_name, method, amount, status FROM invoices
           WHERE property_id = $1 AND booking_id = $2 AND status = 'PAID' ORDER BY paid_at DESC NULLS LAST, created_at DESC LIMIT 1`,
          [propertyId, id]
        );
        if (paidInvoices[0]) return { invoice: paidInvoices[0], amountDue };
      }
      const { rows: pending } = await tx.query<{ id: string; amount: string; method: string }>(
        `SELECT id, amount, method FROM invoices WHERE property_id = $1 AND booking_id = $2 AND status = 'PENDING' ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
        [propertyId, id]
      );
      let invoice: { id: string; code: string; guest_name: string; method: string; amount: string; status: string } | undefined;
      if (pending[0] && Number(pending[0].amount) === amountDue && pending[0].method === paymentMethod) {
        const { rows } = await tx.query<typeof invoice>(`SELECT id, code, guest_name, method, amount, status FROM invoices WHERE id = $1`, [pending[0].id]);
        invoice = rows[0];
      } else {
        if (pending[0]) await tx.query(`UPDATE invoices SET status = 'FAILED', updated_at = now() WHERE id = $1`, [pending[0].id]);
        const { rows } = await tx.query<typeof invoice>(
          `INSERT INTO invoices (id, property_id, tenant_id, booking_id, code, guest_name, method, amount, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING') RETURNING id, code, guest_name, method, amount, status`,
          [randomUUID(), propertyId, tenantId, id, `TT-${id.slice(0, 8)}-${Date.now()}`, guestName, paymentMethod, amountDue]
        );
        invoice = rows[0];
      }
      return { invoice: invoice!, amountDue };
    });
  },

  async finalizeSettlement(
    propertyId: string,
    tenantId: string,
    requestedBy: string | undefined,
    id: string,
    invoiceId: string
  ): Promise<{ booking: Booking; paidAmount: number }> {
    return pool.transaction(async (tx) => {
      const { rows: bookingRows } = await tx.query<Booking>(`SELECT * FROM bookings WHERE property_id = $1 AND id = $2 FOR UPDATE`, [propertyId, id]);
      const booking = bookingRows[0];
      if (!booking) throw Errors.notFound("hợp đồng");
      if (booking.status !== "CHECKED_IN") throw Errors.conflict("Khách không còn ở trạng thái có thể trả phòng.");
      const { rows: invoices } = await tx.query<{ id: string; amount: string; method: string; status: "PAID" | "PENDING" | "FAILED" }>(
        `SELECT id, amount, method, status FROM invoices WHERE property_id = $1 AND booking_id = $2 AND id = $3 FOR UPDATE`,
        [propertyId, id, invoiceId]
      );
      const invoice = invoices[0];
      if (!invoice) throw Errors.notFound("phiếu xác nhận thanh toán");
      if (invoice.status === "FAILED") throw Errors.conflict("Phiếu thanh toán đã hết hiệu lực. Hãy lập lại bước xác nhận.");
      if (invoice.status === "PENDING" && invoice.method === "BANK_TRANSFER") {
        throw Errors.conflict("QR/chuyển khoản chưa được xác nhận. Hãy đồng bộ SePay hoặc chờ webhook trước khi chốt doanh thu.");
      }
      if (invoice.status === "PENDING") {
        await tx.query(`UPDATE invoices SET status = 'PAID', paid_at = now(), updated_at = now() WHERE id = $1`, [invoice.id]);
      }
      const { rows: issuedCards } = await tx.query<{ card_code: string }>(
        `SELECT card_code FROM room_access_cards WHERE property_id = $1 AND booking_id = $2 AND status = 'ISSUED'`,
        [propertyId, id]
      );
      if (issuedCards[0]) throw Errors.conflict(`Cần thu hồi thẻ phòng ${issuedCards[0].card_code} trước khi chốt trả phòng.`);
      const { rows } = await tx.query<Booking>(
        `UPDATE bookings SET status = 'CHECKED_OUT', updated_at = now() WHERE property_id = $1 AND id = $2 RETURNING *`,
        [propertyId, id]
      );
      if (booking.room_id) {
        await tx.query(`UPDATE rooms SET status = 'DIRTY', updated_at = now() WHERE property_id = $1 AND id = $2`, [propertyId, booking.room_id]);
        await setRoomEnergyState(tx, { propertyId, tenantId, roomId: booking.room_id, bookingId: id, powerOn: false, requestedBy });
        await createHousekeepingTask(tx, propertyId, tenantId, booking.room_id, id);
      }
      return { booking: rows[0], paidAmount: Number(invoice.amount) };
    });
  },

  async completeHousekeeping(propertyId: string, tenantId: string, completedBy: string | undefined, roomId: string): Promise<void> {
    await pool.transaction(async (tx) => {
      const { rows: rooms } = await tx.query<{ status: string }>(`SELECT status FROM rooms WHERE property_id = $1 AND id = $2 FOR UPDATE`, [propertyId, roomId]);
      if (!rooms[0]) throw Errors.notFound("phòng");
      if (rooms[0].status !== "DIRTY") throw Errors.conflict("Chỉ hoàn tất dọn cho phòng đang ở trạng thái Chờ dọn.");
      await tx.query(`UPDATE rooms SET status = 'VACANT', power_on = false, updated_at = now() WHERE property_id = $1 AND id = $2`, [propertyId, roomId]);
      await setRoomEnergyState(tx, { propertyId, tenantId, roomId, powerOn: false, requestedBy: completedBy });
      await tx.query(
        `UPDATE housekeeping_tasks SET status = 'COMPLETED', completed_by = $3, completed_at = now()
         WHERE id = (SELECT id FROM housekeeping_tasks WHERE property_id = $1 AND room_id = $2
                     AND status IN ('PENDING', 'IN_PROGRESS') ORDER BY created_at DESC LIMIT 1)`,
        [propertyId, roomId, completedBy ?? null]
      );
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
