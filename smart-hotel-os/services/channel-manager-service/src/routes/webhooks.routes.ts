import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { pool } from "../lib/db";
import { connectionsRepo } from "../repositories/connections.repo";
import { bookingIngestionRepo } from "../repositories/bookingIngestion.repo";
import { overbookingRepo } from "../repositories/overbooking.repo";
import { getOtaAdapter, SUPPORTED_PROVIDERS } from "../adapters";
import type { OtaProvider } from "../types/domain";

export const webhooksRouter = Router();

const bookingWebhookSchema = z.object({
  tenantId: z.string().min(1),
  propertyId: z.string().min(1),
  otaBookingId: z.string().min(1),
  idempotencyKey: z.string().min(1),
  roomTypeId: z.string().min(1),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  roomsRequested: z.number().int().min(1).default(1),
  guestName: z.string().optional(),
});

/** Liệt kê từng đêm ở trong khoảng [checkIn, checkOut) — mỗi đêm phải còn đủ phòng. */
function listNights(checkIn: string, checkOut: string): string[] {
  const nights: string[] = [];
  const cursor = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  while (cursor < end) {
    nights.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return nights;
}

// POST /webhooks/:provider/bookings
//
// Idempotent theo RULES.md mục 10: OTA có thể gọi lại webhook (retry mạng)
// cho cùng một booking nhiều lần — request thứ 2 trở đi trả về đúng bản ghi
// đã xử lý lần đầu, KHÔNG tạo booking trùng, KHÔNG trừ tồn phòng lần 2.
//
// Chống overbooking (MODULE_CHANNEL_MANAGER_BOOKING.md mục A.3): kiểm tra
// room_type_inventory_cache TRƯỚC KHI ghi nhận — nếu không đủ phòng cho bất kỳ
// đêm nào trong khoảng lưu trú, từ chối, ghi overbooking_alerts, và gọi
// adapter.cancelBooking() để yêu cầu OTA huỷ/đóng băng booking thừa.
webhooksRouter.post(
  "/:provider/bookings",
  asyncHandler(async (req, res) => {
    const provider = req.params.provider as OtaProvider;
    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      throw Errors.validation({ provider: `Không hỗ trợ kênh '${provider}'.` });
    }

    const parsed = bookingWebhookSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const input = parsed.data;

    // --- Idempotency check (trước khi làm bất kỳ việc gì khác) ---
    const existing = await bookingIngestionRepo.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return res.status(200).json({ idempotent_replay: true, booking: existing });
    }

    const connection = await connectionsRepo.findByPropertyAndProvider(input.propertyId, provider);
    const adapter = getOtaAdapter(provider);

    // --- Xác thực webhook (chữ ký/token tuỳ kênh, mock ở đây) ---
    const signatureValid = adapter.verifyWebhookSignature(
      req.headers as Record<string, string | undefined>,
      req.body,
      connection?.credentials ?? {}
    );
    if (!signatureValid) throw Errors.unauthorized();

    const nights = listNights(input.checkIn, input.checkOut);
    if (nights.length === 0) throw Errors.validation({ checkOut: "checkOut phải sau checkIn" });

    // --- Kiểm tra tồn phòng cho MỌI đêm trong khoảng lưu trú, trong 1 transaction
    //     để tránh race condition giữa 2 webhook đến gần như đồng thời cho cùng
    //     phòng cuối cùng (MODULE_CHANNEL_MANAGER_BOOKING.md mục A.3 điểm 2). ---
    const client = await pool.connect();
    let insufficientNight: string | null = null;
    try {
      await client.query("BEGIN");
      // Khoá các dòng liên quan để 2 request song song không cùng đọc thấy "còn phòng".
      const { rows: cacheRows } = await client.query(
        `SELECT date, available_rooms FROM room_type_inventory_cache
         WHERE property_id = $1 AND room_type_id = $2 AND date = ANY($3::date[])
         FOR UPDATE`,
        [input.propertyId, input.roomTypeId, nights]
      );
      // r.date đã là chuỗi 'YYYY-MM-DD' thuần nhờ type parser ở lib/db.ts (KHÔNG
      // phải JS Date) — không được gọi .toISOString() ở đây kẻo lại gây lệch ngày.
      const availableByDate = new Map(cacheRows.map((r) => [String(r.date), r.available_rooms as number]));

      for (const night of nights) {
        const available = availableByDate.get(night) ?? 0;
        if (available < input.roomsRequested) {
          insufficientNight = night;
          break;
        }
      }

      if (insufficientNight) {
        await client.query("ROLLBACK");
      } else {
        for (const night of nights) {
          await client.query(
            `UPDATE room_type_inventory_cache SET available_rooms = available_rooms - $4, updated_at = now()
             WHERE property_id = $1 AND room_type_id = $2 AND date = $3`,
            [input.propertyId, input.roomTypeId, night, input.roomsRequested]
          );
        }
        await client.query("COMMIT");
      }
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    if (insufficientNight) {
      const rejected = await bookingIngestionRepo.create({
        tenantId: input.tenantId,
        propertyId: input.propertyId,
        connectionId: connection?.id ?? null,
        otaProvider: provider,
        otaBookingId: input.otaBookingId,
        idempotencyKey: input.idempotencyKey,
        roomTypeId: input.roomTypeId,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        roomsRequested: input.roomsRequested,
        guestName: input.guestName ?? null,
        rawPayload: req.body,
        status: "REJECTED_OVERBOOKING",
      });
      const alert = await overbookingRepo.create({
        tenantId: input.tenantId,
        propertyId: input.propertyId,
        roomTypeId: input.roomTypeId,
        date: insufficientNight,
        otaProvider: provider,
        bookingIngestionLogId: rejected.id,
        message: `Không đủ phòng loại '${input.roomTypeId}' vào ngày ${insufficientNight} cho booking OTA ${input.otaBookingId} (kênh ${provider}). Đã tự động yêu cầu huỷ booking thừa trên OTA.`,
      });
      // Yêu cầu OTA huỷ/đóng băng booking thừa (mục A.3).
      await adapter.cancelBooking(input.otaBookingId, connection?.credentials ?? {});

      return res.status(200).json({
        accepted: false,
        reason: "OVERBOOKING_PREVENTED",
        booking: rejected,
        alert,
      });
    }

    const accepted = await bookingIngestionRepo.create({
      tenantId: input.tenantId,
      propertyId: input.propertyId,
      connectionId: connection?.id ?? null,
      otaProvider: provider,
      otaBookingId: input.otaBookingId,
      idempotencyKey: input.idempotencyKey,
      roomTypeId: input.roomTypeId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      roomsRequested: input.roomsRequested,
      guestName: input.guestName ?? null,
      rawPayload: req.body,
      status: "ACCEPTED",
    });

    res.status(201).json({ accepted: true, booking: accepted });
  })
);

webhooksRouter.get(
  "/bookings",
  asyncHandler(async (req, res) => {
    const propertyId = req.query.propertyId as string | undefined;
    if (!propertyId) throw Errors.validation({ propertyId: "Bắt buộc truyền query propertyId" });
    const items = await bookingIngestionRepo.listByProperty(propertyId);
    res.json({ items, total: items.length });
  })
);

webhooksRouter.get(
  "/overbooking-alerts",
  asyncHandler(async (req, res) => {
    const propertyId = req.query.propertyId as string | undefined;
    if (!propertyId) throw Errors.validation({ propertyId: "Bắt buộc truyền query propertyId" });
    const items = await overbookingRepo.listByProperty(propertyId);
    res.json({ items, total: items.length });
  })
);
