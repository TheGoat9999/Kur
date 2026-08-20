ALTER TABLE player_street_state
  ADD COLUMN IF NOT EXISTS position_x double precision NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS position_y double precision NOT NULL DEFAULT 57;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'player_street_state_position_x_check') THEN
    ALTER TABLE player_street_state ADD CONSTRAINT player_street_state_position_x_check CHECK (position_x >= 0 AND position_x <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'player_street_state_position_y_check') THEN
    ALTER TABLE player_street_state ADD CONSTRAINT player_street_state_position_y_check CHECK (position_y >= 0 AND position_y <= 100);
  END IF;
END $$;

UPDATE player_street_state
SET position_x = 50, position_y = 57
WHERE position_x IS NULL OR position_y IS NULL;
