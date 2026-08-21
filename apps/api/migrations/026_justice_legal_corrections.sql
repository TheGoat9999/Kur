CREATE TABLE IF NOT EXISTS justice_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  source_encounter_id uuid UNIQUE REFERENCES police_encounters(id) ON DELETE SET NULL,
  police_report_id uuid REFERENCES police_reports(id) ON DELETE SET NULL,
  defendant_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  defendant_name text NOT NULL,
  status text NOT NULL DEFAULT 'arrested' CHECK (status IN ('arrested','booked','pretrial','court_pending','sentenced','dismissed','closed')),
  custody_status text NOT NULL DEFAULT 'in_custody' CHECK (custody_status IN ('in_custody','released_bail','released','jailed','probation')),
  bail_status text NOT NULL DEFAULT 'pending' CHECK (bail_status IN ('pending','offered','posted','denied','not_applicable')),
  bail_amount_cents integer NOT NULL DEFAULT 0 CHECK (bail_amount_cents >= 0),
  prosecution_decision text NOT NULL DEFAULT 'pending' CHECK (prosecution_decision IN ('pending','filed','declined')),
  court_outcome text NOT NULL DEFAULT 'pending' CHECK (court_outcome IN ('pending','guilty','plea','not_guilty','dismissed')),
  fine_balance_cents integer NOT NULL DEFAULT 0 CHECK (fine_balance_cents >= 0),
  jail_release_at timestamptz,
  probation_until timestamptz,
  booked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS justice_cases_status_idx ON justice_cases(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS justice_cases_defendant_idx ON justice_cases(defendant_player_id, defendant_name, updated_at DESC);

CREATE TABLE IF NOT EXISTS justice_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES justice_cases(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('infraction','misdemeanor','felony')),
  count integer NOT NULL DEFAULT 1 CHECK (count BETWEEN 1 AND 5),
  base_fine_cents integer NOT NULL DEFAULT 0 CHECK (base_fine_cents >= 0),
  base_jail_minutes integer NOT NULL DEFAULT 0 CHECK (base_jail_minutes >= 0),
  base_bail_cents integer NOT NULL DEFAULT 0 CHECK (base_bail_cents >= 0),
  evidence_strength smallint NOT NULL DEFAULT 50 CHECK (evidence_strength BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'recommended' CHECK (status IN ('recommended','filed','dropped','convicted','acquitted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, code)
);
CREATE INDEX IF NOT EXISTS justice_charges_case_idx ON justice_charges(case_id, created_at ASC);

CREATE TABLE IF NOT EXISTS justice_case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES justice_cases(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  actor_kind text NOT NULL DEFAULT 'system' CHECK (actor_kind IN ('officer','npc_magistrate','npc_prosecutor','npc_court','corrections','system')),
  note text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS justice_case_events_case_idx ON justice_case_events(case_id, created_at ASC);

CREATE TABLE IF NOT EXISTS justice_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  case_id uuid NOT NULL UNIQUE REFERENCES justice_cases(id) ON DELETE RESTRICT,
  defendant_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  defendant_name text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('guilty','plea','not_guilty','dismissed')),
  convictions jsonb NOT NULL DEFAULT '[]'::jsonb,
  fine_cents integer NOT NULL DEFAULT 0 CHECK (fine_cents >= 0),
  jail_minutes integer NOT NULL DEFAULT 0 CHECK (jail_minutes >= 0),
  probation_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS justice_records_defendant_idx ON justice_records(defendant_player_id, defendant_name, created_at DESC);

CREATE TABLE IF NOT EXISTS justice_player_status (
  player_id uuid PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  outstanding_fines_cents integer NOT NULL DEFAULT 0 CHECK (outstanding_fines_cents >= 0),
  jailed_until timestamptz,
  probation_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
