CREATE TABLE IF NOT EXISTS admin_roles (
  role_key text PRIMARY KEY,
  name_bg text NOT NULL,
  name_en text NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_role_permissions (
  role_key text NOT NULL REFERENCES admin_roles(role_key) ON DELETE CASCADE,
  permission_key text NOT NULL,
  PRIMARY KEY (role_key, permission_key)
);

CREATE TABLE IF NOT EXISTS player_admin_roles (
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  role_key text NOT NULL REFERENCES admin_roles(role_key) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, role_key)
);

CREATE TABLE IF NOT EXISTS player_admin_permission_overrides (
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  allowed boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, permission_key)
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  target_player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_target_time ON admin_audit_log(target_player_id, created_at DESC);

INSERT INTO admin_roles (role_key,name_bg,name_en) VALUES
  ('owner','Собственик','Owner'),
  ('developer','Разработчик','Developer'),
  ('tester','Тестер','Tester'),
  ('moderator','Модератор','Moderator')
ON CONFLICT (role_key) DO UPDATE SET name_bg=EXCLUDED.name_bg,name_en=EXCLUDED.name_en;

INSERT INTO admin_role_permissions (role_key,permission_key) VALUES
  ('owner','core.view'),('owner','admin.roles'),('owner','admin.money'),('owner','admin.items'),('owner','admin.vehicles'),('owner','admin.jobs'),
  ('developer','core.view'),('developer','admin.money'),('developer','admin.items'),('developer','admin.vehicles'),('developer','admin.jobs'),
  ('tester','core.view'),('tester','admin.money'),('tester','admin.items'),('tester','admin.vehicles'),('tester','admin.jobs'),
  ('moderator','core.view')
ON CONFLICT DO NOTHING;

-- The fixed development player is the only automatic owner. The admin API itself
-- is disabled in production, so this bootstrap cannot create a production backdoor.
INSERT INTO player_admin_roles (player_id,role_key)
SELECT id,'owner' FROM players WHERE id='00000000-0000-4000-8000-000000000001'
ON CONFLICT DO NOTHING;
