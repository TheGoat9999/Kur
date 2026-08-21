CREATE TABLE IF NOT EXISTS player_needs_runtime (
  player_id uuid PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  consciousness text NOT NULL DEFAULT 'conscious' CHECK (consciousness IN ('conscious','unconscious')),
  care_state text NOT NULL DEFAULT 'field' CHECK (care_state IN ('field','transporting','admitted')),
  pain smallint NOT NULL DEFAULT 0 CHECK (pain BETWEEN 0 AND 100),
  admitted_until timestamptz,
  last_simulated_at timestamptz NOT NULL DEFAULT now(),
  last_rest_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS player_injuries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('cut','blunt','fracture','burn','other')),
  body_area text NOT NULL DEFAULT 'general' CHECK (body_area IN ('head','torso','left_arm','right_arm','left_leg','right_leg','general')),
  severity smallint NOT NULL CHECK (severity BETWEEN 1 AND 3),
  bleeding smallint NOT NULL DEFAULT 0 CHECK (bleeding BETWEEN 0 AND 3),
  treated boolean NOT NULL DEFAULT false,
  recovery_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS player_injuries_active_idx ON player_injuries(player_id, recovery_until, created_at DESC);

INSERT INTO player_needs_runtime (player_id)
SELECT id FROM players
ON CONFLICT (player_id) DO NOTHING;
