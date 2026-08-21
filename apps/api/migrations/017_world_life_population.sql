-- Populate the wider Sol Dorado region with denser, explorable hierarchy data.
-- New outer-world street segments are map-interactive but intentionally non-playable
-- until authored street scenes and spatial navigation graphs exist for them.

INSERT INTO world_zones (id, settlement_id, name, kind, geometry, sort_order) VALUES
('mesa_centro','mesa_roja','Mesa Centro','urban','{"center":{"x":31,"y":36},"polygon":[{"x":5,"y":8},{"x":56,"y":8},{"x":56,"y":61},{"x":5,"y":61}],"path":[]}',1),
('mesa_outskirts','mesa_roja','Red Mesa Outskirts','desert','{"center":{"x":74,"y":35},"polygon":[{"x":56,"y":8},{"x":95,"y":8},{"x":95,"y":61},{"x":56,"y":61}],"path":[]}',2),
('mesa_industry','mesa_roja','Mesa Works','industrial','{"center":{"x":50,"y":78},"polygon":[{"x":5,"y":61},{"x":95,"y":61},{"x":95,"y":94},{"x":5,"y":94}],"path":[]}',3),
('puerto_old_town','puerto_cielo','Puerto Viejo','urban','{"center":{"x":31,"y":36},"polygon":[{"x":5,"y":8},{"x":56,"y":8},{"x":56,"y":61},{"x":5,"y":61}],"path":[]}',1),
('puerto_coast','puerto_cielo','Cielo Coast','coastal','{"center":{"x":74,"y":35},"polygon":[{"x":56,"y":8},{"x":95,"y":8},{"x":95,"y":61},{"x":56,"y":61}],"path":[]}',2),
('puerto_north','puerto_cielo','Cielo North','suburban','{"center":{"x":50,"y":78},"polygon":[{"x":5,"y":61},{"x":95,"y":61},{"x":95,"y":94},{"x":5,"y":94}],"path":[]}',3),
('arroyo_village_core','arroyo_seco','Arroyo Village Core','rural','{"center":{"x":31,"y":45},"polygon":[{"x":5,"y":8},{"x":57,"y":8},{"x":57,"y":90},{"x":5,"y":90}],"path":[]}',1),
('arroyo_farmland','arroyo_seco','Arroyo Farmland','rural','{"center":{"x":77,"y":45},"polygon":[{"x":57,"y":8},{"x":95,"y":8},{"x":95,"y":90},{"x":57,"y":90}],"path":[]}',2)
ON CONFLICT (id) DO UPDATE SET settlement_id=EXCLUDED.settlement_id,name=EXCLUDED.name,kind=EXCLUDED.kind,geometry=EXCLUDED.geometry,sort_order=EXCLUDED.sort_order;

