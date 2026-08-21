CREATE TABLE IF NOT EXISTS police_profiles (
  player_id uuid PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  career_status text NOT NULL DEFAULT 'applicant' CHECK (career_status IN ('applicant','cadet','officer')),
  academy_stage smallint NOT NULL DEFAULT 0 CHECK (academy_stage BETWEEN 0 AND 2),
  badge_number text UNIQUE,
  rank_code text NOT NULL DEFAULT 'recruit',
  callsign text,
  on_duty boolean NOT NULL DEFAULT false,
  complaints integer NOT NULL DEFAULT 0 CHECK (complaints >= 0),
  citations integer NOT NULL DEFAULT 0 CHECK (citations >= 0),
  arrests integer NOT NULL DEFAULT 0 CHECK (arrests >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS police_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  callsign text NOT NULL UNIQUE,
  player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  unit_type text NOT NULL DEFAULT 'patrol',
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','patrol','assigned','responding','on_scene','pursuit','search','unavailable')),
  district text NOT NULL DEFAULT 'Las Palmas West',
  street_segment text,
  is_npc boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS police_units_status_idx ON police_units(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS police_dispatch_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_code text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority smallint NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','on_scene','cleared')),
  settlement text NOT NULL DEFAULT 'Sol Dorado City',
  zone text NOT NULL DEFAULT 'Las Palmas',
  district text NOT NULL,
  street_segment text NOT NULL,
  source_kind text NOT NULL DEFAULT 'system' CHECK (source_kind IN ('system','alarm','caller','officer','camera')),
  knowledge jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  cleared_at timestamptz
);
CREATE INDEX IF NOT EXISTS police_dispatch_active_idx ON police_dispatch_calls(status, priority, created_at DESC);

CREATE TABLE IF NOT EXISTS police_dispatch_assignments (
  call_id uuid NOT NULL REFERENCES police_dispatch_calls(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES police_units(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  arrived_at timestamptz,
  PRIMARY KEY (call_id, unit_id)
);

CREATE TABLE IF NOT EXISTS police_intel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid REFERENCES police_dispatch_calls(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('alarm','caller','witness','camera','officer','evidence','records')),
  label text NOT NULL,
  summary text NOT NULL,
  reliability smallint NOT NULL CHECK (reliability BETWEEN 0 AND 100),
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES players(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS police_intel_call_idx ON police_intel(call_id, created_at DESC);

CREATE TABLE IF NOT EXISTS police_encounters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  encounter_type text NOT NULL CHECK (encounter_type IN ('traffic','pedestrian','scene')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','released','arrested')),
  subject_name text,
  subject_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES player_vehicles(id) ON DELETE SET NULL,
  legal_ground text NOT NULL DEFAULT 'none' CHECK (legal_ground IN ('none','reasonable_suspicion','traffic_violation','probable_cause','warrant')),
  detained boolean NOT NULL DEFAULT false,
  searched boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
CREATE INDEX IF NOT EXISTS police_encounter_officer_idx ON police_encounters(officer_player_id, started_at DESC);

CREATE TABLE IF NOT EXISTS police_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_player_id uuid NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  report_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  report_type text NOT NULL DEFAULT 'incident',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','finalized','closed')),
  narrative text NOT NULL DEFAULT '',
  involved_people jsonb NOT NULL DEFAULT '[]'::jsonb,
  charges jsonb NOT NULL DEFAULT '[]'::jsonb,
  linked_call_id uuid REFERENCES police_dispatch_calls(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS police_reports_recent_idx ON police_reports(updated_at DESC);

CREATE TABLE IF NOT EXISTS police_warrants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_name text NOT NULL,
  subject_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  reason text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','served','expired','cancelled')),
  issued_by uuid NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  report_id uuid REFERENCES police_reports(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS police_warrants_active_idx ON police_warrants(status, expires_at);

CREATE TABLE IF NOT EXISTS police_bolos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('person','vehicle')),
  target_label text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','resolved','cancelled')),
  created_by uuid NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS police_bolos_active_idx ON police_bolos(status, created_at DESC);

CREATE TABLE IF NOT EXISTS police_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  evidence_type text NOT NULL,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'collected' CHECK (status IN ('collected','locker','checked_out','released','destroyed')),
  location text NOT NULL DEFAULT 'Field collection',
  report_id uuid REFERENCES police_reports(id) ON DELETE SET NULL,
  collected_by uuid NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  current_custodian uuid REFERENCES players(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS police_evidence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id uuid NOT NULL REFERENCES police_evidence(id) ON DELETE CASCADE,
  actor_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('collected','transferred','stored','checked_out','released','destroyed')),
  from_custodian uuid REFERENCES players(id) ON DELETE SET NULL,
  to_custodian uuid REFERENCES players(id) ON DELETE SET NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS police_evidence_events_idx ON police_evidence_events(evidence_id, created_at ASC);

CREATE TABLE IF NOT EXISTS police_pursuits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid REFERENCES police_dispatch_calls(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','contained','lost','ended')),
  visual_contact boolean NOT NULL DEFAULT true,
  district text NOT NULL,
  street_segment text NOT NULL,
  direction text NOT NULL DEFAULT 'unknown',
  distance_index smallint NOT NULL DEFAULT 45 CHECK (distance_index BETWEEN 0 AND 100),
  risk smallint NOT NULL DEFAULT 15 CHECK (risk BETWEEN 0 AND 100),
  search_confidence smallint NOT NULL DEFAULT 100 CHECK (search_confidence BETWEEN 0 AND 100),
  last_known jsonb,
  last_seen_at timestamptz,
  round integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS police_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS police_audit_recent_idx ON police_audit_log(created_at DESC);

INSERT INTO police_units (callsign, unit_type, status, district, street_segment, is_npc)
VALUES
  ('21', 'patrol', 'available', 'Las Palmas West', 'market_block_3', true),
  ('12', 'traffic', 'patrol', 'Downtown', 'cypress_corner', true),
  ('7', 'patrol', 'available', 'Harbor', 'mira_alley', true)
ON CONFLICT (callsign) DO NOTHING;
