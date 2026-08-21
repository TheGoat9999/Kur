CREATE TABLE IF NOT EXISTS phone_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL UNIQUE REFERENCES inventory_items(id) ON DELETE CASCADE,
  owner_player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  phone_number text NOT NULL UNIQUE,
  device_name text NOT NULL DEFAULT 'Dorado One',
  battery_percent smallint NOT NULL DEFAULT 86 CHECK (battery_percent BETWEEN 0 AND 100),
  charging boolean NOT NULL DEFAULT false,
  signal_bars smallint NOT NULL DEFAULT 4 CHECK (signal_bars BETWEEN 0 AND 4),
  network text NOT NULL DEFAULT '5g' CHECK (network IN ('offline', 'lte', '5g', 'wifi')),
  settings jsonb NOT NULL DEFAULT '{"theme":"dark","wallpaper":"dorado","accent":"#f2bf62","uiScale":1,"soundEnabled":true,"vibrationEnabled":true,"doNotDisturb":false,"airplaneMode":false,"showNotificationPreviews":true,"homeLayout":["messages","contacts","maps","bank","tasks","jobs","mail","notes","camera","gallery","settings","phone"]}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS phone_devices_owner ON phone_devices(owner_player_id);

CREATE TABLE IF NOT EXISTS phone_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES phone_devices(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  phone_number text NOT NULL CHECK (char_length(phone_number) BETWEEN 3 AND 32),
  favorite boolean NOT NULL DEFAULT false,
  color text NOT NULL DEFAULT '#7e8f94',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (device_id, phone_number)
);
CREATE INDEX IF NOT EXISTS phone_contacts_device ON phone_contacts(device_id, name);

CREATE TABLE IF NOT EXISTS phone_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES phone_devices(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES phone_contacts(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  phone_number text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (device_id, contact_id)
);
CREATE INDEX IF NOT EXISTS phone_threads_device_time ON phone_threads(device_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS phone_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES phone_threads(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('player', 'contact', 'system')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS phone_messages_thread_time ON phone_messages(thread_id, created_at);

CREATE TABLE IF NOT EXISTS phone_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES phone_devices(id) ON DELETE CASCADE,
  app_id text NOT NULL CHECK (app_id IN ('phone','messages','contacts','maps','bank','tasks','jobs','mail','notes','camera','gallery','settings')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 300),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS phone_notifications_device_time ON phone_notifications(device_id, created_at DESC);

CREATE TABLE IF NOT EXISTS phone_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES phone_devices(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  completed boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'Personal' CHECK (char_length(source) BETWEEN 1 AND 60),
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS phone_tasks_device ON phone_tasks(device_id, completed, due_at);

CREATE TABLE IF NOT EXISTS phone_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES phone_devices(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 5000),
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS phone_notes_device_time ON phone_notes(device_id, pinned DESC, updated_at DESC);