INSERT INTO world_districts (id, zone_id, name, kind, geometry, max_player_property_share, sort_order) VALUES
('mesa_main_street','mesa_centro','Mesa Main Street','mixed_use','{"center":{"x":29,"y":50},"polygon":[{"x":5,"y":7},{"x":52,"y":7},{"x":52,"y":93},{"x":5,"y":93}],"path":[]}',0.18,1),
('mesa_civic','mesa_centro','Mesa Civic Quarter','civic','{"center":{"x":75,"y":50},"polygon":[{"x":52,"y":7},{"x":95,"y":7},{"x":95,"y":93},{"x":52,"y":93}],"path":[]}',0.06,2),
('mesa_trailer_park','mesa_outskirts','Sunstone Trailer Park','residential','{"center":{"x":29,"y":50},"polygon":[{"x":5,"y":7},{"x":52,"y":7},{"x":52,"y":93},{"x":5,"y":93}],"path":[]}',0.20,1),
('mesa_route_68','mesa_outskirts','Route 68 Strip','commercial','{"center":{"x":75,"y":50},"polygon":[{"x":52,"y":7},{"x":95,"y":7},{"x":95,"y":93},{"x":52,"y":93}],"path":[]}',0.14,2),
('mesa_works_yard','mesa_industry','Mesa Works Yard','industrial','{"center":{"x":29,"y":50},"polygon":[{"x":5,"y":7},{"x":52,"y":7},{"x":52,"y":93},{"x":5,"y":93}],"path":[]}',0.10,1),
('mesa_freight','mesa_industry','Red Freight Depot','transit','{"center":{"x":75,"y":50},"polygon":[{"x":52,"y":7},{"x":95,"y":7},{"x":95,"y":93},{"x":52,"y":93}],"path":[]}',0.05,2),
('puerto_plaza','puerto_old_town','Plaza del Cielo','mixed_use','{"center":{"x":29,"y":50},"polygon":[{"x":5,"y":7},{"x":52,"y":7},{"x":52,"y":93},{"x":5,"y":93}],"path":[]}',0.16,1),
('puerto_market','puerto_old_town','Puerto Market','commercial','{"center":{"x":75,"y":50},"polygon":[{"x":52,"y":7},{"x":95,"y":7},{"x":95,"y":93},{"x":52,"y":93}],"path":[]}',0.14,2),
('puerto_marina','puerto_coast','Cielo Marina','commercial','{"center":{"x":29,"y":50},"polygon":[{"x":5,"y":7},{"x":52,"y":7},{"x":52,"y":93},{"x":5,"y":93}],"path":[]}',0.10,1),
('puerto_fishermans_row','puerto_coast','Fisherman''s Row','mixed_use','{"center":{"x":75,"y":50},"polygon":[{"x":52,"y":7},{"x":95,"y":7},{"x":95,"y":93},{"x":52,"y":93}],"path":[]}',0.12,2),
('puerto_heights','puerto_north','Cielo Heights','residential','{"center":{"x":29,"y":50},"polygon":[{"x":5,"y":7},{"x":52,"y":7},{"x":52,"y":93},{"x":5,"y":93}],"path":[]}',0.16,1),
('puerto_cliffs','puerto_north','North Cliffs','residential','{"center":{"x":75,"y":50},"polygon":[{"x":52,"y":7},{"x":95,"y":7},{"x":95,"y":93},{"x":52,"y":93}],"path":[]}',0.12,2),
('arroyo_square','arroyo_village_core','Arroyo Square','mixed_use','{"center":{"x":29,"y":50},"polygon":[{"x":5,"y":7},{"x":52,"y":7},{"x":52,"y":93},{"x":5,"y":93}],"path":[]}',0.18,1),
('arroyo_homes','arroyo_village_core','Dry Creek Homes','residential','{"center":{"x":75,"y":50},"polygon":[{"x":52,"y":7},{"x":95,"y":7},{"x":95,"y":93},{"x":52,"y":93}],"path":[]}',0.20,2),
('arroyo_ranches','arroyo_farmland','Arroyo Ranches','residential','{"center":{"x":29,"y":50},"polygon":[{"x":5,"y":7},{"x":52,"y":7},{"x":52,"y":93},{"x":5,"y":93}],"path":[]}',0.18,1),
('arroyo_farms','arroyo_farmland','Drylands Farms','industrial','{"center":{"x":75,"y":50},"polygon":[{"x":52,"y":7},{"x":95,"y":7},{"x":95,"y":93},{"x":52,"y":93}],"path":[]}',0.12,2)
ON CONFLICT (id) DO UPDATE SET zone_id=EXCLUDED.zone_id,name=EXCLUDED.name,kind=EXCLUDED.kind,geometry=EXCLUDED.geometry,max_player_property_share=EXCLUDED.max_player_property_share,sort_order=EXCLUDED.sort_order;

