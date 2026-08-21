CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_key text UNIQUE NOT NULL,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('convenience_store','restaurant','mechanic_shop','dealership','logistics','nightclub')),
  owner_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  property_id uuid REFERENCES real_estate_properties(id) ON DELETE SET NULL,
  district text NOT NULL,
  street_segment text NOT NULL,
  status text NOT NULL DEFAULT 'closed' CHECK (status IN ('open','closed','suspended')),
  reputation smallint NOT NULL DEFAULT 50 CHECK (reputation BETWEEN 0 AND 100),
  sales_tax_basis_points integer NOT NULL DEFAULT 850 CHECK (sales_tax_basis_points BETWEEN 0 AND 5000),
  service_fee_basis_points integer NOT NULL DEFAULT 0 CHECK (service_fee_basis_points BETWEEN 0 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','manager','employee')),
  job_key text,
  wage_cents bigint NOT NULL DEFAULT 0 CHECK (wage_cents >= 0),
  active boolean NOT NULL DEFAULT true,
  hired_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS business_members_player_unique ON business_members(business_id, player_id) WHERE player_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS business_accounts (
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  account_key text NOT NULL CHECK (account_key IN ('operating','reserve')),
  balance_cents bigint NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, account_key)
);

CREATE TABLE IF NOT EXISTS business_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('sale','supplier','payroll','tax','license','capital')),
  direction text NOT NULL CHECK (direction IN ('in','out')),
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  memo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_ledger_business_time ON business_ledger(business_id, created_at DESC);

CREATE TABLE IF NOT EXISTS business_stock (
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reorder_point integer NOT NULL DEFAULT 5 CHECK (reorder_point >= 0),
  average_unit_cost_cents bigint NOT NULL DEFAULT 0 CHECK (average_unit_cost_cents >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, item_key)
);

CREATE TABLE IF NOT EXISTS business_prices (
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  price_cents bigint NOT NULL CHECK (price_cents > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, item_key)
);

CREATE TABLE IF NOT EXISTS business_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  supplier_key text NOT NULL,
  name text NOT NULL,
  reliability smallint NOT NULL DEFAULT 80 CHECK (reliability BETWEEN 0 AND 100),
  lead_time_minutes integer NOT NULL DEFAULT 60 CHECK (lead_time_minutes >= 0),
  price_multiplier_basis_points integer NOT NULL DEFAULT 10000 CHECK (price_multiplier_basis_points BETWEEN 1000 AND 50000),
  UNIQUE (business_id, supplier_key)
);

CREATE TABLE IF NOT EXISTS business_supplier_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES business_suppliers(id),
  item_key text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost_cents bigint NOT NULL CHECK (unit_cost_cents >= 0),
  total_cents bigint NOT NULL CHECK (total_cents >= 0),
  status text NOT NULL DEFAULT 'delivered' CHECK (status IN ('placed','delivered','cancelled')),
  ordered_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);

