CREATE SEQUENCE IF NOT EXISTS citizen_number_seq START WITH 100001;
CREATE SEQUENCE IF NOT EXISTS government_document_number_seq START WITH 100001;
CREATE SEQUENCE IF NOT EXISTS government_license_number_seq START WITH 100001;
CREATE SEQUENCE IF NOT EXISTS vehicle_registration_number_seq START WITH 100001;
CREATE SEQUENCE IF NOT EXISTS government_permit_number_seq START WITH 100001;
CREATE SEQUENCE IF NOT EXISTS government_fine_number_seq START WITH 100001;

CREATE TABLE IF NOT EXISTS citizen_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL UNIQUE REFERENCES players(id) ON DELETE CASCADE,
  character_id uuid UNIQUE REFERENCES characters(id) ON DELETE SET NULL,
  citizen_number text NOT NULL UNIQUE DEFAULT ('SDC-' || lpad(nextval('citizen_number_seq')::text, 6, '0')),
  legal_name text NOT NULL CHECK (char_length(btrim(legal_name)) BETWEEN 2 AND 80),
  date_of_birth date,
  nationality_code text NOT NULL DEFAULT 'SD' CHECK (char_length(nationality_code) BETWEEN 2 AND 3),
  residency_status text NOT NULL DEFAULT 'citizen' CHECK (residency_status IN ('citizen','resident','visitor')),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS citizen_identities_legal_name_idx ON citizen_identities(lower(legal_name));