WITH district_templates(district_id, street_a, street_b, street_c) AS (VALUES
('mesa_main_street','Dustfall Avenue','Coyote Street','Mesa Boulevard'),
('mesa_civic','Courthouse Road','Sheriff Way','Town Hall Lane'),
('mesa_trailer_park','Sunstone Road','Trailer Loop','Joshua Lane'),
('mesa_route_68','Route 68','Motel Row','Gasoline Alley'),
('mesa_works_yard','Quarry Road','Machine Street','Crusher Lane'),
('mesa_freight','Depot Road','Freight Loop','Rail Spur'),
('puerto_plaza','Cielo Avenue','Plaza Street','Mission Lane'),
('puerto_market','Market Road','Merchant Street','Harbor Gate'),
('puerto_marina','Marina Drive','Pier Road','Harborlight Way'),
('puerto_fishermans_row','Net Street','Boatworks Lane','Cannery Road'),
('puerto_heights','Cliffview Drive','North Terrace','Pine Crest Road'),
('puerto_cliffs','Lookout Road','Ocean Ridge','Beacon Lane'),
('arroyo_square','Dry Creek Road','Church Street','General Store Lane'),
('arroyo_homes','Cottonwood Road','Homestead Lane','Schoolhouse Street'),
('arroyo_ranches','Ranch Road','Corral Lane','Windmill Track'),
('arroyo_farms','Harvest Road','Silo Lane','Irrigation Way')
), streets AS (
  SELECT district_id, name, ord::int AS ord
  FROM district_templates,
  LATERAL unnest(ARRAY[street_a,street_b,street_c]) WITH ORDINALITY AS n(name,ord)
)
INSERT INTO world_streets (id,district_id,name,kind,geometry,max_properties_per_owner,sort_order)
SELECT district_id || '_street_' || ord,
       district_id,
       name,
       CASE ord WHEN 1 THEN 'road' WHEN 2 THEN 'street' ELSE 'avenue' END,
       CASE ord
         WHEN 1 THEN jsonb_build_object('center',jsonb_build_object('x',50,'y',30),'polygon','[]'::jsonb,'path',jsonb_build_array(jsonb_build_object('x',8,'y',30),jsonb_build_object('x',92,'y',30)))
         WHEN 2 THEN jsonb_build_object('center',jsonb_build_object('x',50,'y',58),'polygon','[]'::jsonb,'path',jsonb_build_array(jsonb_build_object('x',8,'y',58),jsonb_build_object('x',92,'y',58)))
         ELSE jsonb_build_object('center',jsonb_build_object('x',52,'y',50),'polygon','[]'::jsonb,'path',jsonb_build_array(jsonb_build_object('x',52,'y',10),jsonb_build_object('x',52,'y',90)))
       END,
       2,
       ord
FROM streets
ON CONFLICT (id) DO UPDATE SET district_id=EXCLUDED.district_id,name=EXCLUDED.name,kind=EXCLUDED.kind,geometry=EXCLUDED.geometry,max_properties_per_owner=EXCLUDED.max_properties_per_owner,sort_order=EXCLUDED.sort_order;

WITH outer_streets AS (
  SELECT id,district_id,name,sort_order FROM world_streets
  WHERE district_id IN (
    'mesa_main_street','mesa_civic','mesa_trailer_park','mesa_route_68','mesa_works_yard','mesa_freight',
    'puerto_plaza','puerto_market','puerto_marina','puerto_fishermans_row','puerto_heights','puerto_cliffs',
    'arroyo_square','arroyo_homes','arroyo_ranches','arroyo_farms'
  )
)
INSERT INTO world_street_segments (id,street_id,display_name,kind,geometry,playable,sort_order)
SELECT id || '_segment_1', id, name || ' · Block 1',
       CASE WHEN sort_order=3 THEN 'intersection' ELSE 'block' END,
       jsonb_build_object('center',jsonb_build_object('x',50,'y',CASE sort_order WHEN 1 THEN 30 WHEN 2 THEN 58 ELSE 50 END),'polygon','[]'::jsonb,'path','[]'::jsonb),
       false,
       1
FROM outer_streets
ON CONFLICT (id) DO UPDATE SET street_id=EXCLUDED.street_id,display_name=EXCLUDED.display_name,kind=EXCLUDED.kind,geometry=EXCLUDED.geometry,playable=EXCLUDED.playable,sort_order=EXCLUDED.sort_order;

