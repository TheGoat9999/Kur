CREATE TABLE IF NOT EXISTS job_profiles (
  player_id uuid PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  career_xp integer NOT NULL DEFAULT 0 CHECK (career_xp >= 0),
  reliability smallint NOT NULL DEFAULT 50 CHECK (reliability BETWEEN 0 AND 100),
  completed_shifts integer NOT NULL DEFAULT 0 CHECK (completed_shifts >= 0),
  qualifications text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_skill_progress (
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  skill_key text NOT NULL,
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, skill_key)
);

CREATE TABLE IF NOT EXISTS job_progress (
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  job_id text NOT NULL,
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  employer_reputation smallint NOT NULL DEFAULT 0 CHECK (employer_reputation BETWEEN 0 AND 100),
  completed_shifts integer NOT NULL DEFAULT 0 CHECK (completed_shifts >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, job_id)
);

CREATE TABLE IF NOT EXISTS job_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  job_id text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','abandoned')),
  completed_task_ids text[] NOT NULL DEFAULT '{}',
  decisions jsonb NOT NULL DEFAULT '[]'::jsonb,
  seen_event_ids text[] NOT NULL DEFAULT '{}',
  current_event jsonb,
  bonus_cents bigint NOT NULL DEFAULT 0,
  good_count integer NOT NULL DEFAULT 0 CHECK (good_count >= 0),
  bad_count integer NOT NULL DEFAULT 0 CHECK (bad_count >= 0),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_job_shift_per_player ON job_shifts(player_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS job_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  job_id text NOT NULL,
  payout_cents bigint NOT NULL CHECK (payout_cents >= 0),
  performance text NOT NULL CHECK (performance IN ('completed','good','excellent','needs_improvement')),
  completed_tasks integer NOT NULL DEFAULT 0 CHECK (completed_tasks >= 0),
  decisions jsonb NOT NULL DEFAULT '[]'::jsonb,
  job_xp_earned integer NOT NULL DEFAULT 0,
  career_xp_earned integer NOT NULL DEFAULT 0,
  employer_rep_delta integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_history_player_time ON job_history(player_id, created_at DESC);
