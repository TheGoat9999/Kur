ALTER TABLE phone_notifications DROP CONSTRAINT IF EXISTS phone_notifications_app_id_check;
ALTER TABLE phone_notifications
  ADD CONSTRAINT phone_notifications_app_id_check
  CHECK (app_id IN ('phone','messages','contacts','maps','vehicles','bank','tasks','jobs','mail','notes','camera','gallery','settings'));

ALTER TABLE phone_devices
  ALTER COLUMN settings SET DEFAULT '{"theme":"dark","wallpaper":"dorado","accent":"#f2bf62","uiScale":1,"soundEnabled":true,"vibrationEnabled":true,"doNotDisturb":false,"airplaneMode":false,"showNotificationPreviews":true,"homeLayout":["messages","contacts","maps","vehicles","bank","tasks","jobs","mail","notes","camera","gallery","settings","phone"]}'::jsonb;

UPDATE phone_devices
SET settings = jsonb_set(
  settings,
  '{homeLayout}',
  CASE
    WHEN COALESCE(settings->'homeLayout', '[]'::jsonb) ? 'vehicles'
      THEN COALESCE(settings->'homeLayout', '[]'::jsonb)
    ELSE COALESCE(settings->'homeLayout', '[]'::jsonb) || '"vehicles"'::jsonb
  END,
  true
),
updated_at = now();
