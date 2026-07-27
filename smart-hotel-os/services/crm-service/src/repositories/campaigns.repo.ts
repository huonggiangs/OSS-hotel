import { randomUUID } from "node:crypto";
import { pool } from "../lib/db";
import type { Campaign, CampaignSend, CampaignSendStatus, NotificationChannel } from "../types/domain";

export const campaignsRepo = {
  async list(propertyId?: string): Promise<Campaign[]> {
    if (propertyId) {
      const { rows } = await pool.query<Campaign>(`SELECT * FROM campaigns WHERE property_id = $1 ORDER BY created_at DESC`, [
        propertyId,
      ]);
      return rows;
    }
    const { rows } = await pool.query<Campaign>(`SELECT * FROM campaigns ORDER BY created_at DESC`);
    return rows;
  },

  async findById(id: string): Promise<Campaign | null> {
    const { rows } = await pool.query<Campaign>(`SELECT * FROM campaigns WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async create(input: {
    tenantId: string;
    propertyId: string;
    name: string;
    triggerType: string;
    targetSegment: string | null;
    channel: NotificationChannel;
    templateContent: string;
    frequencyCapDays: number;
  }): Promise<Campaign> {
    const { rows } = await pool.query<Campaign>(
      `INSERT INTO campaigns (id, tenant_id, property_id, name, trigger_type, target_segment, channel, template_content, frequency_cap_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        randomUUID(),
        input.tenantId,
        input.propertyId,
        input.name,
        input.triggerType,
        input.targetSegment,
        input.channel,
        input.templateContent,
        input.frequencyCapDays,
      ]
    );
    return rows[0];
  },
};

export const campaignSendsRepo = {
  /** Lần gửi gần nhất (kể cả SUCCESS/FAILED) cho 1 khách trong 1 campaign — dùng để áp frequency cap. */
  async findLastSendWithinDays(campaignId: string, customerId: string, days: number): Promise<CampaignSend | null> {
    const { rows } = await pool.query<CampaignSend>(
      `SELECT * FROM campaign_sends
       WHERE campaign_id = $1 AND customer_id = $2 AND status = 'SUCCESS' AND sent_at > now() - ($3 || ' days')::interval
       ORDER BY sent_at DESC LIMIT 1`,
      [campaignId, customerId, days]
    );
    return rows[0] ?? null;
  },

  async create(input: {
    tenantId: string;
    propertyId: string;
    campaignId: string;
    customerId: string;
    channel: NotificationChannel;
    status: CampaignSendStatus;
    providerResponse: unknown;
    sentAt: Date | null;
  }): Promise<CampaignSend> {
    const { rows } = await pool.query<CampaignSend>(
      `INSERT INTO campaign_sends (id, tenant_id, property_id, campaign_id, customer_id, channel, status, provider_response, sent_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        randomUUID(),
        input.tenantId,
        input.propertyId,
        input.campaignId,
        input.customerId,
        input.channel,
        input.status,
        JSON.stringify(input.providerResponse),
        input.sentAt ? input.sentAt.toISOString() : null,
      ]
    );
    return rows[0];
  },

  async listByCampaign(campaignId: string): Promise<CampaignSend[]> {
    const { rows } = await pool.query<CampaignSend>(`SELECT * FROM campaign_sends WHERE campaign_id = $1 ORDER BY created_at DESC`, [
      campaignId,
    ]);
    return rows;
  },
};
