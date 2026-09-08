import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { regenerateGoLiveProgressHtml } from "../lib/goLiveProgressHtml";
import { observeGoLiveMetric, recordGoLiveWebhook, renderGoLiveMetrics } from "../lib/goLiveMetrics";
import { requireAuth } from "../middleware/auth";
import { goLiveProgressRepo, type GoLiveProgressInput } from "../repositories/goLiveProgress.repo";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";

export const goLiveProgressRouter = Router();
const statusSchema = z.enum(["DONE", "IN_PROGRESS", "MISSING"]);
const createSchema = z.object({
  timestamp: z.string().datetime({ offset: true }),
  description: z.string().trim().min(3).max(500),
  relatedItems: z.array(z.string().trim().min(1).max(180)).min(1).max(100),
  status: statusSchema,
  evidence: z.string().trim().min(3).max(4000),
  performedBy: z.string().trim().min(2).max(100),
  notes: z.string().trim().max(4000).optional().nullable(),
  idempotencyKey: z.string().trim().min(8).max(200),
}).strict();

function safeEqual(actual: string | undefined, expected: string | undefined) {
  if (!actual || !expected) return false;
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
function progressSecret(req: Request) {
  return req.header("x-go-live-secret");
}
function requireProgressReader(req: Request, res: Response, next: NextFunction) {
  if (safeEqual(progressSecret(req), process.env.GO_LIVE_PROGRESS_SECRET)) return next();
  return requireAuth(req, res, next);
}
function requireProgressWriter(req: Request, res: Response, next: NextFunction) {
  if (safeEqual(progressSecret(req), process.env.GO_LIVE_PROGRESS_SECRET)) return next();
  return requireAuth(req, res, (error?: unknown) => {
    if (error) return next(error);
    if (!req.user || !["SUPER_ADMIN", "RELEASE_MANAGER"].includes(req.user.role)) return next(Errors.forbidden());
    next();
  });
}
async function persist(input: GoLiveProgressInput, req: Request) {
  const started = performance.now();
  const result = await goLiveProgressRepo.create(input, { userId: req.user?.id, ipAddress: req.ip });
  observeGoLiveMetric("db_write", performance.now() - started);
  const html = await regenerateGoLiveProgressHtml();
  return { ...result, html };
}

goLiveProgressRouter.get("/", requireProgressReader, asyncHandler(async (req,res) => {
  const parsed = z.object({
    from: z.string().datetime({ offset: true }).optional(), to: z.string().datetime({ offset: true }).optional(),
    status: statusSchema.optional(), performedBy: z.string().max(100).optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(50),
  }).safeParse(req.query);
  if(!parsed.success) throw Errors.validation(parsed.error.flatten());
  res.json(await goLiveProgressRepo.list(parsed.data));
}));
goLiveProgressRouter.get("/summary", requireProgressReader, asyncHandler(async (_req,res) => res.json({ items: await goLiveProgressRepo.summary() })));
goLiveProgressRouter.get("/metrics", requireProgressReader, (_req,res) => { res.type("text/plain; version=0.0.4").send(renderGoLiveMetrics()); });
goLiveProgressRouter.get("/html", requireProgressReader, asyncHandler(async (_req,res) => {
  const generated=await regenerateGoLiveProgressHtml();
  res.type("html").send(await readFile(generated.path,"utf8"));
}));
goLiveProgressRouter.post("/", requireProgressWriter, asyncHandler(async (req,res) => {
  const started=performance.now();
  const parsed=createSchema.safeParse(req.body);
  if(!parsed.success) throw Errors.validation(parsed.error.flatten());
  const data=parsed.data;
  const result=await persist({ completedAt:data.timestamp,sessionDescription:data.description,relatedItems:data.relatedItems,status:data.status,evidence:data.evidence,performedBy:data.performedBy,notes:data.notes,idempotencyKey:data.idempotencyKey },req);
  observeGoLiveMetric("api",performance.now()-started);
  res.status(result.replayed ? 200 : 201).json(result);
}));

function verifyGithub(req: Request) {
  const secret=process.env.CI_PROGRESS_WEBHOOK_SECRET;
  const signature=req.header("x-hub-signature-256");
  const raw=(req as Request & { rawBody?: Buffer }).rawBody;
  if(!secret || !signature || !raw) return false;
  const expected=`sha256=${createHmac("sha256",secret).update(raw).digest("hex")}`;
  return safeEqual(signature,expected);
}
goLiveProgressRouter.post("/webhook", asyncHandler(async (req,res) => {
  const valid=verifyGithub(req) || safeEqual(progressSecret(req),process.env.CI_PROGRESS_WEBHOOK_SECRET);
  if(!valid){ recordGoLiveWebhook(false); throw Errors.unauthorized(); }
  const delivery=req.header("x-github-delivery") || String(req.body?.id ?? "");
  if(!delivery){ recordGoLiveWebhook(false); throw Errors.validation({ idempotencyKey:"Thiếu X-GitHub-Delivery hoặc event id." }); }
  const event=req.header("x-github-event") || String(req.body?.event ?? "ci");
  const run=req.body?.workflow_run ?? req.body?.check_run ?? req.body;
  const conclusion=String(run?.conclusion ?? run?.status ?? "").toLowerCase();
  const status = conclusion === "success" || conclusion === "completed" ? "DONE" : ["queued","requested","in_progress","pending"].includes(conclusion) ? "IN_PROGRESS" : "MISSING";
  const repository=String(req.body?.repository?.full_name ?? "repository");
  const evidence=String(run?.html_url ?? req.body?.repository?.html_url ?? `GitHub event ${delivery}`);
  try {
    const result=await persist({ completedAt:new Date(run?.updated_at ?? run?.completed_at ?? Date.now()).toISOString(),sessionDescription:`CI ${event}: ${run?.name ?? run?.display_title ?? repository}`,relatedItems:["CI",repository],status,evidence,performedBy:"GitHub Actions",notes:conclusion || "Không có conclusion",idempotencyKey:`github:${delivery}` },req);
    recordGoLiveWebhook(true);
    res.status(result.replayed ? 200 : 201).json(result);
  } catch(error) { recordGoLiveWebhook(false); throw error; }
}));
