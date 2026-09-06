import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { expensesRepo } from "../repositories/expenses.repo";
import { settingsRepo } from "../repositories/settings.repo";
import { propertyUsersRepo } from "../repositories/propertyUsers.repo";
import { randomUUID } from "node:crypto";

// Chi phí ngoài chủ cơ sở đi qua hàng đợi phê duyệt trước khi hạch toán.
export const expensesRouter = Router();
expensesRouter.use(requireAuth);

const createSchema = z.object({
  category: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().min(0),
  expenseDate: z.string().optional(),
});

const DailyEntrySchema = z.object({
  id: z.string(), type: z.enum(["Thu", "Chi"]), typeColor: z.string(), desc: z.string(), amount: z.string(), by: z.string(),
  status: z.enum(["approved", "pending", "rejected"]), source: z.string().optional(), expenseId: z.string().optional(), requestedByRole: z.enum(["OWNER", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING"]).optional(),
  expenseDraft: z.object({ category: z.string(), description: z.string().optional(), amount: z.number(), expenseDate: z.string().optional() }).optional(),
});
type DailyEntry = z.infer<typeof DailyEntrySchema>;
type DailyData = { items: DailyEntry[]; incomeTotal: string; expenseTotal: string };

function amountFromDisplay(value: string) {
  const parsed = Number(value.replace(/[^0-9-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
function displayAmount(value: number) { return `${Math.round(value).toLocaleString("vi-VN")}đ`; }
async function readDaily(propertyId: string): Promise<DailyData> {
  const raw = await settingsRepo.get(propertyId, "daily_entries");
  const data = raw && typeof raw === "object" ? raw as Partial<DailyData> : {};
  return { items: Array.isArray(data.items) ? data.items.map((item) => DailyEntrySchema.parse(item)) : [], incomeTotal: data.incomeTotal ?? "0đ", expenseTotal: data.expenseTotal ?? "0đ" };
}
async function writeDaily(propertyId: string, tenantId: string, data: DailyData) { return settingsRepo.upsert(propertyId, tenantId, "daily_entries", data); }

expensesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await expensesRepo.list(req.user!.propertyId);
    res.json({ items, total: items.length });
  })
);

expensesRouter.post(
  "/",
  requireRole("OWNER", "MANAGER", "RECEPTIONIST"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const user = await propertyUsersRepo.findById(req.user!.id);
    const by = user?.full_name || user?.email || req.user!.email;
    const daily = await readDaily(req.user!.propertyId);
    const display = displayAmount(parsed.data.amount);
    if (req.user!.role !== "OWNER") {
      const entry: DailyEntry = { id: `CP-${randomUUID().slice(0, 8).toUpperCase()}`, type: "Chi", typeColor: "#CC2F42", desc: `${parsed.data.category}${parsed.data.description ? ` · ${parsed.data.description}` : ""}`, amount: display, by, status: "pending", source: "EXPENSE_APPROVAL", requestedByRole: req.user!.role, expenseDraft: parsed.data };
      daily.items = [entry, ...daily.items];
      await writeDaily(req.user!.propertyId, req.user!.tenantId, daily);
      await writeAuditLog({ req, action: "SUBMIT_EXPENSE_FOR_APPROVAL", entityType: "daily_expense_request", entityId: entry.id, afterData: entry });
      return res.status(202).json({ approvalRequired: true, entry });
    }
    const expense = await expensesRepo.create(req.user!.propertyId, req.user!.tenantId, req.user!.id, parsed.data);
    daily.items = [{ id: `CP-${randomUUID().slice(0, 8).toUpperCase()}`, type: "Chi", typeColor: "#CC2F42", desc: `${parsed.data.category}${parsed.data.description ? ` · ${parsed.data.description}` : ""}`, amount: display, by, status: "approved", source: "EXPENSE_APPROVAL", expenseId: expense.id }, ...daily.items];
    daily.expenseTotal = displayAmount(amountFromDisplay(daily.expenseTotal) + parsed.data.amount);
    await writeDaily(req.user!.propertyId, req.user!.tenantId, daily);
    await writeAuditLog({ req, action: "CREATE_EXPENSE", entityType: "expense", entityId: expense.id, afterData: expense });
    res.status(201).json({ ...expense, approvalRequired: false });
  })
);

expensesRouter.post(
  "/requests/:id/approve",
  requireRole("OWNER", "MANAGER"),
  asyncHandler(async (req, res) => {
    const daily = await readDaily(req.user!.propertyId);
    const index = daily.items.findIndex((item) => item.id === req.params.id && item.source === "EXPENSE_APPROVAL");
    const entry = daily.items[index];
    if (!entry) throw Errors.notFound("đề nghị chi phí");
    if (entry.status !== "pending" || !entry.expenseDraft) throw Errors.conflict("Đề nghị này đã được xử lý.");
    if (entry.requestedByRole === "MANAGER" && req.user!.role !== "OWNER") throw Errors.forbidden();
    const expense = await expensesRepo.create(req.user!.propertyId, req.user!.tenantId, req.user!.id, entry.expenseDraft);
    daily.items[index] = { ...entry, status: "approved", expenseId: expense.id };
    daily.expenseTotal = displayAmount(amountFromDisplay(daily.expenseTotal) + entry.expenseDraft.amount);
    await writeDaily(req.user!.propertyId, req.user!.tenantId, daily);
    await writeAuditLog({ req, action: "APPROVE_EXPENSE", entityType: "expense", entityId: expense.id, afterData: expense });
    res.json({ expense, daily });
  })
);

expensesRouter.post(
  "/requests/:id/reject",
  requireRole("OWNER", "MANAGER"),
  asyncHandler(async (req, res) => {
    const daily = await readDaily(req.user!.propertyId);
    const index = daily.items.findIndex((item) => item.id === req.params.id && item.source === "EXPENSE_APPROVAL");
    const entry = daily.items[index];
    if (!entry) throw Errors.notFound("đề nghị chi phí");
    if (entry.status !== "pending") throw Errors.conflict("Đề nghị này đã được xử lý.");
    daily.items[index] = { ...entry, status: "rejected" };
    await writeDaily(req.user!.propertyId, req.user!.tenantId, daily);
    await writeAuditLog({ req, action: "REJECT_EXPENSE", entityType: "daily_expense_request", entityId: entry.id, afterData: { status: "rejected" } });
    res.json({ daily });
  })
);
