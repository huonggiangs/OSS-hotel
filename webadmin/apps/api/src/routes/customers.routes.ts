import { Router } from "express";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { customersRepo } from "../repositories/customers.repo";
import { provisionProperty } from "../lib/propertyWebClient";
import { sendOnboardingEmail } from "../lib/onboardingMail";

export const customersRouter = Router();
customersRouter.use(requireAuth);

const upsertSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  partnerId: z.string().uuid().optional().nullable(),
  usesKiosk: z.boolean().default(false),
  usesSmartHotelOs: z.boolean().default(false),
  shoTenantId: z.string().optional(),
  kioskCustomerId: z.string().optional(),
  billingStatus: z.enum(["ACTIVE", "OVERDUE", "SUSPENDED"]).default("ACTIVE"),
});

const provisionSchema = z.object({
  name: z.string().trim().min(1).max(255),
  address: z.string().trim().max(500).optional(),
  contactName: z.string().trim().max(255).optional(),
  contactEmail: z.string().email(),
  contactPhone: z.string().trim().max(60).optional(),
  ownerFullName: z.string().trim().min(1).max(255),
  ownerEmail: z.string().email(),
  ownerPhone: z.string().trim().max(60).optional(),
  username: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9._-]+$/).optional(),
  temporaryPassword: z.string().min(12).max(128).optional(),
  sendEmail: z.boolean().default(true),
  partnerId: z.string().uuid().optional().nullable(),
});

function deriveUsername(email: string): string {
  const base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "-").replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
  return (base.length >= 3 ? base : `owner-${base || "pms"}`).slice(0, 80);
}

function generateTemporaryPassword(): string {
  // 16 bytes base64url (~22 chars) đủ entropy; thêm ký tự chữ để tương thích
  // bàn phím/điều kiện mật khẩu của các client cũ.
  return `Anio-${randomBytes(16).toString("base64url")}-A9`;
}

customersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await customersRepo.list({
      search: req.query.search as string | undefined,
      product: req.query.product as string | undefined,
    });
    res.json({ items, total: items.length });
  })
);

/**
 * Tạo một khách hàng HQ kèm cơ sở PMS và tài khoản OWNER. Đây là workflow
 * onboarding duy nhất, tránh việc tạo hồ sơ HQ xong rồi quên tạo user/PMS.
 * Need refs: N3,N4,N5 — nhucau.md.
 */
customersRouter.post(
  "/provision",
  requireRole("SALES_MANAGER", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = provisionSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const input = parsed.data;
    if (input.ownerEmail.toLowerCase() !== input.contactEmail.toLowerCase()) {
      // Cho phép email bàn giao khác email pháp nhân nhưng luôn hiển thị rõ
      // cho người tạo biết email nào nhận thông tin đăng nhập.
    }
    const username = input.username ?? deriveUsername(input.ownerEmail);
    const temporaryPassword = input.temporaryPassword ?? generateTemporaryPassword();
    const customer = await customersRepo.create({
      name: input.name,
      address: input.address,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      partnerId: input.partnerId,
      usesSmartHotelOs: true,
      onboardingStatus: "PROVISIONING",
    });

    try {
      const provisioned = await provisionProperty({
        tenantId: customer.id,
        propertyName: input.name,
        address: input.address,
        phone: input.contactPhone,
        owner: { username, email: input.ownerEmail, fullName: input.ownerFullName, password: temporaryPassword, phone: input.ownerPhone },
      });
      const pmsUrl = process.env.PMS_PUBLIC_URL ?? "http://SONANIO25:3100";
      const emailResult = input.sendEmail
        ? await sendOnboardingEmail({ recipient: input.ownerEmail, ownerName: input.ownerFullName, propertyName: input.name, username: provisioned.owner.username, pmsUrl })
        : { status: "NOT_CONFIGURED" as const, error: "Người tạo chưa yêu cầu gửi email." };
      const status = emailResult.status === "SENT" ? "EMAIL_SENT" : emailResult.status === "FAILED" ? "EMAIL_FAILED" : "EMAIL_NOT_CONFIGURED";
      const saved = await customersRepo.updateOnboarding(customer.id, {
        pmsPropertyId: provisioned.property.id,
        shoTenantId: provisioned.property.tenant_id,
        status,
        emailSentAt: emailResult.sentAt ?? null,
        lastError: emailResult.error ?? null,
      });
      const response = {
        customer: saved,
        pms: { property_id: provisioned.property.id, property_name: provisioned.property.name, login_url: pmsUrl, setup_steps: provisioned.setup_steps },
        owner: { id: provisioned.owner.id, username: provisioned.owner.username, email: provisioned.owner.email, full_name: provisioned.owner.full_name, role: provisioned.owner.role },
        credentials: provisioned.credentials_created ? { username: provisioned.owner.username, temporary_password: temporaryPassword, display_once: true } : null,
        email: { status: emailResult.status, recipient: input.ownerEmail, sent_at: emailResult.sentAt ?? null, error: emailResult.error ?? null },
      };
      await writeAuditLog({ req, action: "PROVISION_CUSTOMER_PMS", entityType: "customer", entityId: customer.id, afterData: { customer: saved, pms_property_id: provisioned.property.id, email_status: emailResult.status, credentials_created: provisioned.credentials_created } });
      res.status(201).json(response);
    } catch (err) {
      const message = err instanceof Error ? err.message.slice(0, 500) : "Không provision được cơ sở PMS.";
      const saved = await customersRepo.updateOnboarding(customer.id, { status: "PROVISIONING", lastError: message });
      await writeAuditLog({ req, action: "PROVISION_CUSTOMER_PMS_FAILED", entityType: "customer", entityId: customer.id, afterData: { customer: saved, error: message } });
      res.status(201).json({ customer: saved, pms: null, owner: null, credentials: null, email: { status: "NOT_CONFIGURED", recipient: input.ownerEmail, sent_at: null, error: message } });
    }
  })
);

customersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await customersRepo.findById(req.params.id);
    if (!customer) throw Errors.notFound("khách hàng");
    const tickets = await customersRepo.listTickets(customer.id);
    res.json({ ...customer, support_tickets: tickets });
  })
);

customersRouter.post(
  "/",
  requireRole("SALES_MANAGER", "OPS_SUPPORT", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const customer = await customersRepo.create(parsed.data);
    await writeAuditLog({ req, action: "CREATE_CUSTOMER", entityType: "customer", entityId: customer.id, afterData: customer });
    res.status(201).json(customer);
  })
);

customersRouter.patch(
  "/:id",
  requireRole("SALES_MANAGER", "OPS_SUPPORT", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const existing = await customersRepo.findById(req.params.id);
    if (!existing) throw Errors.notFound("khách hàng");
    const parsed = upsertSchema.partial().safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const customer = await customersRepo.update(req.params.id, parsed.data);
    await writeAuditLog({ req, action: "UPDATE_CUSTOMER", entityType: "customer", entityId: req.params.id, beforeData: existing, afterData: customer });
    res.json(customer);
  })
);

customersRouter.post(
  "/:id/support-tickets",
  requireRole("OPS_SUPPORT", "SALES_MANAGER", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const schema = z.object({ subject: z.string().min(1), description: z.string().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());

    const customer = await customersRepo.findById(req.params.id);
    if (!customer) throw Errors.notFound("khách hàng");

    const ticket = await customersRepo.createTicket(customer.id, parsed.data.subject, parsed.data.description);
    await writeAuditLog({ req, action: "CREATE_SUPPORT_TICKET", entityType: "support_ticket", entityId: ticket.id, afterData: ticket });
    res.status(201).json(ticket);
  })
);
