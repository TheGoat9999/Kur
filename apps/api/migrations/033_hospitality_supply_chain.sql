-- Hospitality production + supply-chain extension for canonical Businesses / Real Estate.
-- Property ownership remains independent from business operation; business stock locations
-- reference properties only as physical operating/storage locations.

ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_kind_check;
ALTER TABLE businesses ADD CONSTRAINT businesses_kind_check
  CHECK (kind IN ('convenience_store','restaurant','cafe','bar','bakery','mechanic_shop','dealership','logistics','nightclub'));

CREATE TABLE IF NOT EXISTS hospitality_profiles (
  business_id uuid PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  concept text NOT NULL CHECK (concept IN ('restaurant','cafe','bar','nightclub','bakery')),
  capacity integer NOT NULL DEFAULT 24 CHECK (capacity > 0),
  skill_level smallint NOT NULL DEFAULT 1 CHECK (skill_level BETWEEN 0 AND 10),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_stock_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES real_estate_properties(id) ON DELETE RESTRICT,
  label text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('premises','warehouse')),
  capacity_units integer NOT NULL CHECK (capacity_units > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, property_id)
);
CREATE INDEX IF NOT EXISTS business_stock_locations_business ON business_stock_locations(business_id, kind);

CREATE TABLE IF NOT EXISTS hospitality_production_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  recipe_key text NOT NULL,
  batches integer NOT NULL CHECK (batches > 0),
  status text NOT NULL DEFAULT 'preparing' CHECK (status IN ('queued','preparing','ready','cancelled')),
  input_quality smallint NOT NULL CHECK (input_quality BETWEEN 0 AND 100),
  freshness smallint NOT NULL CHECK (freshness BETWEEN 0 AND 100),
  skill_level smallint NOT NULL CHECK (skill_level BETWEEN 0 AND 10),
  total_input_cost_cents bigint NOT NULL DEFAULT 0 CHECK (total_input_cost_cents >= 0),
  quality smallint CHECK (quality BETWEEN 0 AND 100),
  started_at timestamptz NOT NULL DEFAULT now(),
  ready_at timestamptz NOT NULL,
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS hospitality_batches_business_time ON hospitality_production_batches(business_id, started_at DESC);

CREATE TABLE IF NOT EXISTS supply_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES business_suppliers(id) ON DELETE RESTRICT,
  destination_property_id uuid REFERENCES real_estate_properties(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'placed' CHECK (status IN ('placed','dispatched','fulfilled','cancelled')),
  total_cents bigint NOT NULL CHECK (total_cents >= 0),
  ordered_at timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz,
  fulfilled_at timestamptz
);
CREATE INDEX IF NOT EXISTS supply_purchase_orders_business_status ON supply_purchase_orders(business_id, status, ordered_at DESC);

CREATE TABLE IF NOT EXISTS supply_purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES supply_purchase_orders(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost_cents bigint NOT NULL CHECK (unit_cost_cents >= 0),
  total_cents bigint NOT NULL CHECK (total_cents >= 0)
);
CREATE INDEX IF NOT EXISTS supply_purchase_order_lines_order ON supply_purchase_order_lines(purchase_order_id);

