CREATE SEQUENCE IF NOT EXISTS ems_call_number_seq START 1001;

CREATE TABLE IF NOT EXISTS ems_profiles (
  player_id uuid PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  rank text NOT NULL DEFAULT 'emt' CHECK (rank IN ('emt','paramedic','senior_paramedic','supervisor')),
  on_duty boolean NOT NULL DEFAULT false,
  calls_completed integer NOT NULL DEFAULT 0 CHECK (calls_completed >= 0),
  reputation integer NOT NULL DEFAULT 50 CHECK (reputation BETWEEN 0 AND 100),
  shift_earnings_cents bigint NOT NULL DEFAULT 0 CHECK (shift_earnings_cents >= 0),
  active_call_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ems_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_number bigint NOT NULL DEFAULT nextval('ems_call_number_seq') UNIQUE,
  reporter_player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  patient_player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  assigned_ems_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  priority text NOT NULL CHECK (priority IN ('p1','p2','p3','p4')),
  incident_type text NOT NULL CHECK (char_length(incident_type) BETWEEN 2 AND 80),
  summary text NOT NULL CHECK (char_length(summary) BETWEEN 2 AND 300),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','assigned','en_route','on_scene','transporting','closed','cancelled')),
  street_segment_id text NOT NULL,
  position_x double precision NOT NULL CHECK (position_x BETWEEN 0 AND 100),
  position_y double precision NOT NULL CHECK (position_y BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
CREATE INDEX IF NOT EXISTS ems_calls_dispatch_idx ON ems_calls(status, priority, created_at);
CREATE INDEX IF NOT EXISTS ems_calls_patient_idx ON ems_calls(patient_player_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ems_one_open_assignment_per_responder
  ON ems_calls(assigned_ems_player_id)
  WHERE assigned_ems_player_id IS NOT NULL AND status NOT IN ('closed','cancelled');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ems_profiles_active_call_fk') THEN
    ALTER TABLE ems_profiles
      ADD CONSTRAINT ems_profiles_active_call_fk FOREIGN KEY (active_call_id) REFERENCES ems_calls(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ems_assessments (
  call_id uuid PRIMARY KEY REFERENCES ems_calls(id) ON DELETE CASCADE,
  responder_player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  consciousness text NOT NULL CHECK (consciousness IN ('alert','confused','unresponsive')),
  breathing text NOT NULL CHECK (breathing IN ('normal','labored','absent')),
  bleeding text NOT NULL CHECK (bleeding IN ('none','minor','major')),
  pain smallint NOT NULL CHECK (pain BETWEEN 0 AND 10),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 500),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ems_treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES ems_calls(id) ON DELETE CASCADE,
  responder_player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  treatment text NOT NULL CHECK (treatment IN ('bandage','trauma_dressing','tourniquet','splint','oxygen','saline','cpr')),
  effect smallint NOT NULL CHECK (effect BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ems_treatments_call_idx ON ems_treatments(call_id, created_at);

CREATE TABLE IF NOT EXISTS ems_patient_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL UNIQUE REFERENCES ems_calls(id) ON DELETE CASCADE,
  patient_player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  responder_player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  outcome text NOT NULL CHECK (outcome IN ('treated_scene','transported','refused','deceased')),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 800),
  procedures jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ems_patient_records_patient_idx ON ems_patient_records(patient_player_id, created_at DESC);