CREATE TABLE IF NOT EXISTS business_hours (
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  opens_at time,
  closes_at time,
  closed boolean NOT NULL DEFAULT false,
  PRIMARY KEY (business_id, day_of_week),
  CHECK (closed OR (opens_at IS NOT NULL AND closes_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS business_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  license_key text NOT NULL,
  name text NOT NULL,
  required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','suspended')),
  fee_cents bigint NOT NULL DEFAULT 0 CHECK (fee_cents >= 0),
  expires_at timestamptz,
  UNIQUE (business_id, license_key)
);

CREATE TABLE IF NOT EXISTS business_tax_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('sales_tax','city_fee')),
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  status text NOT NULL DEFAULT 'due' CHECK (status IN ('due','paid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
CREATE INDEX IF NOT EXISTS business_tax_due ON business_tax_obligations(business_id, status);

CREATE TABLE IF NOT EXISTS business_pos_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  subtotal_cents bigint NOT NULL CHECK (subtotal_cents >= 0),
  tax_cents bigint NOT NULL CHECK (tax_cents >= 0),
  service_fee_cents bigint NOT NULL DEFAULT 0 CHECK (service_fee_cents >= 0),
  total_cents bigint NOT NULL CHECK (total_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  total_cents bigint NOT NULL CHECK (total_cents >= 0),
  employee_count integer NOT NULL CHECK (employee_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO businesses (id,business_key,name,kind,property_id,district,street_segment,status,reputation,sales_tax_basis_points,service_fee_basis_points) VALUES
('20000000-0000-4000-8000-000000000001','mercado_24','Mercado 24','convenience_store',NULL,'Las Palmas West','Market Street / Block 3','closed',62,850,0),
('20000000-0000-4000-8000-000000000002','el_camino','El Camino','restaurant','10000000-0000-4000-8000-000000000003','Las Palmas West','Mira Service Alley','closed',71,850,800),
('20000000-0000-4000-8000-000000000003','atlas_auto','Atlas Auto Service','mechanic_shop',NULL,'Industrial','Industrial Service Row','closed',58,850,0)
ON CONFLICT (business_key) DO NOTHING;

INSERT INTO business_accounts (business_id,account_key,balance_cents) VALUES
('20000000-0000-4000-8000-000000000001','operating',125000),('20000000-0000-4000-8000-000000000001','reserve',25000),
('20000000-0000-4000-8000-000000000002','operating',220000),('20000000-0000-4000-8000-000000000002','reserve',50000),
('20000000-0000-4000-8000-000000000003','operating',350000),('20000000-0000-4000-8000-000000000003','reserve',90000)
ON CONFLICT (business_id,account_key) DO NOTHING;

INSERT INTO business_stock (business_id,item_key,quantity,reorder_point,average_unit_cost_cents) VALUES
('20000000-0000-4000-8000-000000000001','water_bottle',24,8,180),
('20000000-0000-4000-8000-000000000001','cola',18,6,220),
('20000000-0000-4000-8000-000000000002','water_bottle',16,6,170),
('20000000-0000-4000-8000-000000000002','coffee',12,4,260)
ON CONFLICT (business_id,item_key) DO NOTHING;

INSERT INTO business_prices (business_id,item_key,price_cents) VALUES
('20000000-0000-4000-8000-000000000001','water_bottle',350),('20000000-0000-4000-8000-000000000001','cola',475),
('20000000-0000-4000-8000-000000000002','water_bottle',500),('20000000-0000-4000-8000-000000000002','coffee',750)
ON CONFLICT (business_id,item_key) DO NOTHING;

INSERT INTO business_suppliers (id,business_id,supplier_key,name,reliability,lead_time_minutes,price_multiplier_basis_points) VALUES
('21000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','dorado_wholesale','Dorado Wholesale',88,45,7800),
('21000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','pacific_foods','Pacific Foods',82,90,7400),
('21000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','atlas_parts','Atlas Parts Network',90,120,8000)
ON CONFLICT (business_id,supplier_key) DO NOTHING;

INSERT INTO business_licenses (business_id,license_key,name,required,status,fee_cents,expires_at) VALUES
('20000000-0000-4000-8000-000000000001','retail_permit','Retail Permit',true,'active',7500,now()+interval '30 days'),
('20000000-0000-4000-8000-000000000002','food_service','Food Service License',true,'active',12500,now()+interval '30 days'),
('20000000-0000-4000-8000-000000000003','workshop_permit','Workshop Permit',true,'active',15000,now()+interval '30 days')
ON CONFLICT (business_id,license_key) DO NOTHING;

INSERT INTO business_hours (business_id,day_of_week,opens_at,closes_at,closed)
SELECT b.id,d,'08:00'::time,'22:00'::time,false FROM businesses b CROSS JOIN generate_series(0,6) d
WHERE b.business_key IN ('mercado_24','el_camino','atlas_auto')
ON CONFLICT (business_id,day_of_week) DO NOTHING;