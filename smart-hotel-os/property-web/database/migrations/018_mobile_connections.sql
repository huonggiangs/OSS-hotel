CREATE TABLE IF NOT EXISTS mobile_connections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES property_users(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  username TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ANDROID', 'IOS')),
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  app_version TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED')),
  pairing_code CHAR(6) NOT NULL,
  request_secret_hash TEXT NOT NULL,
  approved_by_hq_user_id TEXT,
  approval_note TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_mobile_connections_status_requested
  ON mobile_connections(status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_mobile_connections_property
  ON mobile_connections(property_id, status);
CREATE INDEX IF NOT EXISTS idx_mobile_connections_device
  ON mobile_connections(device_id);
