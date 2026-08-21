ALTER TABLE player_vehicles
  ADD COLUMN IF NOT EXISTS parked_position_x numeric(6,3) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS parked_position_y numeric(6,3) NOT NULL DEFAULT 58;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'player_vehicles_parked_position_x_check'
  ) THEN
    ALTER TABLE player_vehicles
      ADD CONSTRAINT player_vehicles_parked_position_x_check CHECK (parked_position_x BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'player_vehicles_parked_position_y_check'
  ) THEN
    ALTER TABLE player_vehicles
      ADD CONSTRAINT player_vehicles_parked_position_y_check CHECK (parked_position_y BETWEEN 0 AND 100);
  END IF;
END $$;

UPDATE player_vehicles
SET parked_position_x = CASE parked_segment_id
      WHEN 'market_block_3' THEN 25
      WHEN 'cypress_corner' THEN 24
      WHEN 'mira_alley' THEN 29
      ELSE parked_position_x
    END,
    parked_position_y = CASE parked_segment_id
      WHEN 'market_block_3' THEN 57
      WHEN 'cypress_corner' THEN 58
      WHEN 'mira_alley' THEN 61
      ELSE parked_position_y
    END
WHERE parked_position_x = 50 AND parked_position_y = 58;
