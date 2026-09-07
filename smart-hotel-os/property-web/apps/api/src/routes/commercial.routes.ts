import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { pool, type DbPool } from "../lib/db";
import { evaluatePilot, type PilotSample } from "../lib/pilotAcceptance";
import { requireAuth, type AuthUser } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";

export const commercialRouter = Router();
commercialRouter.use(requireAuth);
commercialRouter.use(requireRole("OWNER", "MANAGER"));
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v);
const contractSchema = z.object({ model: z.enum(["RENT_HAAS", "BUY"]).default("RENT_HAAS"), monthlyFeeVnd: z.number().finite().min(0).max(1e10), installationCostVnd: z.number().finite().min(0).max(1e11).default(0), replacementHours: z.number().int().min(1).max(720), returnTerms: z.string().trim().min(10).max(4000) }).strict();
const pilotSchema = z.object({ name: z.string().trim().min(3).max(200), roomIds: z.array(z.string().min(1)).min(1).max(100), baselineFrom: date, baselineTo: date, observationFrom: date, observationTo: date, tariffVnd: z.number().finite().positive().max(1e6) }).strict().refine(v => new Set(v.roomIds).size === v.roomIds.length && v.baselineFrom <= v.baselineTo && v.baselineTo < v.observationFrom && v.observationFrom <= v.observationTo && Date.parse(v.observationTo) - Date.parse(v.baselineFrom) <= 366 * 86400000, "Kiểm tra phòng trùng và khoảng thời gian (tối đa 366 ngày).");
const sampleSchema = z.object({ roomId: z.string().min(1), measuredDate: date, occupied: z.boolean(), kwh: z.number().finite().min(0).max(1e6), source: z.enum(["MANUAL", "METER", "SIMULATOR"]), evidence: z.string().trim().min(5).max(2000) }).strict();

async function audit(tx: DbPool, user: AuthUser, action: string, id: string, data: unknown) {
  await tx.query(`INSERT INTO audit_log (id,property_id,tenant_id,user_id,action,entity_type,entity_id,after_data)
    VALUES ($1,$2,$3,$4,$5,'commercial',$6,$7)`, [randomUUID(), user.propertyId, user.tenantId, user.id, action, id, JSON.stringify(data)]);
}