CREATE TABLE IF NOT EXISTS supply_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES business_suppliers(id) ON DELETE RESTRICT,
  purchase_order_id uuid NOT NULL UNIQUE REFERENCES supply_purchase_orders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_transit','delayed','delivered','cancelled')),
  origin_label text NOT NULL,
  destination_property_id uuid REFERENCES real_estate_properties(id) ON DELETE SET NULL,
  route_key text NOT NULL,
  vehicle_class text NOT NULL CHECK (vehicle_class IN ('van','box_truck','truck')),
  dispatched_at timestamptz,
  eta_at timestamptz,
  delivered_at timestamptz,
  delay_minutes integer NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0),
  delay_reason_bg text,
  delay_reason_en text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS supply_shipments_business_status ON supply_shipments(business_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS business_stock_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES business_stock_locations(id) ON DELETE SET NULL,
  item_key text NOT NULL,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  quality smallint NOT NULL DEFAULT 80 CHECK (quality BETWEEN 0 AND 100),
  received_at timestamptz NOT NULL DEFAULT now(),
  best_before_at timestamptz,
  source_kind text NOT NULL CHECK (source_kind IN ('seed','shipment','production')),
  source_shipment_id uuid REFERENCES supply_shipments(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS business_stock_lots_fifo ON business_stock_lots(business_id, item_key, best_before_at, received_at) WHERE quantity > 0;
CREATE INDEX IF NOT EXISTS business_stock_lots_location ON business_stock_lots(location_id) WHERE quantity > 0;

CREATE TABLE IF NOT EXISTS hospitality_demand_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  time_bucket bigint NOT NULL,
  requested_customers integer NOT NULL CHECK (requested_customers >= 0),
  served_customers integer NOT NULL CHECK (served_customers >= 0),
  lost_customers integer NOT NULL CHECK (lost_customers >= 0),
  revenue_cents bigint NOT NULL DEFAULT 0 CHECK (revenue_cents >= 0),
  reputation_delta smallint NOT NULL DEFAULT 0 CHECK (reputation_delta BETWEEN -10 AND 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, time_bucket)
);
CREATE INDEX IF NOT EXISTS hospitality_demand_business_time ON hospitality_demand_cycles(business_id, time_bucket DESC);

CREATE TABLE IF NOT EXISTS logistics_delivery_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL UNIQUE REFERENCES supply_shipments(id) ON DELETE CASCADE,
  client_business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  carrier_business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','completed','failed','cancelled')),
  reward_cents bigint NOT NULL DEFAULT 0 CHECK (reward_cents >= 0),
  required_vehicle_class text NOT NULL CHECK (required_vehicle_class IN ('van','box_truck','truck')),
  assigned_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  assigned_vehicle_id uuid REFERENCES player_vehicles(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS logistics_contracts_status ON logistics_delivery_contracts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS logistics_contracts_player ON logistics_delivery_contracts(assigned_player_id, status);

INSERT INTO hospitality_profiles (business_id,concept,capacity,skill_level)
VALUES ('20000000-0000-4000-8000-000000000002','restaurant',28,4)
ON CONFLICT (business_id) DO UPDATE SET concept=EXCLUDED.concept,capacity=EXCLUDED.capacity;

INSERT INTO business_stock_locations (id,business_id,property_id,label,kind,capacity_units) VALUES
('23000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','El Camino · Kitchen Store','premises',40),
('23000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000004','Harbor Warehouse 14 · El Camino Stock','warehouse',180)
ON CONFLICT (business_id,property_id) DO NOTHING;

INSERT INTO business_stock (business_id,item_key,quantity,reorder_point,average_unit_cost_cents) VALUES
('20000000-0000-4000-8000-000000000002','bread_loaf',12,5,260),
('20000000-0000-4000-8000-000000000002','raw_beef',12,5,520),
('20000000-0000-4000-8000-000000000002','cheese_block',10,4,390),
('20000000-0000-4000-8000-000000000002','burger',0,4,0),
('20000000-0000-4000-8000-000000000002','double_burger',0,3,0)
ON CONFLICT (business_id,item_key) DO NOTHING;

INSERT INTO business_prices (business_id,item_key,price_cents) VALUES
('20000000-0000-4000-8000-000000000002','burger',1250),
('20000000-0000-4000-8000-000000000002','double_burger',1650)
ON CONFLICT (business_id,item_key) DO NOTHING;

INSERT INTO business_stock_lots (id,business_id,location_id,item_key,quantity,quality,received_at,best_before_at,source_kind) VALUES
('24000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','23000000-0000-4000-8000-000000000001','bread_loaf',12,82,now(),now()+interval '36 hours','seed'),
('24000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','23000000-0000-4000-8000-000000000001','raw_beef',12,86,now(),now()+interval '24 hours','seed'),
('24000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002','23000000-0000-4000-8000-000000000001','cheese_block',10,84,now(),now()+interval '72 hours','seed')
ON CONFLICT (id) DO NOTHING;