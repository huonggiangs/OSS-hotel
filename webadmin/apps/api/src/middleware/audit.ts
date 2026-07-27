import { Request } from "express";
import { auditLogsRepo } from "../repositories/auditLogs.repo";

export async function writeAuditLog(params: {
  req: Request;
  action: string;
  entityType: string;
  entityId?: string;
  beforeData?: unknown;
  afterData?: unknown;
}) {
  await auditLogsRepo.create({
    userId: params.req.user?.id,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    beforeData: params.beforeData,
    afterData: params.afterData,
    ipAddress: params.req.ip,
  });
}