commercialRouter.get("/contract", asyncHandler(async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM commercial_contracts WHERE property_id=$1", [req.user!.propertyId]);
  res.json({ contract: rows[0] ?? null });
}));
commercialRouter.patch("/devices/:id/safety", requireRole("OWNER"), asyncHandler(async (req,res) => {
  const data=z.object({ criticalLoad:z.boolean(),controlEnabled:z.boolean(),reason:z.string().trim().min(10).max(1000) }).strict().parse(req.body);
  const device=await pool.transaction(async tx => {
    const before=await tx.query("SELECT * FROM devices WHERE property_id=$1 AND id=$2 FOR UPDATE",[req.user!.propertyId,req.params.id]);
    if(!before.rows.length) throw Errors.notFound("thiết bị");
    const updated=await tx.query("UPDATE devices SET critical_load=$3,control_enabled=$4,updated_at=now() WHERE property_id=$1 AND id=$2 RETURNING *",[req.user!.propertyId,req.params.id,data.criticalLoad,data.controlEnabled]);
    await audit(tx,req.user!,"DEVICE_SAFETY_UPDATED",req.params.id,{ before:before.rows[0],...data });
    return updated.rows[0];
  });
  res.json(device);
}));
commercialRouter.put("/contract", requireRole("OWNER"), asyncHandler(async (req, res) => {
  const data = contractSchema.parse(req.body), user = req.user!;
  const contract = await pool.transaction(async tx => {
    const { rows } = await tx.query(`INSERT INTO commercial_contracts
      (property_id,model,monthly_fee_vnd,installation_cost_vnd,replacement_hours,return_terms,approved_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (property_id) DO UPDATE SET
      model=EXCLUDED.model,monthly_fee_vnd=EXCLUDED.monthly_fee_vnd,installation_cost_vnd=EXCLUDED.installation_cost_vnd,
      replacement_hours=EXCLUDED.replacement_hours,return_terms=EXCLUDED.return_terms,approved_by=EXCLUDED.approved_by,updated_at=now() RETURNING *`,
      [user.propertyId,data.model,data.monthlyFeeVnd,data.installationCostVnd,data.replacementHours,data.returnTerms,user.id]);
    await audit(tx,user,"COMMERCIAL_CONTRACT_UPDATED",user.propertyId,data);
    return rows[0];
  });
  res.json({ contract });
}));
commercialRouter.get("/energy-pilots", asyncHandler(async (req,res) => {
  const page = z.coerce.number().int().min(0).max(10000).parse(req.query.page ?? 0);
  const { rows } = await pool.query("SELECT * FROM energy_pilots WHERE property_id=$1 ORDER BY created_at DESC,id LIMIT 50 OFFSET $2",[req.user!.propertyId,page*50]);
  res.json({ items: rows, page });
}));
commercialRouter.post("/energy-pilots", asyncHandler(async (req,res) => {
  const data=pilotSchema.parse(req.body),user=req.user!,id=randomUUID();
  await pool.transaction(async tx => {
    const rooms=await tx.query("SELECT id FROM rooms WHERE property_id=$1 AND id=ANY($2::text[]) FOR KEY SHARE",[user.propertyId,data.roomIds]);
    if(rooms.rows.length!==data.roomIds.length) throw Errors.validation({ rooms:"Phòng không thuộc cơ sở này." });
    await tx.query(`INSERT INTO energy_pilots (id,property_id,name,baseline_from,baseline_to,observation_from,observation_to,tariff_vnd,created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[id,user.propertyId,data.name,data.baselineFrom,data.baselineTo,data.observationFrom,data.observationTo,data.tariffVnd,user.id]);
    for(const roomId of data.roomIds) await tx.query("INSERT INTO energy_pilot_rooms (pilot_id,room_id) VALUES ($1,$2)",[id,roomId]);
    await audit(tx,user,"ENERGY_PILOT_CREATED",id,data);
  });
  res.status(201).json({ id });
}));
async function getPilot(tx: DbPool, id: string, propertyId: string) {
  const { rows }=await tx.query(`SELECT id,name,baseline_from::text,baseline_to::text,observation_from::text,observation_to::text,tariff_vnd
    FROM energy_pilots WHERE id=$1 AND property_id=$2`,[id,propertyId]);
  if(!rows[0]) throw Errors.notFound("đợt đo điện");
  return rows[0];
}
commercialRouter.post("/energy-pilots/:id/samples", asyncHandler(async (req,res) => {
  const data=sampleSchema.parse(req.body),user=req.user!;
  const result=await pool.transaction(async tx => {
    const pilot=await getPilot(tx,req.params.id,user.propertyId);
    const inPeriod=(data.measuredDate>=pilot.baseline_from && data.measuredDate<=pilot.baseline_to) || (data.measuredDate>=pilot.observation_from && data.measuredDate<=pilot.observation_to);
    if(!inPeriod || data.measuredDate>=new Date().toISOString().slice(0,10)) throw Errors.validation({ date:"Chỉ ghi ngày đo đã kết thúc trong đợt đo." });
    const room=await tx.query("SELECT room_id FROM energy_pilot_rooms WHERE pilot_id=$1 AND room_id=$2",[pilot.id,data.roomId]);
    if(!room.rows.length) throw Errors.notFound("phòng trong đợt đo");
    const inserted=await tx.query(`INSERT INTO energy_pilot_samples (id,pilot_id,room_id,measured_date,occupied,kwh,source,evidence,created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (pilot_id,room_id,measured_date) DO NOTHING RETURNING id`,
      [randomUUID(),pilot.id,data.roomId,data.measuredDate,data.occupied,data.kwh,data.source,data.evidence,user.id]);
    if(!inserted.rows.length) throw Errors.conflict("Phòng đã có số đo ngày này. Không ghi đè bằng chứng đo điện.");
    await audit(tx,user,"ENERGY_SAMPLE_CREATED",inserted.rows[0].id,data);
    return inserted.rows[0];
  });
  res.status(201).json(result);
}));
commercialRouter.get("/energy-pilots/:id/acceptance", asyncHandler(async (req,res) => {
  const pilot=await getPilot(pool,req.params.id,req.user!.propertyId);
  const rooms=await pool.query<{room_id:string}>("SELECT room_id FROM energy_pilot_rooms WHERE pilot_id=$1 ORDER BY room_id",[pilot.id]);
  const samples=await pool.query<PilotSample>("SELECT room_id,measured_date::text,occupied,kwh,source FROM energy_pilot_samples WHERE pilot_id=$1 ORDER BY measured_date,room_id",[pilot.id]);
  res.json({ pilot, ...evaluatePilot(pilot,rooms.rows.map(r=>r.room_id),samples.rows), evidence_notice:"Nguồn công tơ do người nhập khai báo; cần đối chiếu thiết bị và ký nghiệm thu riêng." });
}));
