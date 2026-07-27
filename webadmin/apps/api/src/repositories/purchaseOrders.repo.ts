import { pool } from "../lib/db";
import { Errors } from "../utils/errors";
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from "../types/domain";

export interface PurchaseOrderInput {
  supplierId: string;
  expectedAt?: string | null;
  notes?: string | null;
}

export interface PurchaseOrderItemInput {
  productName: string;
  assetType?: string | null;
  quantity: number;
  unitPrice?: number;
}

// Workflow trạng thái theo yêu cầu: draft → ordered → received/cancelled.
// KHÔNG cho đi lùi hay nhảy cóc (vd. draft → received thẳng) để đảm bảo
// luôn có bước "đã đặt hàng" trước khi ghi nhận đã nhận hàng.
const ALLOWED_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  DRAFT: ["ORDERED", "CANCELLED"],
  ORDERED: ["RECEIVED", "CANCELLED"],
  RECEIVED: [],
  CANCELLED: [],
};

function canTransition(from: PurchaseOrderStatus, to: PurchaseOrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export const purchaseOrdersRepo = {
  async list(opts: { status?: string; supplierId?: string }): Promise<PurchaseOrder[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (opts.status) {
      params.push(opts.status);
      clauses.push(`status = $${params.length}`);
    }
    if (opts.supplierId) {
      params.push(opts.supplierId);
      clauses.push(`supplier_id = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await pool.query<PurchaseOrder>(`SELECT * FROM purchase_orders ${where} ORDER BY created_at DESC`, params);
    return rows;
  },

  async findById(id: string): Promise<PurchaseOrder | null> {
    const { rows } = await pool.query<PurchaseOrder>(`SELECT * FROM purchase_orders WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async listItems(purchaseOrderId: string): Promise<PurchaseOrderItem[]> {
    const { rows } = await pool.query<PurchaseOrderItem>(
      `SELECT * FROM purchase_order_items WHERE purchase_order_id = $1 ORDER BY created_at ASC`,
      [purchaseOrderId]
    );
    return rows;
  },

  async findItemById(itemId: string): Promise<PurchaseOrderItem | null> {
    const { rows } = await pool.query<PurchaseOrderItem>(`SELECT * FROM purchase_order_items WHERE id = $1`, [itemId]);
    return rows[0] ?? null;
  },

  async create(input: PurchaseOrderInput, createdById: string): Promise<PurchaseOrder> {
    const { rows } = await pool.query<PurchaseOrder>(
      `INSERT INTO purchase_orders (id, supplier_id, status, expected_at, created_by, notes)
       VALUES (gen_random_uuid()::text, $1, 'DRAFT', $2, $3, $4)
       RETURNING *`,
      [input.supplierId, input.expectedAt ?? null, createdById, input.notes ?? null]
    );
    return rows[0];
  },

  async addItem(purchaseOrderId: string, input: PurchaseOrderItemInput): Promise<PurchaseOrderItem> {
    const { rows } = await pool.query<PurchaseOrderItem>(
      `INSERT INTO purchase_order_items (id, purchase_order_id, product_name, asset_type, quantity, unit_price)
       VALUES (gen_random_uuid()::text, $1,$2,$3,$4,$5)
       RETURNING *`,
      [purchaseOrderId, input.productName, input.assetType ?? null, input.quantity, input.unitPrice ?? 0]
    );
    return rows[0];
  },

  async removeItem(itemId: string): Promise<void> {
    await pool.query(`DELETE FROM purchase_order_items WHERE id = $1`, [itemId]);
  },

  // Chuyển trạng thái đơn mua hàng. Khi chuyển sang RECEIVED: tự động sinh
  // `hardware_assets` cho từng dòng hàng CÓ gắn asset_type (số lượng bản ghi
  // = quantity của dòng) — quyết định tự đưa ra: dòng hàng KHÔNG gắn
  // asset_type (vd. dây cáp, vật tư tiêu hao) không tạo tài sản theo dõi
  // vòng đời, vì hardware_assets là "tài sản có serial theo dõi bảo hành"
  // theo MODULE_HARDWARE_INVENTORY.md, không phải mọi thứ mua vào.
  //
  // Số serial sinh tự động dạng `PO-<8 ký tự đầu id đơn>-<8 ký tự đầu id
  // dòng hàng>-<số thứ tự>` — CHỈ LÀ CHỖ GIỮ (placeholder) vì số serial thật
  // chỉ biết được khi khui hàng vật lý. Nhân viên SUPPLY_CHAIN cập nhật lại
  // serial thật qua PATCH /api/v1/hardware-assets/:id sau khi đối soát.
  async changeStatus(id: string, newStatus: PurchaseOrderStatus): Promise<PurchaseOrder | null> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows: poRows } = await client.query<PurchaseOrder>(`SELECT * FROM purchase_orders WHERE id = $1 FOR UPDATE`, [id]);
      const po = poRows[0];
      if (!po) {
        await client.query("ROLLBACK");
        return null;
      }
      if (!canTransition(po.status, newStatus)) {
        await client.query("ROLLBACK");
        throw Errors.conflict(`Không thể chuyển trạng thái đơn mua hàng từ ${po.status} sang ${newStatus}.`);
      }

      if (newStatus === "RECEIVED") {
        const { rows: items } = await client.query<PurchaseOrderItem>(
          `SELECT * FROM purchase_order_items WHERE purchase_order_id = $1`,
          [id]
        );
        for (const item of items) {
          if (item.asset_type) {
            for (let i = 0; i < item.quantity; i++) {
              const serial = `PO-${po.id.slice(0, 8)}-${item.id.slice(0, 8)}-${i + 1}`;
              await client.query(
                `INSERT INTO hardware_assets (id, asset_type, brand, model, serial_number, supplier_id, purchase_cost, purchased_at, status)
                 VALUES (gen_random_uuid()::text, $1, NULL, $2, $3, $4, $5, now(), 'IN_STOCK')
                 ON CONFLICT (serial_number) DO NOTHING`,
                [item.asset_type, item.product_name, serial, po.supplier_id, item.unit_price]
              );
            }
          }
          await client.query(`UPDATE purchase_order_items SET received_quantity = quantity, updated_at = now() WHERE id = $1`, [
            item.id,
          ]);
        }
      }

      const { rows } = await client.query<PurchaseOrder>(
        `UPDATE purchase_orders SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`,
        [id, newStatus]
      );
      await client.query("COMMIT");
      return rows[0] ?? null;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },
};
