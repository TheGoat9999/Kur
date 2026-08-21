CREATE TABLE IF NOT EXISTS real_estate_properties (
  id uuid PRIMARY KEY,
  property_key text UNIQUE NOT NULL,
  name_bg text NOT NULL,
  name_en text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('apartment','house','garage','commercial','warehouse','industrial')),
  district text NOT NULL,
  street_segment text NOT NULL,
  price_cents bigint NOT NULL CHECK (price_cents >= 0),
  listed boolean NOT NULL DEFAULT true,
  bedrooms integer NOT NULL DEFAULT 0 CHECK (bedrooms >= 0),
  parking_spaces integer NOT NULL DEFAULT 0 CHECK (parking_spaces >= 0),
  storage_slots integer NOT NULL DEFAULT 0 CHECK (storage_slots >= 0),
  agent_name text NOT NULL,
  description_bg text NOT NULL,
  description_en text NOT NULL
);

INSERT INTO real_estate_properties (id,property_key,name_bg,name_en,kind,district,street_segment,price_cents,listed,bedrooms,parking_spaces,storage_slots,agent_name,description_bg,description_en) VALUES
('10000000-0000-4000-8000-000000000001','cypress_1847','1847 Cypress Avenue','1847 Cypress Avenue','house','Southside','Cypress Avenue / Block 4',18500000,true,3,2,80,'Marcus Reed','Самостоятелна къща с гараж за два автомобила.','Detached house with a two-car garage.'),
('10000000-0000-4000-8000-000000000002','alta_304','Alta Vista #304','Alta Vista #304','apartment','Downtown','Alta Street / Tower A',24500000,true,2,1,40,'Sarah Miller','Централен апартамент с едно паркомясто.','Downtown apartment with one parking space.'),
('10000000-0000-4000-8000-000000000003','vine_8','Vine Street Unit 8','Vine Street Unit 8','commercial','Downtown','Vine Street / Block 8',19000000,true,0,0,40,'Sarah Miller','Търговски обект. Собствеността върху имота не дава автоматично собственост върху бизнес.','Commercial unit. Property ownership does not automatically grant business ownership.'),
('10000000-0000-4000-8000-000000000004','harbor_14','Harbor Warehouse 14','Harbor Warehouse 14','warehouse','Harbor','Dock Road / Warehouse Row',48000000,true,0,2,180,'Marcus Reed','Голям склад с товарен достъп.','Large warehouse with loading access.'),
('10000000-0000-4000-8000-000000000005','garage_c7','Harbor Garage C7','Harbor Garage C7','garage','Harbor','Dock Road / Garage Row',4800000,true,0,4,40,'Marcus Reed','Самостоятелен гараж за четири автомобила.','Standalone four-vehicle garage.')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS player_properties (
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES real_estate_properties(id),
  is_primary_residence boolean NOT NULL DEFAULT false,
  locked boolean NOT NULL DEFAULT true,
  storage_used integer NOT NULL DEFAULT 0 CHECK (storage_used >= 0),
  tenant_name text,
  monthly_rent_cents bigint NOT NULL DEFAULT 0 CHECK (monthly_rent_cents >= 0),
  purchased_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, property_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_primary_residence_per_player ON player_properties(player_id) WHERE is_primary_residence = true;

CREATE TABLE IF NOT EXISTS property_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES real_estate_properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('resident','guest','employee','manager','co_owner')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS property_viewings (
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES real_estate_properties(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, property_id)
);

CREATE TABLE IF NOT EXISTS real_estate_careers (
  player_id uuid PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  license_stage smallint NOT NULL DEFAULT 0 CHECK (license_stage BETWEEN 0 AND 2),
  employed boolean NOT NULL DEFAULT false,
  reputation smallint NOT NULL DEFAULT 50 CHECK (reputation BETWEEN 0 AND 100),
  commission_earned_cents bigint NOT NULL DEFAULT 0 CHECK (commission_earned_cents >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS real_estate_client_progress (
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  client_key text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','active','closed')),
  PRIMARY KEY (player_id, client_key)
);

CREATE TABLE IF NOT EXISTS real_estate_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  kind text NOT NULL,
  summary_bg text NOT NULL,
  summary_en text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS real_estate_activity_player_time ON real_estate_activity(player_id, created_at DESC);
