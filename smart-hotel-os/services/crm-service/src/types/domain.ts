export type CustomerSegmentType = "NEW_GUEST" | "RETURNING_GUEST" | "VIP" | "INACTIVE_30D" | "INACTIVE_90D";
export type CampaignTriggerType = "MANUAL" | "CHECKOUT_THANKYOU" | "INACTIVE_30D" | "BIRTHDAY" | "VIP_UPGRADE";
export type NotificationChannel = "SMS" | "EMAIL" | "ZALO";
export type CampaignSendStatus = "SUCCESS" | "FAILED" | "SKIPPED_OPT_OUT" | "SKIPPED_FREQUENCY_CAP";

export interface Customer {
  id: string;
  tenant_id: string;
  property_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  birthday: string | null;
  total_stays: number;
  total_spend: string;
  last_stay_check_out: string | null;
  opt_out: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerSegment {
  id: string;
  tenant_id: string;
  property_id: string;
  customer_id: string;
  segment: CustomerSegmentType;
  reason: string;
  computed_at: string;
}

export interface Campaign {
  id: string;
  tenant_id: string;
  property_id: string;
  name: string;
  trigger_type: CampaignTriggerType;
  target_segment: CustomerSegmentType | null;
  channel: NotificationChannel;
  template_content: string;
  frequency_cap_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CampaignSend {
  id: string;
  tenant_id: string;
  property_id: string;
  campaign_id: string;
  customer_id: string;
  channel: NotificationChannel;
  status: CampaignSendStatus;
  provider_response: unknown;
  sent_at: string | null;
  created_at: string;
}