CREATE OR REPLACE FUNCTION ensure_citizen_identity_db(p_player_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_identity_id uuid;
BEGIN
  INSERT INTO citizen_identities (player_id, character_id, legal_name)
  SELECT p.id,
         c.id,
         COALESCE(NULLIF(btrim(c.display_name), ''), 'Sol Dorado Citizen')
  FROM players p
  LEFT JOIN LATERAL (
    SELECT id, display_name
    FROM characters
    WHERE player_id = p.id AND is_active = true
    ORDER BY updated_at DESC
    LIMIT 1
  ) c ON true
  WHERE p.id = p_player_id
  ON CONFLICT (player_id) DO UPDATE
    SET character_id = COALESCE(EXCLUDED.character_id, citizen_identities.character_id),
        updated_at = now()
  RETURNING id INTO v_identity_id;

  RETURN v_identity_id;
END;
$$;

SELECT ensure_citizen_identity_db(id) FROM players;

CREATE TABLE IF NOT EXISTS government_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_identity_id uuid NOT NULL REFERENCES citizen_identities(id) ON DELETE CASCADE,
  document_kind text NOT NULL CHECK (document_kind IN ('id_card')),
  document_number text NOT NULL UNIQUE DEFAULT ('SD-ID-' || lpad(nextval('government_document_number_seq')::text, 6, '0')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','replaced','revoked','expired')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 years'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_government_document_per_kind
  ON government_documents(citizen_identity_id, document_kind) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS government_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_identity_id uuid NOT NULL REFERENCES citizen_identities(id) ON DELETE CASCADE,
  license_kind text NOT NULL CHECK (license_kind IN ('driving','professional','business')),
  license_code text NOT NULL,
  license_number text NOT NULL UNIQUE DEFAULT ('SD-LIC-' || lpad(nextval('government_license_number_seq')::text, 6, '0')),
  class_code text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','expired','revoked','pending')),
  subject_type text NOT NULL DEFAULT 'citizen' CHECK (subject_type IN ('citizen','vehicle','property','business')),
  subject_ref text,
  source_system text NOT NULL DEFAULT 'government',
  source_ref text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_government_license_per_code
  ON government_licenses(citizen_identity_id, license_kind, license_code, COALESCE(subject_ref, '')) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS government_licenses_holder_idx ON government_licenses(citizen_identity_id, status, license_kind);

CREATE TABLE IF NOT EXISTS vehicle_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES player_vehicles(id) ON DELETE CASCADE,
  citizen_identity_id uuid NOT NULL REFERENCES citizen_identities(id) ON DELETE RESTRICT,
  registration_number text NOT NULL UNIQUE DEFAULT ('SD-' || lpad(nextval('vehicle_registration_number_seq')::text, 6, '0')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','expired','cancelled')),
  registered_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_registration_per_vehicle
  ON vehicle_registrations(vehicle_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS vehicle_registrations_holder_idx ON vehicle_registrations(citizen_identity_id, status);

CREATE TABLE IF NOT EXISTS government_permits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_identity_id uuid NOT NULL REFERENCES citizen_identities(id) ON DELETE CASCADE,
  permit_kind text NOT NULL,
  permit_number text NOT NULL UNIQUE DEFAULT ('SD-PER-' || lpad(nextval('government_permit_number_seq')::text, 6, '0')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','suspended','expired','revoked')),
  subject_type text NOT NULL DEFAULT 'citizen' CHECK (subject_type IN ('citizen','vehicle','property','business')),
  subject_ref text,
  issuing_agency text NOT NULL DEFAULT 'Sol Dorado Civic Administration',
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS government_permits_holder_idx ON government_permits(citizen_identity_id, status);

CREATE TABLE IF NOT EXISTS government_fines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_identity_id uuid NOT NULL REFERENCES citizen_identities(id) ON DELETE CASCADE,
  fine_number text NOT NULL UNIQUE DEFAULT ('SD-F-' || lpad(nextval('government_fine_number_seq')::text, 6, '0')),
  issuing_agency text NOT NULL,
  reason text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  balance_cents bigint NOT NULL CHECK (balance_cents >= 0),
  status text NOT NULL DEFAULT 'outstanding' CHECK (status IN ('outstanding','partial','paid','void')),
  due_at timestamptz,
  source_type text,
  source_ref text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (balance_cents <= amount_cents)
);
CREATE INDEX IF NOT EXISTS government_fines_holder_idx ON government_fines(citizen_identity_id, status, due_at);

CREATE TABLE IF NOT EXISTS government_record_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_identity_id uuid NOT NULL REFERENCES citizen_identities(id) ON DELETE CASCADE,
  record_type text NOT NULL,
  agency text NOT NULL,
  summary text NOT NULL,
  entity_type text,
  entity_ref text,
  actor_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS government_record_events_holder_time_idx
  ON government_record_events(citizen_identity_id, created_at DESC);

CREATE OR REPLACE FUNCTION sync_character_citizen_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_identity_id uuid;
BEGIN
  IF NEW.is_active = true THEN
    v_identity_id := ensure_citizen_identity_db(NEW.player_id);
    UPDATE citizen_identities
    SET character_id = NEW.id,
        legal_name = NEW.display_name,
        updated_at = now()
    WHERE id = v_identity_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS character_citizen_identity_sync ON characters;
CREATE TRIGGER character_citizen_identity_sync
AFTER INSERT OR UPDATE OF display_name, is_active ON characters
FOR EACH ROW EXECUTE FUNCTION sync_character_citizen_identity();

CREATE OR REPLACE FUNCTION register_owned_vehicle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_identity_id uuid;
BEGIN
  v_identity_id := ensure_citizen_identity_db(NEW.player_id);
  INSERT INTO vehicle_registrations(vehicle_id, citizen_identity_id)
  VALUES (NEW.id, v_identity_id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS owned_vehicle_government_registration ON player_vehicles;
CREATE TRIGGER owned_vehicle_government_registration
AFTER INSERT ON player_vehicles
FOR EACH ROW EXECUTE FUNCTION register_owned_vehicle();

INSERT INTO vehicle_registrations(vehicle_id, citizen_identity_id)
SELECT pv.id, ensure_citizen_identity_db(pv.player_id)
FROM player_vehicles pv
WHERE NOT EXISTS (
  SELECT 1 FROM vehicle_registrations vr WHERE vr.vehicle_id = pv.id AND vr.status = 'active'
)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION sync_real_estate_government_license()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_identity_id uuid;
BEGIN
  v_identity_id := ensure_citizen_identity_db(NEW.player_id);
  IF NEW.license_stage >= 2 THEN
    UPDATE government_licenses
    SET status = 'active', updated_at = now()
    WHERE citizen_identity_id = v_identity_id
      AND license_kind = 'professional'
      AND license_code = 'real_estate_agent'
      AND source_system = 'real_estate';
    IF NOT FOUND THEN
      INSERT INTO government_licenses(
        citizen_identity_id, license_kind, license_code, source_system, source_ref, metadata
      ) VALUES (
        v_identity_id, 'professional', 'real_estate_agent', 'real_estate', NEW.player_id::text,
        '{"authority":"Sol Dorado Real Estate Commission"}'::jsonb
      );
    END IF;
  ELSE
    UPDATE government_licenses
    SET status = 'revoked', updated_at = now()
    WHERE citizen_identity_id = v_identity_id
      AND license_kind = 'professional'
      AND license_code = 'real_estate_agent'
      AND source_system = 'real_estate'
      AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS real_estate_government_license_sync ON real_estate_careers;
CREATE TRIGGER real_estate_government_license_sync
AFTER INSERT OR UPDATE OF license_stage ON real_estate_careers
FOR EACH ROW EXECUTE FUNCTION sync_real_estate_government_license();

INSERT INTO government_licenses(citizen_identity_id, license_kind, license_code, source_system, source_ref, metadata)
SELECT ensure_citizen_identity_db(rec.player_id), 'professional', 'real_estate_agent', 'real_estate', rec.player_id::text,
       '{"authority":"Sol Dorado Real Estate Commission"}'::jsonb
FROM real_estate_careers rec
WHERE rec.license_stage >= 2
  AND NOT EXISTS (
    SELECT 1 FROM government_licenses gl
    WHERE gl.citizen_identity_id = ensure_citizen_identity_db(rec.player_id)
      AND gl.license_kind = 'professional'
      AND gl.license_code = 'real_estate_agent'
      AND gl.status = 'active'
  );

CREATE OR REPLACE FUNCTION sync_job_qualifications_government()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_identity_id uuid;
  v_qualification text;
BEGIN
  v_identity_id := ensure_citizen_identity_db(NEW.player_id);

  UPDATE government_licenses
  SET status = 'revoked', updated_at = now()
  WHERE citizen_identity_id = v_identity_id
    AND license_kind = 'professional'
    AND source_system = 'jobs'
    AND status = 'active'
    AND NOT (license_code = ANY(NEW.qualifications));

  FOREACH v_qualification IN ARRAY NEW.qualifications LOOP
    UPDATE government_licenses
    SET status = 'active', updated_at = now()
    WHERE citizen_identity_id = v_identity_id
      AND license_kind = 'professional'
      AND license_code = v_qualification
      AND source_system = 'jobs';
    IF NOT FOUND THEN
      INSERT INTO government_licenses(
        citizen_identity_id, license_kind, license_code, source_system, source_ref, metadata
      ) VALUES (
        v_identity_id, 'professional', v_qualification, 'jobs', NEW.player_id::text,
        '{"credentialType":"qualification"}'::jsonb
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS job_qualifications_government_sync ON job_profiles;
CREATE TRIGGER job_qualifications_government_sync
AFTER INSERT OR UPDATE OF qualifications ON job_profiles
FOR EACH ROW EXECUTE FUNCTION sync_job_qualifications_government();

INSERT INTO government_licenses(citizen_identity_id, license_kind, license_code, source_system, source_ref, metadata)
SELECT ensure_citizen_identity_db(jp.player_id), 'professional', q.qualification, 'jobs', jp.player_id::text,
       '{"credentialType":"qualification"}'::jsonb
FROM job_profiles jp
CROSS JOIN LATERAL unnest(jp.qualifications) AS q(qualification)
WHERE NOT EXISTS (
  SELECT 1 FROM government_licenses gl
  WHERE gl.citizen_identity_id = ensure_citizen_identity_db(jp.player_id)
    AND gl.license_kind = 'professional'
    AND gl.license_code = q.qualification
    AND gl.status = 'active'
);
