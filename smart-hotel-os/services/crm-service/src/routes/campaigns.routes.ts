import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { Errors } from "../utils/errors";
import { campaignSendsRepo, campaignsRepo } from "../repositories/campaigns.repo";
import { customersRepo } from "../repositories/customers.repo";
import { getNotificationProvider } from "../providers";

export const campaignsRouter = Router();

const createSchema = z.object({
  tenantId: z.string().min(1),
  propertyId: z.string().min(1),
  name: z.string().min(1),
  triggerType: z.enum(["MANUAL", "CHECKOUT_THANKYOU", "INACTIVE_30D", "BIRTHDAY", "VIP_UPGRADE"]).default("MANUAL"),
  targetSegment: z.enum(["NEW_GUEST", "RETURNING_GUEST", "VIP", "INACTIVE_30D", "INACTIVE_90D"]).nullable().default(null),
  channel: z.enum(["SMS", "EMAIL", "ZALO"]),
  templateContent: z.string().min(1),
  frequencyCapDays: z.number().int().positive().default(30),
});

campaignsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await campaignsRepo.list(req.query.propertyId as string | undefined);
    res.json({ items, total: items.length });
  })
);

campaignsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.flatten());
    const campaign = await campaignsRepo.create(parsed.data);
    res.status(201).json(campaign);
  })
);

// POST /campaigns/:id/send — gửi campaign tới toàn bộ khách thuộc target_segment
// (hoặc toàn bộ khách active của property nếu targetSegment = null, dùng cho
// campaign MANUAL không giới hạn segment), tôn trọng opt_out và frequency cap.
campaignsRouter.post(
  "/:id/send",
  asyncHandler(async (req, res) => {
    const campaign = await campaignsRepo.findById(req.params.id);
    if (!campaign) throw Errors.notFound("campaign");
    if (!campaign.is_active) throw Errors.validation({ campaign: "Campaign đang tắt (is_active=false), không thể gửi." });

    const targets = campaign.target_segment
      ? await customersRepo.listBySegment(campaign.property_id, campaign.target_segment)
      : await customersRepo.listAllActive(campaign.property_id);

    const provider = getNotificationProvider();
    const results = [];

    for (const customer of targets) {
      // opt_out đã lọc ở query cho trường hợp có segment; lọc lại cho chắc với trường hợp không segment.
      if (customer.opt_out) {
        const send = await campaignSendsRepo.create({
          tenantId: campaign.tenant_id,
          propertyId: campaign.property_id,
          campaignId: campaign.id,
          customerId: customer.id,
          channel: campaign.channel,
          status: "SKIPPED_OPT_OUT",
          providerResponse: null,
          sentAt: null,
        });
        results.push(send);
        continue;
      }

      const lastSend = await campaignSendsRepo.findLastSendWithinDays(campaign.id, customer.id, campaign.frequency_cap_days);
      if (lastSend) {
        const send = await campaignSendsRepo.create({
          tenantId: campaign.tenant_id,
          propertyId: campaign.property_id,
          campaignId: campaign.id,
          customerId: customer.id,
          channel: campaign.channel,
          status: "SKIPPED_FREQUENCY_CAP",
          providerResponse: { lastSendId: lastSend.id },
          sentAt: null,
        });
        results.push(send);
        continue;
      }

      const to = campaign.channel === "EMAIL" ? customer.email : customer.phone;
      if (!to) {
        const send = await campaignSendsRepo.create({
          tenantId: campaign.tenant_id,
          propertyId: campaign.property_id,
          campaignId: campaign.id,
          customerId: customer.id,
          channel: campaign.channel,
          status: "FAILED",
          providerResponse: { errorMessage: `Khách thiếu thông tin liên hệ cho kênh ${campaign.channel}` },
          sentAt: null,
        });
        results.push(send);
        continue;
      }

      const content = campaign.template_content.replace("{{full_name}}", customer.full_name);
      const sendResult = await provider.send({ channel: campaign.channel, to, content });
      const send = await campaignSendsRepo.create({
        tenantId: campaign.tenant_id,
        propertyId: campaign.property_id,
        campaignId: campaign.id,
        customerId: customer.id,
        channel: campaign.channel,
        status: sendResult.success ? "SUCCESS" : "FAILED",
        providerResponse: sendResult.raw,
        sentAt: sendResult.success ? new Date() : null,
      });
      results.push(send);
    }

    const summary = results.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});

    res.status(200).json({ campaignId: campaign.id, totalTargets: targets.length, summary, sends: results });
  })
);

campaignsRouter.get(
  "/:id/sends",
  asyncHandler(async (req, res) => {
    const items = await campaignSendsRepo.listByCampaign(req.params.id);
    res.json({ items, total: items.length });
  })
);
