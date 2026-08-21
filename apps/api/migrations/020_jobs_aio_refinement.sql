ALTER TABLE job_profiles
  ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  ADD COLUMN IF NOT EXISTS best_streak integer NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
  ADD COLUMN IF NOT EXISTS total_earnings_cents bigint NOT NULL DEFAULT 0 CHECK (total_earnings_cents >= 0),
  ADD COLUMN IF NOT EXISTS excellent_shifts integer NOT NULL DEFAULT 0 CHECK (excellent_shifts >= 0),
  ADD COLUMN IF NOT EXISTS abandoned_shifts integer NOT NULL DEFAULT 0 CHECK (abandoned_shifts >= 0);

CREATE TABLE IF NOT EXISTS job_employer_progress (
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  employer_key text NOT NULL,
  reputation smallint NOT NULL DEFAULT 0 CHECK (reputation BETWEEN 0 AND 100),
  completed_shifts integer NOT NULL DEFAULT 0 CHECK (completed_shifts >= 0),
  total_earnings_cents bigint NOT NULL DEFAULT 0 CHECK (total_earnings_cents >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, employer_key)
);

INSERT INTO job_employer_progress(player_id, employer_key, reputation, completed_shifts)
SELECT player_id,
       CASE job_id
         WHEN 'warehouse' THEN 'quickdrop'
         WHEN 'delivery' THEN 'quickdrop'
         WHEN 'grounds' THEN 'municipal'
         WHEN 'sanitation' THEN 'waste'
         WHEN 'construction' THEN 'buildco'
         WHEN 'retail' THEN 'mercado'
         WHEN 'kitchen' THEN 'elsol'
         WHEN 'dock' THEN 'port'
         ELSE job_id
       END AS employer_key,
       MAX(employer_reputation)::smallint,
       SUM(completed_shifts)::integer
FROM job_progress
GROUP BY player_id,
         CASE job_id
           WHEN 'warehouse' THEN 'quickdrop'
           WHEN 'delivery' THEN 'quickdrop'
           WHEN 'grounds' THEN 'municipal'
           WHEN 'sanitation' THEN 'waste'
           WHEN 'construction' THEN 'buildco'
           WHEN 'retail' THEN 'mercado'
           WHEN 'kitchen' THEN 'elsol'
           WHEN 'dock' THEN 'port'
           ELSE job_id
         END
ON CONFLICT (player_id, employer_key) DO UPDATE
SET reputation = GREATEST(job_employer_progress.reputation, EXCLUDED.reputation),
    completed_shifts = GREATEST(job_employer_progress.completed_shifts, EXCLUDED.completed_shifts),
    updated_at = now();

ALTER TABLE job_shifts
  ADD COLUMN IF NOT EXISTS offer_id text,
  ADD COLUMN IF NOT EXISTS offer_title_bg text,
  ADD COLUMN IF NOT EXISTS offer_title_en text,
  ADD COLUMN IF NOT EXISTS base_pay_cents bigint NOT NULL DEFAULT 1800,
  ADD COLUMN IF NOT EXISTS task_bonus_cents bigint NOT NULL DEFAULT 250,
  ADD COLUMN IF NOT EXISTS min_tasks smallint NOT NULL DEFAULT 2 CHECK (min_tasks >= 1),
  ADD COLUMN IF NOT EXISTS intensity text NOT NULL DEFAULT 'moderate' CHECK (intensity IN ('light','moderate','heavy')),
  ADD COLUMN IF NOT EXISTS energy_spent integer NOT NULL DEFAULT 0 CHECK (energy_spent >= 0),
  ADD COLUMN IF NOT EXISTS stress_added integer NOT NULL DEFAULT 0 CHECK (stress_added >= 0);

ALTER TABLE job_history DROP CONSTRAINT IF EXISTS job_history_performance_check;
ALTER TABLE job_history ADD CONSTRAINT job_history_performance_check
  CHECK (performance IN ('completed','good','excellent','needs_improvement','abandoned'));

ALTER TABLE job_history
  ADD COLUMN IF NOT EXISTS offer_id text,
  ADD COLUMN IF NOT EXISTS offer_title_bg text,
  ADD COLUMN IF NOT EXISTS offer_title_en text,
  ADD COLUMN IF NOT EXISTS base_pay_cents bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS task_bonus_cents bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS event_bonus_cents bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS performance_bonus_cents bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trust_bonus_cents bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_score integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS job_employer_progress_player ON job_employer_progress(player_id, reputation DESC);
