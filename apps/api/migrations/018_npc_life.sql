CREATE TABLE IF NOT EXISTS npc_relationships (
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  npc_id TEXT NOT NULL,
  familiarity INTEGER NOT NULL DEFAULT 0 CHECK (familiarity BETWEEN 0 AND 100),
  trust INTEGER NOT NULL DEFAULT 0 CHECK (trust BETWEEN -100 AND 100),
  respect INTEGER NOT NULL DEFAULT 0 CHECK (respect BETWEEN -100 AND 100),
  interaction_count INTEGER NOT NULL DEFAULT 0 CHECK (interaction_count >= 0),
  last_interaction_at TIMESTAMPTZ,
  last_topic TEXT,
  memory JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, npc_id)
);

CREATE TABLE IF NOT EXISTS npc_interaction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  npc_id TEXT NOT NULL,
  action TEXT NOT NULL,
  segment_id TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_npc_interaction_log_player_npc_created
  ON npc_interaction_log(player_id, npc_id, created_at DESC);
