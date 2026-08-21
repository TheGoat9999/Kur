CREATE TABLE IF NOT EXISTS player_needs_runtime (
  player_id uuid PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  consciousness text NOT NULL DEFAULT 'conscious' CHECK (consciousness IN ('conscious','unconscious')),
  care_state text NOT NULL DEFAULT 'field' CHECK (care_state IN ('field','transporting','admitted')),
  pain smallint NOT NULL DEFAULT 0 CHECK (pain BETWEEN 0 AND 100),
  admitted_until timestamptz,
  last_simulated_at timestamptz NOT NULL DEFAULT now(),
  last_rest_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS player_injuries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('cut','blunt','fracture','burn','other')),
  body_area text NOT NULL DEFAULT 'general' CHECK (body_area IN ('head','torso','left_arm','right_arm','left_leg','right_leg','general')),
  severity smallint NOT NULL CHECK (severity BETWEEN 1 AND 3), bleeding smallint NOT NULL DEFAULT 0 CHECK (bleeding BETWEEN 0 AND 3),
  treated boolean NOT NULL DEFAULT false, recovery_until timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS player_injuries_active_idx ON player_injuries(player_id,recovery_until,created_at DESC);
INSERT INTO player_needs_runtime(player_id) SELECT id FROM players ON CONFLICT(player_id) DO NOTHING;

CREATE OR REPLACE FUNCTION sync_ems_assessment_to_needs() RETURNS trigger AS $$
DECLARE patient_id uuid; bleed smallint; existing_id uuid;
BEGIN
 SELECT patient_player_id INTO patient_id FROM ems_calls WHERE id=NEW.call_id; IF patient_id IS NULL THEN RETURN NEW; END IF;
 INSERT INTO player_needs_runtime(player_id) VALUES(patient_id) ON CONFLICT(player_id) DO NOTHING;
 UPDATE player_needs_runtime SET consciousness=CASE WHEN NEW.consciousness='unresponsive' THEN 'unconscious' ELSE 'conscious' END,pain=GREATEST(pain,LEAST(100,NEW.pain*10)),updated_at=now() WHERE player_id=patient_id;
 bleed:=CASE NEW.bleeding WHEN 'major' THEN 3 WHEN 'minor' THEN 1 ELSE 0 END;
 IF bleed>0 THEN SELECT id INTO existing_id FROM player_injuries WHERE player_id=patient_id AND bleeding>0 ORDER BY bleeding DESC,created_at DESC LIMIT 1;
  IF existing_id IS NULL THEN INSERT INTO player_injuries(player_id,kind,body_area,severity,bleeding) VALUES(patient_id,'other','general',CASE WHEN bleed=3 THEN 3 ELSE 1 END,bleed);
  ELSE UPDATE player_injuries SET bleeding=GREATEST(bleeding,bleed),severity=GREATEST(severity,CASE WHEN bleed=3 THEN 3 ELSE 1 END),updated_at=now() WHERE id=existing_id; END IF;
 END IF; RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS ems_assessment_needs_sync ON ems_assessments;
CREATE TRIGGER ems_assessment_needs_sync AFTER INSERT OR UPDATE ON ems_assessments FOR EACH ROW EXECUTE FUNCTION sync_ems_assessment_to_needs();

CREATE OR REPLACE FUNCTION sync_ems_transport_to_needs() RETURNS trigger AS $$ BEGIN
 IF NEW.status='transporting' AND OLD.status IS DISTINCT FROM NEW.status THEN INSERT INTO player_needs_runtime(player_id,care_state) VALUES(NEW.patient_player_id,'transporting') ON CONFLICT(player_id) DO UPDATE SET care_state='transporting',updated_at=now(); END IF; RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS ems_transport_needs_sync ON ems_calls;
CREATE TRIGGER ems_transport_needs_sync AFTER UPDATE OF status ON ems_calls FOR EACH ROW EXECUTE FUNCTION sync_ems_transport_to_needs();

CREATE OR REPLACE FUNCTION sync_ems_handoff_to_needs() RETURNS trigger AS $$ BEGIN
 IF NEW.outcome='transported' THEN
  INSERT INTO player_needs_runtime(player_id,care_state,consciousness,pain,admitted_until) VALUES(NEW.patient_player_id,'admitted','conscious',0,now()+interval '30 minutes') ON CONFLICT(player_id) DO UPDATE SET care_state='admitted',consciousness='conscious',pain=GREATEST(0,player_needs_runtime.pain-35),admitted_until=now()+interval '30 minutes',updated_at=now();
  UPDATE player_injuries SET bleeding=0,treated=true,recovery_until=COALESCE(recovery_until,now()+interval '60 minutes'),updated_at=now() WHERE player_id=NEW.patient_player_id;
  UPDATE player_state SET health=GREATEST(health,45),hydration=GREATEST(hydration,40),version=version+1,updated_at=now() WHERE player_id=NEW.patient_player_id;
 ELSE UPDATE player_needs_runtime SET care_state='field',updated_at=now() WHERE player_id=NEW.patient_player_id; END IF; RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS ems_handoff_needs_sync ON ems_patient_records;
CREATE TRIGGER ems_handoff_needs_sync AFTER INSERT ON ems_patient_records FOR EACH ROW EXECUTE FUNCTION sync_ems_handoff_to_needs();
