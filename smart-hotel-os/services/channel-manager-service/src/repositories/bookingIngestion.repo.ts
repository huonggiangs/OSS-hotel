import { randomUUID } from "node:crypto";
import { pool } from "../lib/db";
import type { BookingIngestionLog, BookingIngestionStatus, OtaProvider } from "../types/domain";

export const bookingIngestionRepo = {
  async findByIdempotencyKey(idempotencyKey: string): Promise<BookingIngestionLog | null> {
    const { rows } = await pool.query<BookingIngestionLog>(
      `SELECT * FROM booking_ingestion_log WHERE idempotency_key = $1`,
      [idempotencyKey]
    );
    return rows[0] ?? null;
  },

  async create(input: {
    tenantId: string;
    propertyId: string;
    connectionId: string | null;
    otaProvider: OtaProvider;
    otaBookingId: string;
    idempotencyKey: string;
    roomTypeId: string;
    checkIn: string;
    checkOut: string;
    roomsRequested: number;
    guestName: string | null;
    rawPayload: unknown;
    status: BookingIngestionStatus;
  }): Promise<BookingIngestionLog> {
    const { rows } = await pool.query<BookingIngestionLog>(
      `INSERT INTO booking_ingestion_log
        (id, tenant_id, property_id, connection_id, ota_provider, ota_booking_id, idempotency_key,
         room_type_id, check_in, check_out, rooms_requested, guest_name, raw_payload, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        randomUUID(),
        input.tenantId,
        input.propertyId,
        input.connectionId,
        input.otaProvider,
        input.otaBookingId,
        input.idempotencyKey,
        input.roomTypeId,
        input.checkIn,
        input.checkOut,
        input.roomsRequested,
        input.guestName,
        JSON.stringify(input.rawPayload),
        input.status,
      ]
    );
    return rows[0];
  },

  async listByProperty(propertyId: string, limit = 50): Promise<BookingIngestionLog[]> {
    const { rows } = await pool.query<BookingIngestionLog>(
      `SELECT * FROM booking_ingestion_log WHERE property_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [propertyId, limit]
    );
    return rows;
  },
};
