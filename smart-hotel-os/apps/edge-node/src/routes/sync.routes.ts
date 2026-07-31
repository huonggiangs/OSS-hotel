import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { outboxRepo } from "../repositories/outbox.repo";
import { checkCloudReachable, getLastSyncAt, getLastSyncSummary, runSyncCycle } from "../lib/sync";

export const syncRouter = Router();
syncRouter.use(requireAuth);

syncRouter.get(
  "/status",
  asyncHandler(async (_req, res) => {
    const [counts, recent, cloudReachable] = await Promise.all([
      outboxRepo.countByStatus(),
      outboxRepo.listRecent(20),
      checkCloudReachable(),
    ]);
    res.json({
      cloud_reachable: cloudReachable,
      last_sync_at: getLastSyncAt()?.toISOString() ?? null,
      last_sync_summary: getLastSyncSummary(),
      outbox_counts: counts,
      recent_events: recent,
    });
  })
);

// POST /trigger — buộc chạy ngay 1 chu kỳ đồng bộ (mirror pattern
// "POST /sync-connection-status" thủ công của webadmin) — hữu ích khi nhân
// viên vừa có mạng lại và muốn đồng bộ ngay, không đợi chu kỳ nền tiếp theo.
syncRouter.post(
  "/trigger",
  asyncHandler(async (_req, res) => {
    const summary = await runSyncCycle();
    res.json({ triggered: true, summary });
  })
);
