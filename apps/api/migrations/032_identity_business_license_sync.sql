CREATE OR REPLACE FUNCTION sync_business_license_government()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_owner_player_id uuid;
  v_identity_id uuid;
  v_business_name text;
  v_government_status text;
BEGIN
  SELECT owner_player_id,name INTO v_owner_player_id,v_business_name FROM businesses WHERE id=NEW.business_id;
  IF v_owner_player_id IS NULL THEN RETURN NEW; END IF;

  v_identity_id:=ensure_citizen_identity_db(v_owner_player_id);
  v_government_status:=CASE NEW.status WHEN 'active' THEN 'active' WHEN 'expired' THEN 'expired' ELSE 'suspended' END;

  UPDATE government_licenses
  SET status=v_government_status,
      expires_at=NEW.expires_at,
      subject_type='business',
      subject_ref=NEW.business_id::text,
      source_ref=NEW.id::text,
      metadata=jsonb_build_object('businessName',v_business_name,'sourceLicenseName',NEW.name,'required',NEW.required),
      updated_at=now()
  WHERE citizen_identity_id=v_identity_id
    AND license_kind='business'
    AND license_code=NEW.license_key
    AND source_system='businesses'
    AND subject_ref=NEW.business_id::text;

  IF NOT FOUND THEN
    INSERT INTO government_licenses(
      citizen_identity_id,license_kind,license_code,status,subject_type,subject_ref,source_system,source_ref,expires_at,metadata
    ) VALUES(
      v_identity_id,'business',NEW.license_key,v_government_status,'business',NEW.business_id::text,'businesses',NEW.id::text,NEW.expires_at,
      jsonb_build_object('businessName',v_business_name,'sourceLicenseName',NEW.name,'required',NEW.required)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS business_license_government_sync ON business_licenses;
CREATE TRIGGER business_license_government_sync
AFTER INSERT OR UPDATE OF status,expires_at,name,required ON business_licenses
FOR EACH ROW EXECUTE FUNCTION sync_business_license_government();

CREATE OR REPLACE FUNCTION sync_business_owner_government_licenses()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_old_identity_id uuid;
BEGIN
  IF OLD.owner_player_id IS NOT NULL AND OLD.owner_player_id IS DISTINCT FROM NEW.owner_player_id THEN
    v_old_identity_id:=ensure_citizen_identity_db(OLD.owner_player_id);
    UPDATE government_licenses
    SET status='revoked',updated_at=now()
    WHERE citizen_identity_id=v_old_identity_id
      AND license_kind='business'
      AND source_system='businesses'
      AND subject_ref=NEW.id::text
      AND status IN ('active','suspended','pending');
  END IF;

  IF NEW.owner_player_id IS NOT NULL THEN
    UPDATE business_licenses SET status=status WHERE business_id=NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS business_owner_government_license_sync ON businesses;
CREATE TRIGGER business_owner_government_license_sync
AFTER UPDATE OF owner_player_id ON businesses
FOR EACH ROW EXECUTE FUNCTION sync_business_owner_government_licenses();

UPDATE business_licenses bl
SET status=bl.status
FROM businesses b
WHERE b.id=bl.business_id AND b.owner_player_id IS NOT NULL;
