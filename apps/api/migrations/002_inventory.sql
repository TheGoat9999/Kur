CREATE TABLE IF NOT EXISTS inventory_containers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  container_key text NOT NULL CHECK (container_key IN ('player', 'ground', 'home', 'vehicle_trunk')),
  label text NOT NULL,
  capacity_grams integer NOT NULL CHECK (capacity_grams > 0),
  slot_count smallint NOT NULL CHECK (slot_count BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, container_key)
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  container_id uuid NOT NULL REFERENCES inventory_containers(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  display_name text NOT NULL,
  category text NOT NULL,
  symbol text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_weight_grams integer NOT NULL CHECK (unit_weight_grams >= 0),
  stackable boolean NOT NULL DEFAULT false,
  slot_index smallint NOT NULL CHECK (slot_index >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_slot_unique UNIQUE (container_id, slot_index) DEFERRABLE INITIALLY IMMEDIATE
);

CREATE INDEX IF NOT EXISTS inventory_items_player ON inventory_items(player_id);
CREATE INDEX IF NOT EXISTS inventory_items_container ON inventory_items(container_id, slot_index);
