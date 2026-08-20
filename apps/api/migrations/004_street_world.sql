CREATE TABLE IF NOT EXISTS player_street_state (
  player_id uuid PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  current_segment_id text NOT NULL DEFAULT 'market_block_3'
    CHECK (current_segment_id IN ('market_block_3', 'cypress_corner', 'mira_alley')),
  visited_segment_ids text[] NOT NULL DEFAULT ARRAY['market_block_3']::text[],
  flags jsonb NOT NULL DEFAULT '{"cornerStoreAlerted": false, "alleyTipKnown": false}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO player_street_state (player_id)
SELECT id FROM players
ON CONFLICT (player_id) DO NOTHING;

UPDATE player_state
SET street_segment = 'Market Street / Block 3', updated_at = now()
WHERE NOT EXISTS (
  SELECT 1 FROM world_action_log
  WHERE world_action_log.player_id = player_state.player_id
    AND world_action_log.action_id LIKE 'travel_%'
);

CREATE INDEX IF NOT EXISTS player_street_state_segment
  ON player_street_state(current_segment_id);
