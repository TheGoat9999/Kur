CREATE TABLE IF NOT EXISTS hood_walk_street_memory (
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  segment_id text NOT NULL REFERENCES world_street_segments(id) ON DELETE CASCADE,
  familiarity smallint NOT NULL DEFAULT 0 CHECK (familiarity BETWEEN 0 AND 100),
  completed_runs integer NOT NULL DEFAULT 0 CHECK (completed_runs >= 0),
  helpful_acts integer NOT NULL DEFAULT 0 CHECK (helpful_acts >= 0),
  recent_event_ids text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, segment_id)
);

CREATE TABLE IF NOT EXISTS hood_walk_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  segment_id text NOT NULL REFERENCES world_street_segments(id) ON DELETE CASCADE,
  seed integer NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','ended')),
  step smallint NOT NULL DEFAULT 0 CHECK (step BETWEEN 0 AND 5),
  momentum smallint NOT NULL DEFAULT 0 CHECK (momentum BETWEEN 0 AND 10),
  danger smallint NOT NULL DEFAULT 0 CHECK (danger BETWEEN 0 AND 10),
  clues smallint NOT NULL DEFAULT 0 CHECK (clues BETWEEN 0 AND 10),
  seen_event_ids text[] NOT NULL DEFAULT '{}',
  current_leads jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_encounter jsonb,
  last_outcome jsonb,
  summary jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_hood_walk_per_player ON hood_walk_runs(player_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS hood_walk_runs_player_time ON hood_walk_runs(player_id, started_at DESC);

CREATE TABLE IF NOT EXISTS hood_walk_command_log (
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  command text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, request_id)
);
