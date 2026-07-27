import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { expensesRepo } from "../repositories/expenses.repo";

export const expensesRouter = Router();
expensesRouter.use(requireAuth);

const createSchema = z.object({
  category: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().min(0),
  expenseDate: z.string().optional(),
});

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
    const expense = await expensesRepo.create(req.user!.propertyId, req.user!.tenantId, req.user!.id, parsed.data);
    await writeAuditLog({ req, action: "CREATE_EXPENSE", entityType: "expense", entityId: expense.id, afterData: expense });
    res.status(201).json(expense);
  })
);
