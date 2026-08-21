-- SOL DORADO world atlas visual-density pass.
-- Additive only: existing canonical street IDs, authored playable scenes and route
-- connections remain untouched. These extra streets are atlas-visible and planned.
WITH district_street_templates AS (
  SELECT d.id AS district_id, d.kind AS district_kind, g.n,
    CASE d.kind
      WHEN 'residential' THEN (ARRAY['Palm Grove Avenue','Jacaranda Way','Sunset Row','Garden Loop','Coyote Run','Mission Lane','Riviera Drive','Cypress Crescent','Vista Terrace','Orchid Court'])[g.n]
      WHEN 'commercial' THEN (ARRAY['Mercado Street','Vespucci Boulevard','Commerce Avenue','Plaza Drive','Exchange Row','Arcade Lane','Central Promenade','Merchant Way','Market Crescent','Forum Street'])[g.n]
      WHEN 'civic' THEN (ARRAY['Civic Boulevard','Liberty Avenue','Courthouse Way','Republic Street','Monument Drive','Library Lane','Assembly Row','City Hall Crescent','Justice Avenue','Founders Walk'])[g.n]
      WHEN 'industrial' THEN (ARRAY['Foundry Road','Freight Loop','Forge Street','Quarry Way','Machine Avenue','Depot Road','Mill Lane','Cargo Crescent','Works Drive','Switchyard Road'])[g.n]
      WHEN 'nightlife' THEN (ARRAY['Neon Boulevard','Ocean Promenade','Sunset Avenue','Club Row','Marina Drive','Palmera Way','Festival Street','Mirage Lane','Moonlight Crescent','Vista del Mar'])[g.n]
      WHEN 'transit' THEN (ARRAY['Terminal Road','Gateway Boulevard','Arrivals Way','Transit Avenue','Runway Service Road','Depot Loop','Cargo Connector','Platform Street','Express Lane','Transfer Drive'])[g.n]
      ELSE (ARRAY['Vespucci Boulevard','Palm Grove Avenue','Mercado Street','Sunset Row','Riviera Drive','Harborline Way','San Tomas Avenue','Garden Loop','Coyote Run','Mission Lane'])[g.n]
    END AS street_name,
    CASE g.n WHEN 1 THEN 'boulevard' WHEN 2 THEN 'avenue' WHEN 3 THEN 'street' WHEN 4 THEN 'road' WHEN 5 THEN 'road' WHEN 6 THEN 'street' WHEN 7 THEN 'avenue' WHEN 8 THEN 'road' WHEN 9 THEN 'street' ELSE 'alley' END AS street_kind,
    CASE g.n
      WHEN 1 THEN jsonb_build_object('center',jsonb_build_object('x',50,'y',18),'polygon','[]'::jsonb,'path',jsonb_build_array(jsonb_build_object('x',7,'y',23),jsonb_build_object('x',24,'y',17),jsonb_build_object('x',43,'y',20),jsonb_build_object('x',66,'y',14),jsonb_build_object('x',93,'y',20)))
      WHEN 2 THEN jsonb_build_object('center',jsonb_build_object('x',50,'y',77),'polygon','[]'::jsonb,'path',jsonb_build_array(jsonb_build_object('x',8,'y',78),jsonb_build_object('x',27,'y',70),jsonb_build_object('x',47,'y',74),jsonb_build_object('x',68,'y',67),jsonb_build_object('x',93,'y',72)))
      WHEN 3 THEN jsonb_build_object('center',jsonb_build_object('x',38,'y',49),'polygon','[]'::jsonb,'path',jsonb_build_array(jsonb_build_object('x',16,'y',8),jsonb_build_object('x',23,'y',28),jsonb_build_object('x',34,'y',48),jsonb_build_object('x',49,'y',69),jsonb_build_object('x',64,'y',92)))
      WHEN 4 THEN jsonb_build_object('center',jsonb_build_object('x',63,'y',49),'polygon','[]'::jsonb,'path',jsonb_build_array(jsonb_build_object('x',86,'y',10),jsonb_build_object('x',75,'y',29),jsonb_build_object('x',64,'y',47),jsonb_build_object('x',50,'y',64),jsonb_build_object('x',33,'y',90)))
      WHEN 5 THEN jsonb_build_object('center',jsonb_build_object('x',42,'y',39),'polygon','[]'::jsonb,'path',jsonb_build_array(jsonb_build_object('x',18,'y',39),jsonb_build_object('x',31,'y',29),jsonb_build_object('x',49,'y',31),jsonb_build_object('x',62,'y',42),jsonb_build_object('x',55,'y',54),jsonb_build_object('x',38,'y',53),jsonb_build_object('x',18,'y',39)))
      WHEN 6 THEN jsonb_build_object('center',jsonb_build_object('x',75,'y',50),'polygon','[]'::jsonb,'path',jsonb_build_array(jsonb_build_object('x',68,'y',25),jsonb_build_object('x',79,'y',34),jsonb_build_object('x',83,'y',49),jsonb_build_object('x',78,'y',64),jsonb_build_object('x',66,'y',74)))
      WHEN 7 THEN jsonb_build_object('center',jsonb_build_object('x',51,'y',44),'polygon','[]'::jsonb,'path',jsonb_build_array(jsonb_build_object('x',7,'y',46),jsonb_build_object('x',28,'y',42),jsonb_build_object('x',52,'y',47),jsonb_build_object('x',76,'y',41),jsonb_build_object('x',95,'y',44)))
      WHEN 8 THEN jsonb_build_object('center',jsonb_build_object('x',51,'y',57),'polygon','[]'::jsonb,'path',jsonb_build_array(jsonb_build_object('x',9,'y',59),jsonb_build_object('x',23,'y',52),jsonb_build_object('x',38,'y',60),jsonb_build_object('x',53,'y',55),jsonb_build_object('x',70,'y',62),jsonb_build_object('x',90,'y',54)))
      WHEN 9 THEN jsonb_build_object('center',jsonb_build_object('x',49,'y',51),'polygon','[]'::jsonb,'path',jsonb_build_array(jsonb_build_object('x',41,'y',14),jsonb_build_object('x',44,'y',34),jsonb_build_object('x',52,'y',49),jsonb_build_object('x',48,'y',66),jsonb_build_object('x',55,'y',86)))
      ELSE jsonb_build_object('center',jsonb_build_object('x',54,'y',82),'polygon','[]'::jsonb,'path',jsonb_build_array(jsonb_build_object('x',14,'y',86),jsonb_build_object('x',29,'y',79),jsonb_build_object('x',45,'y',83),jsonb_build_object('x',62,'y',78),jsonb_build_object('x',78,'y',84),jsonb_build_object('x',92,'y',76)))
    END AS geometry
  FROM world_districts d CROSS JOIN LATERAL generate_series(1, 10) AS g(n)
), inserted_streets AS (
  INSERT INTO world_streets (id,district_id,name,kind,geometry,max_properties_per_owner,sort_order)
  SELECT 'atlas_' || district_id || '_' || n,district_id,street_name,street_kind,geometry,2,100+n FROM district_street_templates
  ON CONFLICT (id) DO UPDATE SET district_id=EXCLUDED.district_id,name=EXCLUDED.name,kind=EXCLUDED.kind,geometry=EXCLUDED.geometry,max_properties_per_owner=EXCLUDED.max_properties_per_owner,sort_order=EXCLUDED.sort_order
  RETURNING id,name,kind,geometry,sort_order
)
INSERT INTO world_street_segments (id,street_id,display_name,kind,geometry,playable,sort_order)
SELECT id || '_segment',id,name || ' · Planned street',CASE WHEN kind='alley' THEN 'alley' ELSE 'road' END,geometry,false,100+sort_order FROM inserted_streets
ON CONFLICT (id) DO UPDATE SET street_id=EXCLUDED.street_id,display_name=EXCLUDED.display_name,kind=EXCLUDED.kind,geometry=EXCLUDED.geometry,playable=false,sort_order=EXCLUDED.sort_order;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM world_districts d LEFT JOIN world_streets s ON s.district_id=d.id GROUP BY d.id HAVING COUNT(s.id) < 10) THEN
    RAISE EXCEPTION 'world_atlas_overhaul_requires_ten_streets_per_district';
  END IF;
END $$;