-- Connect each district's three planned street segments so the map can show a coherent network.
WITH district_segments AS (
  SELECT s.district_id, seg.id, s.sort_order
  FROM world_streets s
  JOIN world_street_segments seg ON seg.street_id=s.id
  WHERE s.district_id IN (
    'mesa_main_street','mesa_civic','mesa_trailer_park','mesa_route_68','mesa_works_yard','mesa_freight',
    'puerto_plaza','puerto_market','puerto_marina','puerto_fishermans_row','puerto_heights','puerto_cliffs',
    'arroyo_square','arroyo_homes','arroyo_ranches','arroyo_farms'
  )
), pairs AS (
  SELECT a.id AS from_id,b.id AS to_id
  FROM district_segments a
  JOIN district_segments b ON b.district_id=a.district_id AND b.sort_order=a.sort_order+1
)
INSERT INTO world_street_connections (from_segment_id,to_segment_id,distance_meters,bidirectional,modes)
SELECT from_id,to_id,220,true,ARRAY['walk','car','taxi','bus']::text[] FROM pairs
ON CONFLICT (from_segment_id,to_segment_id) DO UPDATE SET distance_meters=EXCLUDED.distance_meters,bidirectional=EXCLUDED.bidirectional,modes=EXCLUDED.modes;

-- Populate every new district with recognizable world anchors. They are immediately selectable
-- on the existing interactive SVG map even before their dedicated gameplay services are authored.
WITH first_segment AS (
  SELECT DISTINCT ON (s.district_id) s.district_id, seg.id AS segment_id
  FROM world_streets s
  JOIN world_street_segments seg ON seg.street_id=s.id
  WHERE s.district_id IN (
    'mesa_main_street','mesa_civic','mesa_trailer_park','mesa_route_68','mesa_works_yard','mesa_freight',
    'puerto_plaza','puerto_market','puerto_marina','puerto_fishermans_row','puerto_heights','puerto_cliffs',
    'arroyo_square','arroyo_homes','arroyo_ranches','arroyo_farms'
  )
  ORDER BY s.district_id,s.sort_order
), parcel_templates(district_id,name,kind,ownable) AS (VALUES
('mesa_main_street','Mesa Roja General Store','commercial',true),
('mesa_civic','Mesa Roja Sheriff Station','emergency',false),
('mesa_trailer_park','Sunstone Community Lot','residential',true),
('mesa_route_68','Desert Fuel & Service','commercial',true),
('mesa_works_yard','Red Mesa Quarry','industrial',true),
('mesa_freight','Mesa Freight Depot','transport',false),
('puerto_plaza','Plaza del Cielo','park',false),
('puerto_market','Puerto Cielo Market Hall','commercial',true),
('puerto_marina','Cielo Marina Office','commercial',true),
('puerto_fishermans_row','Fishermen Cooperative','industrial',true),
('puerto_heights','Cielo Heights Apartments','residential',true),
('puerto_cliffs','North Cliffs Lookout','park',false),
('arroyo_square','Arroyo General Store','commercial',true),
('arroyo_homes','Arroyo Community School','civic',false),
('arroyo_ranches','Los Vientos Ranch','residential',true),
('arroyo_farms','Drylands Produce Cooperative','industrial',true)
)
INSERT INTO world_parcels (id,segment_id,name,kind,player_ownable,service_key,geometry,sort_order)
SELECT 'life_' || p.district_id,
       f.segment_id,
       p.name,
       p.kind,
       p.ownable,
       NULL,
       '{"center":{"x":50,"y":50},"polygon":[{"x":43,"y":42},{"x":57,"y":42},{"x":57,"y":58},{"x":43,"y":58}],"path":[]}'::jsonb,
       1
FROM parcel_templates p
JOIN first_segment f ON f.district_id=p.district_id
ON CONFLICT (id) DO UPDATE SET segment_id=EXCLUDED.segment_id,name=EXCLUDED.name,kind=EXCLUDED.kind,player_ownable=EXCLUDED.player_ownable,service_key=EXCLUDED.service_key,geometry=EXCLUDED.geometry,sort_order=EXCLUDED.sort_order;
