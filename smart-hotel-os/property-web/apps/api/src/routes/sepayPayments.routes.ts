import { Router } from "express";
import { pool } from "../lib/db";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError, Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { settingsRepo } from "../repositories/settings.repo";
import { invoicesRepo } from "../repositories/invoices.repo";
import { decryptSepayToken } from "../lib/settingsSecrets";

// Tích hợp cổng thanh toán SePay (chuyển khoản ngân hàng/VietQR) — theo đúng
// tài liệu công khai của SePay (xem ghi chú ở từng endpoint). Có 3 router:
//  - sepayRouter: các endpoint YÊU CẦU đăng nhập (đồng bộ giao dịch, lấy QR
//    cho 1 hoá đơn cụ thể) — mount tại "/api/v1/payments/sepay".
//  - sepayWebhookRouter: endpoint CÔNG KHAI SePay gọi đến từ máy chủ của họ
//    (không có JWT của ta) — PHẢI mount CÙNG prefix "/api/v1/payments/sepay"
//    như sepayRouter (đúng path SePay yêu cầu: .../sepay/webhook) nhưng KHÔNG
//    được đi qua middleware requireAuth — vì Express middleware gắn ở cấp
//    router áp dụng cho MỌI route trong router đó, endpoint webhook phải tách
//    thành router riêng, mount TRƯỚC sepayRouter (index.ts) để request khớp
//    router công khai này trước, không rơi vào requireAuth của sepayRouter.
//  - publicSepayRouter: mount tại "/api/v1/public/payments" — trang khách
//    quét QR phòng (apps/web/src/components/guest/GuestRoomView.tsx) gọi
//    trước khi khách check-in (chưa có tài khoản đăng nhập).
export const sepayRouter = Router();
export const sepayWebhookRouter = Router();
export const publicSepayRouter = Router();
sepayRouter.use(requireAuth);

