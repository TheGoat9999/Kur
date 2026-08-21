CREATE TABLE IF NOT EXISTS vehicle_models (
  id text PRIMARY KEY,
  brand text NOT NULL,
  model text NOT NULL,
  display_name text NOT NULL,
  year smallint NOT NULL CHECK (year BETWEEN 1950 AND 2100),
  vehicle_class text NOT NULL CHECK (vehicle_class IN ('compact','sedan','suv','pickup','sports','utility')),
  reliability smallint NOT NULL CHECK (reliability BETWEEN 0 AND 100),
  performance smallint NOT NULL CHECK (performance BETWEEN 0 AND 100),
  comfort smallint NOT NULL CHECK (comfort BETWEEN 0 AND 100),
  economy smallint NOT NULL CHECK (economy BETWEEN 0 AND 100),
  cargo_kg integer NOT NULL CHECK (cargo_kg >= 0),
  tank_liters numeric(6,2) NOT NULL CHECK (tank_liters > 0)
);

CREATE TABLE IF NOT EXISTS dealership_vehicle_stock (
  stock_key text PRIMARY KEY,
  dealership_key text NOT NULL,
  model_id text NOT NULL REFERENCES vehicle_models(id),
  price_cents bigint NOT NULL CHECK (price_cents > 0),
  mileage_km integer NOT NULL CHECK (mileage_km >= 0),
  engine_condition numeric(5,2) NOT NULL CHECK (engine_condition BETWEEN 0 AND 100),
  body_condition numeric(5,2) NOT NULL CHECK (body_condition BETWEEN 0 AND 100),
  tire_condition numeric(5,2) NOT NULL CHECK (tire_condition BETWEEN 0 AND 100),
  available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dealership_vehicle_stock_available ON dealership_vehicle_stock(dealership_key, available);

CREATE TABLE IF NOT EXISTS player_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  model_id text NOT NULL REFERENCES vehicle_models(id),
  active boolean NOT NULL DEFAULT false,
  fuel_percent numeric(5,2) NOT NULL DEFAULT 72 CHECK (fuel_percent BETWEEN 0 AND 100),
  engine_condition numeric(5,2) NOT NULL DEFAULT 100 CHECK (engine_condition BETWEEN 0 AND 100),
  body_condition numeric(5,2) NOT NULL DEFAULT 100 CHECK (body_condition BETWEEN 0 AND 100),
  tire_condition numeric(5,2) NOT NULL DEFAULT 100 CHECK (tire_condition BETWEEN 0 AND 100),
  mileage_km integer NOT NULL DEFAULT 0 CHECK (mileage_km >= 0),
  parked_segment_id text NOT NULL REFERENCES world_street_segments(id),
  locked boolean NOT NULL DEFAULT false,
  occupied boolean NOT NULL DEFAULT false,
  parking_kind text NOT NULL DEFAULT 'street' CHECK (parking_kind IN ('dealership','street','home','parking')),
  purchased_from text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS player_vehicles_owner ON player_vehicles(player_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_vehicle_per_player ON player_vehicles(player_id) WHERE active = true;
CREATE UNIQUE INDEX IF NOT EXISTS one_occupied_vehicle_per_player ON player_vehicles(player_id) WHERE occupied = true;

INSERT INTO vehicle_models
  (id,brand,model,display_name,year,vehicle_class,reliability,performance,comfort,economy,cargo_kg,tank_liters)
VALUES
  ('bravura_compact_s','Bravura','Compact S','2012 Bravura Compact S',2012,'compact',91,50,61,89,310,46),
  ('aurelia_r7','Aurelia','R7','2014 Aurelia R7',2014,'sedan',72,78,82,63,390,58),
  ('mesa_trail_150','Mesa','Trail 150','2013 Mesa Trail 150',2013,'pickup',82,64,69,45,980,86),
  ('veloce_sprint','Veloce','Sprint','2016 Veloce Sprint',2016,'sports',66,91,74,49,220,61)
ON CONFLICT (id) DO UPDATE SET
  brand=EXCLUDED.brand,model=EXCLUDED.model,display_name=EXCLUDED.display_name,year=EXCLUDED.year,
  vehicle_class=EXCLUDED.vehicle_class,reliability=EXCLUDED.reliability,performance=EXCLUDED.performance,
  comfort=EXCLUDED.comfort,economy=EXCLUDED.economy,cargo_kg=EXCLUDED.cargo_kg,tank_liters=EXCLUDED.tank_liters;

INSERT INTO dealership_vehicle_stock
  (stock_key,dealership_key,model_id,price_cents,mileage_km,engine_condition,body_condition,tire_condition,available)
VALUES
  ('dm_bravura_01','dorado_motors','bravura_compact_s',360000,118600,92,88,84,true),
  ('dm_aurelia_01','dorado_motors','aurelia_r7',680000,142800,86,81,78,true),
  ('dm_mesa_01','dorado_motors','mesa_trail_150',940000,126400,90,83,87,true),
  ('dm_veloce_01','dorado_motors','veloce_sprint',1290000,88600,82,79,74,true)
ON CONFLICT (stock_key) DO NOTHING;

INSERT INTO world_parcels (id,segment_id,name,kind,player_ownable,service_key,geometry,sort_order)
VALUES (
  'dorado_motors_cypress',
  'cypress_corner',
  'Dorado Motors',
  'commercial',
  false,
  'vehicle_dealership',
  '{"center":{"x":82,"y":22},"polygon":[{"x":72,"y":12},{"x":93,"y":12},{"x":93,"y":31},{"x":72,"y":31}],"path":[]}',
  20
)
ON CONFLICT (id) DO UPDATE SET
  segment_id=EXCLUDED.segment_id,
  name=EXCLUDED.name,
  kind=EXCLUDED.kind,
  player_ownable=EXCLUDED.player_ownable,
  service_key=EXCLUDED.service_key,
  geometry=EXCLUDED.geometry,
  sort_order=EXCLUDED.sort_order;
