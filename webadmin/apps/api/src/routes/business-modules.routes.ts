import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAuditLog } from "../middleware/audit";
import { customersRepo } from "../repositories/customers.repo";
import { businessModulesRepo } from "../repositories/businessModules.repo";
import { fetchPropertyWebBranches, syncBusinessModulesToProperty } from "../lib/propertyWebClient";

export const businessModulesRouter = Router();
businessModulesRouter.use(requireAuth);

const moduleKey = z.enum(["IOT_CONTROL", "MAINTENANCE_ASSETS", "CRM_MARKETING", "CHANNEL_MANAGER", "REPORTING_VALUE"]);
const customerQuery = z.object({ customerId: z.string().min(1) });

async function syncCustomer(customerId: string) {
  const customer = await customersRepo.findById(customerId);
  if (!customer) throw Errors.notFound("khách hàng");
  if (!customer.pms_property_id || !customer.sho_tenant_id) {
    const message = "Khách hàng chưa được liên kết với cơ sở PMS.";
    await businessModulesRepo.markSync(customerId, { ok: false, error: message });
    return { status: "FAILED" as const, message };
  }
  const modules = await businessModulesRepo.list(customerId);
  try {
    await syncBusinessModulesToProperty({
      propertyId: customer.pms_property_id,
      tenantId: customer.sho_tenant_id,
      modules: modules.map((item) => ({
        moduleKey: item.module_key,
        enabled: item.enabled,
        disabledReason: item.disabled_reason,
      })),
    });
    await businessModulesRepo.markSync(customerId, { ok: true });
    return { status: "SYNCED" as const, message: "PMS đã nhận trạng thái module mới." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không đồng bộ được trạng thái module xuống PMS.";
    await businessModulesRepo.markSync(customerId, { ok: false, error: message });
    return { status: "FAILED" as const, message };
  }
}

businessModulesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = customerQuery.safeParse(req.query);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const customer = await customersRepo.findById(parsed.data.customerId);
    if (!customer) throw Errors.notFound("khách hàng");
    const [items, availableProperties] = await Promise.all([
      businessModulesRepo.list(customer.id),
      customer.pms_property_id ? Promise.resolve([]) : fetchPropertyWebBranches().then((branches) => branches ?? []),
    ]);
    res.json({
      customer: { id: customer.id, name: customer.name, pms_property_id: customer.pms_property_id },
      items,
      available_properties: availableProperties,
      total: items.length,
      enabled: items.filter((item) => item.enabled).length,
      disabled: items.filter((item) => !item.enabled).length,
    });
  })
);

businessModulesRouter.post(
  "/link-property",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = z.object({ customerId: z.string().min(1), propertyId: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const [customer, branches] = await Promise.all([
      customersRepo.findById(parsed.data.customerId),
      fetchPropertyWebBranches(),
    ]);
    if (!customer) throw Errors.notFound("khách hàng");
    const property = branches?.find((item) => item.id === parsed.data.propertyId);
    if (!property) throw Errors.notFound("cơ sở PMS");
    const existingOwner = await customersRepo.findByPmsPropertyId(property.id);
    if (existingOwner && existingOwner.id !== customer.id) throw Errors.conflict("Cơ sở PMS này đã được gán cho khách hàng khác.");
    const updated = await customersRepo.update(customer.id, { pmsPropertyId: property.id, shoTenantId: property.tenant_id });
    const sync = await syncCustomer(customer.id);
    await writeAuditLog({ req, action: "LINK_CUSTOMER_PMS_PROPERTY", entityType: "customer", entityId: customer.id, beforeData: customer, afterData: updated });
    res.json({ customer: updated, sync });
  })
);

businessModulesRouter.patch(
  "/:moduleKey",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const parsedKey = moduleKey.safeParse(req.params.moduleKey);
    const parsedBody = z.object({
      customerId: z.string().min(1),
      enabled: z.boolean(),
      reason: z.string().trim().min(3).max(500).optional(),
    }).safeParse(req.body);
    if (!parsedKey.success || !parsedBody.success) {
      throw Errors.validation({ moduleKey: parsedKey.success ? undefined : parsedKey.error.flatten(), body: parsedBody.success ? undefined : parsedBody.error.flatten() });
    }
    if (!parsedBody.data.enabled && !parsedBody.data.reason) {
      throw Errors.validation({ reason: ["Cần nhập lý do khi tắt module."] });
    }
    const before = (await businessModulesRepo.list(parsedBody.data.customerId)).find((item) => item.module_key === parsedKey.data);
    if (!before) throw Errors.notFound("module nghiệp vụ");
    const updated = await businessModulesRepo.setEnabled({
      customerId: parsedBody.data.customerId,
      moduleKey: parsedKey.data,
      enabled: parsedBody.data.enabled,
      reason: parsedBody.data.reason,
      actorId: req.user!.id,
    });
    if (!updated) throw Errors.conflict("Module này không được phép tắt hoàn toàn.");
    const sync = await syncCustomer(parsedBody.data.customerId);
    const current = (await businessModulesRepo.list(parsedBody.data.customerId)).find((item) => item.module_key === parsedKey.data);
    await writeAuditLog({
      req,
      action: parsedBody.data.enabled ? "ENABLE_BUSINESS_MODULE" : "DISABLE_BUSINESS_MODULE",
      entityType: "customer_business_module",
      entityId: `${parsedBody.data.customerId}:${parsedKey.data}`,
      beforeData: before,
      afterData: current,
    });
    res.json({ item: current, sync });
  })
);

businessModulesRouter.post(
  "/sync",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = z.object({ customerId: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const sync = await syncCustomer(parsed.data.customerId);
    const items = await businessModulesRepo.list(parsed.data.customerId);
    await writeAuditLog({ req, action: "SYNC_BUSINESS_MODULES", entityType: "customer_business_modules", entityId: parsed.data.customerId, afterData: { sync } });
    res.json({ items, sync });
  })
);