interface SepaySettings {
  enabled: boolean;
  bankAccount: string;
  bankName: string;
  accountHolder: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractSepay(settingsData: unknown): SepaySettings | null {
  if (!isRecord(settingsData) || !isRecord(settingsData.sepay)) return null;
  const s = settingsData.sepay;
  return {
    enabled: Boolean(s.enabled),
    bankAccount: typeof s.bankAccount === "string" ? s.bankAccount : "",
    bankName: typeof s.bankName === "string" ? s.bankName : "",
    accountHolder: typeof s.accountHolder === "string" ? s.accountHolder : "",
  };
}

// Bỏ dấu tiếng Việt — VietQR chỉ chấp nhận ASCII thuần trong "des" (nội dung
// chuyển khoản), khớp đúng hàm cùng tên đã dùng ở GuestRoomView.tsx phía FE.
const COMBINING_MARKS_RE = new RegExp("[\\u0300-\\u036f]", "g");
function stripDiacritics(str: string): string {
  return str
    .normalize("NFD")
    .replace(COMBINING_MARKS_RE, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function buildVietQrUrl(acc: string, bank: string, amount: number, desc: string): string {
  const params = new URLSearchParams({
    acc,
    bank,
    amount: String(amount),
    des: desc,
    template: "compact",
    showinfo: "true",
  });
  return `https://vietqr.app/img?${params.toString()}`;
}

/**
 * Khớp 1 giao dịch SePay (đã xác định số tiền + nội dung) với 1 hoá đơn đang
 * PENDING của property — dùng chung cho cả endpoint /sync (chủ động gọi
 * SePay) và /webhook (SePay gọi đến). Khớp theo: số tiền bằng đúng amount hoá
 * đơn VÀ nội dung chuyển khoản/tham chiếu chứa mã hoá đơn (vd. "HD-8891").
 * Chặn double-processing bằng UNIQUE(sepay_ref) + điều kiện "sepay_ref IS
 * NULL" khi UPDATE — mỗi giao dịch SePay chỉ khớp được 1 hoá đơn duy nhất.
 */
async function tryMatchInvoicePayment(
  propertyId: string,
  sepayTransactionId: string,
  searchText: string,
  amountIn: number
): Promise<string | null> {
  if (!amountIn || amountIn <= 0) return null;

  // Giao dịch này đã được gắn vào 1 hoá đơn khác từ trước — bỏ qua, không xử
  // lý lại (UNIQUE constraint invoices_sepay_ref_unique cũng chặn ở tầng DB,
  // kiểm tra trước ở đây để trả kết quả rõ ràng hơn thay vì bắt lỗi UNIQUE).
  const { rows: already } = await pool.query<{ id: string }>(`SELECT id FROM invoices WHERE sepay_ref = $1`, [
    sepayTransactionId,
  ]);
  if (already.length > 0) return null;

  const { rows: pending } = await pool.query<{ id: string; code: string; amount: string }>(
    `SELECT id, code, amount FROM invoices WHERE property_id = $1 AND status = 'PENDING' AND sepay_ref IS NULL ORDER BY created_at ASC`,
    [propertyId]
  );
  const haystack = searchText.toUpperCase();
  const match = pending.find((inv) => Number(inv.amount) === amountIn && haystack.includes(inv.code.toUpperCase()));
  if (!match) return null;

  const { rows: updated } = await pool.query<{ id: string }>(
    `UPDATE invoices SET status = 'PAID', paid_at = now(), sepay_ref = $1
     WHERE id = $2 AND property_id = $3 AND sepay_ref IS NULL
     RETURNING id`,
    [sepayTransactionId, match.id, propertyId]
  );
  return updated[0]?.id ?? null;
}

interface SepayTransaction {
  id: string | number;
  amount_in?: string | number;
  transaction_content?: string;
  reference_number?: string;
  transaction_date?: string;
}

// POST /api/v1/payments/sepay/sync — nút "Đồng bộ giao dịch ngay". Gọi
// server-to-server TỪ API của ta SANG SePay (hoạt động được kể cả khi dev
// server của ta không public), lấy danh sách giao dịch gần nhất rồi thử khớp
// từng giao dịch với hoá đơn PENDING. Xem tài liệu:
// https://my.sepay.vn/userapi/transactions/list
sepayRouter.post(
  "/sync",
  requireRole("OWNER", "MANAGER"),
  asyncHandler(async (req, res) => {
    const propertyId = req.user!.propertyId;
    const settingsData = await settingsRepo.get(propertyId, "payment");
    const sepay = extractSepay(settingsData);
    if (!sepay || !sepay.bankAccount) {
      throw new ApiError(400, "SEPAY_NOT_CONFIGURED", "Chưa cấu hình số tài khoản ngân hàng cho SePay.");
    }
    const token = decryptSepayToken(isRecord(settingsData) ? settingsData.sepay : null);
    if (!token) {
      throw new ApiError(400, "SEPAY_TOKEN_MISSING", "Chưa cấu hình API Token SePay — vào Cấu hình Công ty → API Access trên my.sepay.vn để tạo token.");
    }

    let sepayRes: Response;
    try {
      sepayRes = await fetch(
        `https://my.sepay.vn/userapi/transactions/list?account_number=${encodeURIComponent(sepay.bankAccount)}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) }
      );
    } catch {
      throw new ApiError(502, "SEPAY_UNREACHABLE", "Không kết nối được tới SePay. Vui lòng thử lại sau.");
    }
    if (!sepayRes.ok) {
      throw new ApiError(502, "SEPAY_API_ERROR", `SePay trả về lỗi (HTTP ${sepayRes.status}). Kiểm tra lại API Token/số tài khoản.`);
    }

    let payload: { transactions?: SepayTransaction[] };
    try {
      payload = (await sepayRes.json()) as { transactions?: SepayTransaction[] };
    } catch {
      throw new ApiError(502, "SEPAY_API_ERROR", "Không đọc được phản hồi từ SePay.");
    }

    const transactions = payload.transactions ?? [];
    let matched = 0;
    for (const tx of transactions) {
      if (tx.id === undefined || tx.id === null) continue;
      const amountIn = Math.round(Number(tx.amount_in ?? 0));
      const searchText = `${tx.transaction_content ?? ""} ${tx.reference_number ?? ""}`;
      const invoiceId = await tryMatchInvoicePayment(propertyId, String(tx.id), searchText, amountIn);
      if (invoiceId) {
        matched += 1;
        await writeAuditLog({
          req,
          action: "SEPAY_MATCH_PAYMENT",
          entityType: "invoice",
          entityId: invoiceId,
          afterData: { sepayTransactionId: tx.id, amountIn, via: "sync" },
        });
      }
    }
    res.json({ checked: transactions.length, matched });
  })
);

// GET /api/v1/payments/sepay/qr?invoiceId=... — QR VietQR cho 1 hoá đơn cụ
// thể (đã có, ví dụ hoá đơn tạo tại quầy). Không cần token SePay (VietQR
// không yêu cầu xác thực), chỉ cần đã cấu hình + bật SePay.
sepayRouter.get(
  "/qr",
  asyncHandler(async (req, res) => {
    const invoiceId = typeof req.query.invoiceId === "string" ? req.query.invoiceId : "";
    if (!invoiceId) throw Errors.validation({ invoiceId: "Thiếu invoiceId." });
    const invoice = await invoicesRepo.findById(req.user!.propertyId, invoiceId);
    if (!invoice) throw Errors.notFound("hoá đơn");

    const settingsData = await settingsRepo.get(invoice.property_id, "payment");
    const sepay = extractSepay(settingsData);
    if (!sepay || !sepay.enabled || !sepay.bankAccount || !sepay.bankName) {
      res.json({ imgUrl: null });
      return;
    }
    const amount = Math.round(Number(invoice.amount));
    const desc = stripDiacritics(invoice.code);
    res.json({ imgUrl: buildVietQrUrl(sepay.bankAccount, sepay.bankName, amount, desc) });
  })
);

interface SepayWebhookPayload {
  id: number | string;
  gateway?: string;
  transactionDate?: string;
  accountNumber?: string;
  code?: string | null;
  content?: string;
  transferType?: "in" | "out";
  transferAmount?: number;
  referenceCode?: string;
}

// POST /api/v1/payments/sepay/webhook — endpoint CÔNG KHAI SePay gọi đến khi
// có biến động số dư (thời gian thực, chỉ hoạt động khi app này được deploy
// với URL công khai — không hoạt động ở local dev vì SePay không reach được
// localhost, nhưng endpoint vẫn phải nhận đúng chuẩn để test bằng curl/khi
// deploy). Phải phản hồi 200/201 + {"success": true} trong 30s, nếu không
// SePay sẽ đưa vào hàng đợi thử lại. Idempotent theo "id" của SePay.
sepayWebhookRouter.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    const body = req.body as SepayWebhookPayload | undefined;
    if (!body || body.id === undefined || body.id === null || body.id === "") {
      // Payload không hợp lệ (thiếu "id" — không thể khử trùng lặp) — đây là
      // TRƯỜNG HỢP DUY NHẤT trả khác 200, theo đúng spec SePay.
      res.status(400).json({ success: false, message: "Thiếu trường id trong payload webhook." });
      return;
    }
    const eventId = String(body.id);

    // (a) Khử trùng lặp — SePay retry nếu lần trước không nhận đủ 200 +
    // {"success":true}. Đã xử lý rồi thì trả 200 ngay, không xử lý lại.
    const { rows: existing } = await pool.query<{ id: string }>(`SELECT id FROM sepay_webhook_events WHERE id = $1`, [
      eventId,
    ]);
    if (existing.length > 0) {
      res.status(200).json({ success: true });
      return;
    }

    // Đơn giản hoá đã biết: hiện chỉ có 1 property demo — thực tế multi-property
    // cần định tuyến webhook theo URL riêng từng cơ sở hoặc tra theo
    // accountNumber, nằm ngoài phạm vi lần triển khai này.
    const { rows: properties } = await pool.query<{ id: string }>(`SELECT id FROM properties LIMIT 1`);
    const propertyId = properties[0]?.id;
    if (!propertyId) {
      // eslint-disable-next-line no-console
      console.warn("[sepay webhook] Không tìm thấy property nào để gắn sự kiện webhook — bỏ qua lưu.");
      res.status(200).json({ success: true });
      return;
    }

    // (c) Nếu là tiền vào tài khoản, thử khớp hoá đơn PENDING (không khớp
    // được không phải lỗi giao webhook — vẫn trả 200, chỉ ghi log).
    let matchedInvoiceId: string | null = null;
    if (body.transferType === "in" && typeof body.transferAmount === "number") {
      const searchText = `${body.content ?? ""} ${body.code ?? ""} ${body.referenceCode ?? ""}`;
      matchedInvoiceId = await tryMatchInvoicePayment(propertyId, eventId, searchText, Math.round(body.transferAmount));
    }

    // (b) Lưu nhật ký sự kiện (audit trail + khử trùng lặp lần sau).
    await pool.query(
      `INSERT INTO sepay_webhook_events (id, property_id, raw_payload, matched_invoice_id)
       VALUES ($1, $2, $3::jsonb, $4)
       ON CONFLICT (id) DO NOTHING`,
      [eventId, propertyId, JSON.stringify(body), matchedInvoiceId]
    );

    // (d) Luôn trả 200 + {"success":true} khi đã tiếp nhận & lưu sự kiện.
    res.status(200).json({ success: true });
  })
);

// GET /api/v1/public/payments/sepay-qr?amount=...&desc=... — QR trả trước
// dùng ở trang khách quét QR phòng (chưa có hoá đơn, chưa đăng nhập). Hợp
// đồng phản hồi CỐ ĐỊNH (một agent khác ở trang /price::/guest phụ thuộc
// đúng shape này): { enabled: true, imgUrl } hoặc { enabled: false }.
publicSepayRouter.get(
  "/sepay-qr",
  asyncHandler(async (req, res) => {
    const amount = Math.round(Number(req.query.amount));
    const descRaw = typeof req.query.desc === "string" ? req.query.desc : "";
    if (!Number.isFinite(amount) || amount <= 0 || !descRaw) {
      res.json({ enabled: false });
      return;
    }

    // Đơn giản hoá đã biết: chưa có hoá đơn ở bước này (khách chưa check-in)
    // nên dùng thẳng tài khoản ngân hàng đã cấu hình của property demo duy
    // nhất — giống giới hạn đã ghi ở webhook phía trên.
    const { rows: properties } = await pool.query<{ id: string }>(`SELECT id FROM properties LIMIT 1`);
    const propertyId = properties[0]?.id;
    if (!propertyId) {
      res.json({ enabled: false });
      return;
    }

    const settingsData = await settingsRepo.get(propertyId, "payment");
    const sepay = extractSepay(settingsData);
    if (!sepay || !sepay.enabled || !sepay.bankAccount || !sepay.bankName) {
      res.json({ enabled: false });
      return;
    }

    const desc = stripDiacritics(descRaw);
    res.json({ enabled: true, imgUrl: buildVietQrUrl(sepay.bankAccount, sepay.bankName, amount, desc) });
  })
);
