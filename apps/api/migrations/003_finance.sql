CREATE TABLE IF NOT EXISTS finance_accounts (
  player_id uuid PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
  access_mode text NOT NULL DEFAULT 'branch' CHECK (access_mode IN ('branch', 'atm', 'phone')),
  checking_cents bigint NOT NULL DEFAULT 1280000 CHECK (checking_cents >= 0),
  savings_cents bigint NOT NULL DEFAULT 350000 CHECK (savings_cents >= 0),
  exchange_cash_cents bigint NOT NULL DEFAULT 0 CHECK (exchange_cash_cents >= 0),
  credit_score smallint NOT NULL DEFAULT 684 CHECK (credit_score BETWEEN 300 AND 850),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('personal', 'vehicle')),
  name text NOT NULL,
  principal_cents bigint NOT NULL CHECK (principal_cents > 0),
  remaining_cents bigint NOT NULL CHECK (remaining_cents >= 0),
  payment_cents bigint NOT NULL CHECK (payment_cents > 0),
  payments_remaining smallint NOT NULL CHECK (payments_remaining >= 0),
  apr_basis_points integer NOT NULL CHECK (apr_basis_points >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS finance_loans_player_active ON finance_loans(player_id, created_at DESC) WHERE remaining_cents > 0;

CREATE TABLE IF NOT EXISTS finance_assets (
  symbol text PRIMARY KEY CHECK (symbol IN ('DRC', 'VTA', 'MSA')),
  name text NOT NULL,
  price_cents bigint NOT NULL CHECK (price_cents > 0),
  previous_price_cents bigint NOT NULL CHECK (previous_price_cents > 0),
  volatility numeric(6, 5) NOT NULL CHECK (volatility > 0 AND volatility < 1),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_holdings (
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  symbol text NOT NULL REFERENCES finance_assets(symbol),
  quantity numeric(24, 8) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, symbol)
);

CREATE TABLE IF NOT EXISTS finance_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('cash', 'transfer', 'internal', 'loan', 'crypto')),
  title text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS finance_ledger_player_time ON finance_ledger(player_id, created_at DESC);
