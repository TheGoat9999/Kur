CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  recipe jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_character_per_player ON characters(player_id) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS player_state (
  player_id uuid PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
  health smallint NOT NULL DEFAULT 100 CHECK (health BETWEEN 0 AND 100),
  energy smallint NOT NULL DEFAULT 82 CHECK (energy BETWEEN 0 AND 100),
  satiety smallint NOT NULL DEFAULT 71 CHECK (satiety BETWEEN 0 AND 100),
  hydration smallint NOT NULL DEFAULT 77 CHECK (hydration BETWEEN 0 AND 100),
  stress smallint NOT NULL DEFAULT 14 CHECK (stress BETWEEN 0 AND 100),
  police_heat smallint NOT NULL DEFAULT 0 CHECK (police_heat BETWEEN 0 AND 100),
  cash_cents bigint NOT NULL DEFAULT 420000 CHECK (cash_cents >= 0),
  settlement text NOT NULL DEFAULT 'Sol Dorado City',
  zone text NOT NULL DEFAULT 'Las Palmas',
  district text NOT NULL DEFAULT 'Las Palmas West',
  street_segment text NOT NULL DEFAULT 'Vespucci Blvd / Block 2',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS world_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  action_id text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, request_id)
);
CREATE INDEX IF NOT EXISTS world_action_log_player_time ON world_action_log(player_id, created_at DESC);
