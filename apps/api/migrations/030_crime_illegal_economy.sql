CREATE TABLE IF NOT EXISTS crime_profiles (
  player_id uuid PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  underworld_trust smallint NOT NULL DEFAULT 0 CHECK (underworld_trust BETWEEN 0 AND 100),
  dirty_cash_cents bigint NOT NULL DEFAULT 0 CHECK (dirty_cash_cents >= 0),
  recognition smallint NOT NULL DEFAULT 0 CHECK (recognition BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crime_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  opportunity_id text NOT NULL,
  crime_type text NOT NULL CHECK (crime_type IN ('theft','shoplifting','burglary','vehicle_theft')),
  segment_id text NOT NULL REFERENCES world_street_segments(id),
  status text NOT NULL CHECK (status IN ('completed','failed')),
  recognition smallint NOT NULL DEFAULT 0 CHECK (recognition BETWEEN 0 AND 100),
  police_notified boolean NOT NULL DEFAULT false,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crime_incidents_player_time ON crime_incidents(player_id, created_at DESC);

CREATE TABLE IF NOT EXISTS crime_witnesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES crime_incidents(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  witness_npc_id text,
  recognition_confidence smallint NOT NULL CHECK (recognition_confidence BETWEEN 0 AND 100),
  reported boolean NOT NULL DEFAULT false,
  descriptor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crime_witnesses_incident ON crime_witnesses(incident_id, created_at);

CREATE TABLE IF NOT EXISTS crime_traces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES crime_incidents(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  trace_type text NOT NULL CHECK (trace_type IN ('fingerprint','camera','tool_mark','dropped_item','vehicle_description')),
  strength smallint NOT NULL CHECK (strength BETWEEN 0 AND 100),
  discovered_by_police boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crime_traces_incident ON crime_traces(incident_id, created_at);

CREATE TABLE IF NOT EXISTS crime_contacts (
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  contact_id text NOT NULL,
  trust smallint NOT NULL DEFAULT 0 CHECK (trust BETWEEN -100 AND 100),
  discovered boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, contact_id)
);

CREATE TABLE IF NOT EXISTS crime_vehicle_links (
  vehicle_id uuid PRIMARY KEY REFERENCES player_vehicles(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  incident_id uuid NOT NULL REFERENCES crime_incidents(id) ON DELETE CASCADE,
  estimated_value_cents bigint NOT NULL CHECK (estimated_value_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE player_vehicles
  ADD COLUMN IF NOT EXISTS legal_status text NOT NULL DEFAULT 'owned';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'player_vehicles_legal_status_check') THEN
    ALTER TABLE player_vehicles ADD CONSTRAINT player_vehicles_legal_status_check CHECK (legal_status IN ('owned','stolen'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS crime_command_log (
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  command text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, request_id)
);
