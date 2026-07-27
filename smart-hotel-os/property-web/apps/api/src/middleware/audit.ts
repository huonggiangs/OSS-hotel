import { Request } from "express";
import { auditLogRepo } from "../repositories/auditLog.repo";

export async function writeAuditLog(params: {
  req: Request;
  action: string;
  entityType: string;
  entityId?: string;
  beforeData?: unknown;
  afterData?: unknown;
}) {
  await auditLogRepo.create({
    propertyId: params.req.user?.propertyId,
    tenantId: params.req.user?.tenantId,
    userId: params.req.user?.id,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    beforeData: params.beforeData,
    afterData: params.afterData,
    ipAddress: params.req.ip,
  });
}
