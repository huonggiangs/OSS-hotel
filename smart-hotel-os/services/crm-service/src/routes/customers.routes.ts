import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { customersRepo } from "../repositories/customers.repo";
import { segmentsRepo } from "../repositories/segments.repo";

export const customersRouter = Router();

customersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const propertyId = req.query.propertyId as string | undefined;
    const customers = await customersRepo.list(propertyId);
    const segments = propertyId ? await segmentsRepo.listByProperty(propertyId) : [];
    const segmentByCustomer = new Map(segments.map((s) => [s.customer_id, s]));
    res.json({
      items: customers.map((c) => ({ ...c, segment: segmentByCustomer.get(c.id)?.segment ?? null })),
      total: customers.length,
    });
  })
);

const createSchema = z.object({
  tenantId: z.string().min(1),
  propertyId: z.string().min(1),
  fullName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

customersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const customer = await customersRepo.create({ id: randomUUID(), ...parsed.data });
    res.status(201).json(customer);
  })
);
