-- Need refs: N1, N2, N4, N5. Additive commercial controls; no physical acceptance implied.
ALTER TABLE devices ADD COLUMN critical_load BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE devices ADD COLUMN control_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE device_control_events ADD COLUMN expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 minutes');
ALTER TABLE device_control_events ADD COLUMN lease_until TIMESTAMPTZ;
CREATE INDEX device_events_pending_expiry_idx ON device_control_events (expires_at, created_at) WHERE delivery_status = 'QUEUED';

CREATE TABLE commercial_contracts (
  property_id TEXT PRIMARY KEY REFERENCES properties(id),
  model TEXT NOT NULL DEFAULT 'RENT_HAAS' CHECK (model IN ('RENT_HAAS','BUY')),
  monthly_fee_vnd NUMERIC(14,2) NOT NULL CHECK (monthly_fee_vnd >= 0),
  installation_cost_vnd NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (installation_cost_vnd >= 0),
  replacement_hours INTEGER NOT NULL CHECK (replacement_hours BETWEEN 1 AND 720),
  return_terms TEXT NOT NULL,
  approved_by TEXT NOT NULL REFERENCES property_users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE energy_pilots (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id),
  name TEXT NOT NULL,
  baseline_from DATE NOT NULL,
  baseline_to DATE NOT NULL,
  observation_from DATE NOT NULL,
  observation_to DATE NOT NULL,
  tariff_vnd NUMERIC(14,2) NOT NULL CHECK (tariff_vnd > 0),
  created_by TEXT NOT NULL REFERENCES property_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id,id),
  CHECK (baseline_to >= baseline_from AND observation_from > baseline_to AND observation_to >= observation_from)
);
CREATE TABLE energy_pilot_rooms (
  pilot_id TEXT NOT NULL REFERENCES energy_pilots(id),
  room_id TEXT NOT NULL REFERENCES rooms(id),
  PRIMARY KEY(pilot_id,room_id)
);
CREATE TABLE energy_pilot_samples (
  id TEXT PRIMARY KEY,
  pilot_id TEXT NOT NULL REFERENCES energy_pilots(id),
  room_id TEXT NOT NULL REFERENCES rooms(id),
  measured_date DATE NOT NULL,
  occupied BOOLEAN NOT NULL,
  kwh NUMERIC(14,4) NOT NULL CHECK (kwh >= 0),
  source TEXT NOT NULL CHECK (source IN ('MANUAL','METER','SIMULATOR')),
  evidence TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES property_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pilot_id,room_id,measured_date),
  FOREIGN KEY(pilot_id,room_id) REFERENCES energy_pilot_rooms(pilot_id,room_id)
);
CREATE INDEX pilot_property_date_idx ON energy_pilots(property_id,created_at DESC);
CREATE INDEX pilot_sample_date_idx ON energy_pilot_samples(pilot_id,measured_date);
