-- World map density pass: expand Sol Dorado City with non-overlapping zone/district partitions
-- and a much denser canonical street skeleton. Existing playable street segments remain unchanged.

UPDATE world_zones SET geometry = '{"center":{"x":12,"y":44},"polygon":[{"x":4,"y":12},{"x":22,"y":8},{"x":22,"y":48},{"x":18,"y":78},{"x":7,"y":78},{"x":4,"y":52}],"path":[]}'::jsonb WHERE id='beach';
UPDATE world_zones SET geometry = '{"center":{"x":40,"y":37},"polygon":[{"x":22,"y":24},{"x":58,"y":24},{"x":58,"y":50},{"x":22,"y":50}],"path":[]}'::jsonb WHERE id='downtown';
UPDATE world_zones SET geometry = '{"center":{"x":52,"y":14},"polygon":[{"x":22,"y":5},{"x":90,"y":5},{"x":90,"y":24},{"x":58,"y":24},{"x":22,"y":24}],"path":[]}'::jsonb WHERE id='hills';
UPDATE world_zones SET geometry = '{"center":{"x":35,"y":66},"polygon":[{"x":18,"y":50},{"x":52,"y":50},{"x":52,"y":82},{"x":18,"y":82}],"path":[]}'::jsonb WHERE id='las_palmas';
UPDATE world_zones SET geometry = '{"center":{"x":75,"y":39},"polygon":[{"x":58,"y":24},{"x":93,"y":24},{"x":93,"y":60},{"x":75,"y":60},{"x":75,"y":50},{"x":58,"y":50}],"path":[]}'::jsonb WHERE id='industrial';
UPDATE world_zones SET geometry = '{"center":{"x":63,"y":66},"polygon":[{"x":52,"y":50},{"x":75,"y":50},{"x":75,"y":82},{"x":52,"y":82}],"path":[]}'::jsonb WHERE id='harbor';
UPDATE world_zones SET geometry = '{"center":{"x":85,"y":78},"polygon":[{"x":75,"y":60},{"x":96,"y":60},{"x":96,"y":94},{"x":75,"y":94}],"path":[]}'::jsonb WHERE id='airport';

INSERT INTO world_districts (id, zone_id, name, kind, geometry, max_player_property_share, sort_order) VALUES
-- Downtown
('centro_financiero','downtown','Centro Financiero','commercial','{"center":{"x":27,"y":28},"polygon":[{"x":5,"y":7},{"x":50,"y":7},{"x":50,"y":50},{"x":5,"y":50}],"path":[]}',0.12,1),
('civic_center','downtown','Civic Center','civic','{"center":{"x":73,"y":28},"polygon":[{"x":50,"y":7},{"x":95,"y":7},{"x":95,"y":50},{"x":50,"y":50}],"path":[]}',0.05,2),
('old_market','downtown','Old Market','mixed_use','{"center":{"x":27,"y":72},"polygon":[{"x":5,"y":50},{"x":50,"y":50},{"x":50,"y":93},{"x":5,"y":93}],"path":[]}',0.15,3),
('arts_quarter','downtown','Arts Quarter','nightlife','{"center":{"x":73,"y":72},"polygon":[{"x":50,"y":50},{"x":95,"y":50},{"x":95,"y":93},{"x":50,"y":93}],"path":[]}',0.12,4),
-- Las Palmas
('las_palmas_north','las_palmas','Las Palmas North','residential','{"center":{"x":27,"y":26},"polygon":[{"x":5,"y":6},{"x":50,"y":6},{"x":50,"y":46},{"x":5,"y":46}],"path":[]}',0.15,1),
('las_palmas_central','las_palmas','Las Palmas Central','commercial','{"center":{"x":73,"y":26},"polygon":[{"x":50,"y":6},{"x":95,"y":6},{"x":95,"y":46},{"x":50,"y":46}],"path":[]}',0.14,2),
('las_palmas_west','las_palmas','Las Palmas West','mixed_use','{"center":{"x":27,"y":70},"polygon":[{"x":5,"y":46},{"x":50,"y":46},{"x":50,"y":94},{"x":5,"y":94}],"path":[]}',0.15,3),
('las_palmas_east','las_palmas','Las Palmas East','residential','{"center":{"x":73,"y":70},"polygon":[{"x":50,"y":46},{"x":95,"y":46},{"x":95,"y":94},{"x":50,"y":94}],"path":[]}',0.15,4),
-- Harbor
('harbor_west','harbor','Harbor West','mixed_use','{"center":{"x":27,"y":27},"polygon":[{"x":5,"y":6},{"x":50,"y":6},{"x":50,"y":48},{"x":5,"y":48}],"path":[]}',0.12,1),
('harbor_east','harbor','Harbor East','industrial','{"center":{"x":73,"y":27},"polygon":[{"x":50,"y":6},{"x":95,"y":6},{"x":95,"y":48},{"x":50,"y":48}],"path":[]}',0.10,2),
('marina_dorada','harbor','Marina Dorada','commercial','{"center":{"x":27,"y":72},"polygon":[{"x":5,"y":48},{"x":50,"y":48},{"x":50,"y":94},{"x":5,"y":94}],"path":[]}',0.10,3),
('docklands','harbor','Docklands','industrial','{"center":{"x":73,"y":72},"polygon":[{"x":50,"y":48},{"x":95,"y":48},{"x":95,"y":94},{"x":50,"y":94}],"path":[]}',0.08,4),
-- Industrial
('mesa_industrial','industrial','Mesa Industrial','industrial','{"center":{"x":27,"y":27},"polygon":[{"x":5,"y":6},{"x":50,"y":6},{"x":50,"y":48},{"x":5,"y":48}],"path":[]}',0.10,1),
('foundry_district','industrial','Foundry District','industrial','{"center":{"x":73,"y":27},"polygon":[{"x":50,"y":6},{"x":95,"y":6},{"x":95,"y":48},{"x":50,"y":48}],"path":[]}',0.10,2),
('rail_yards','industrial','Rail Yards','transit','{"center":{"x":27,"y":72},"polygon":[{"x":5,"y":48},{"x":50,"y":48},{"x":50,"y":94},{"x":5,"y":94}],"path":[]}',0.06,3),
('logistics_park','industrial','Logistics Park','industrial','{"center":{"x":73,"y":72},"polygon":[{"x":50,"y":48},{"x":95,"y":48},{"x":95,"y":94},{"x":50,"y":94}],"path":[]}',0.10,4),
-- Beach
('costa_azul','beach','Costa Azul','nightlife','{"center":{"x":27,"y":27},"polygon":[{"x":5,"y":6},{"x":50,"y":6},{"x":50,"y":48},{"x":5,"y":48}],"path":[]}',0.10,1),
('boardwalk','beach','Dorado Boardwalk','commercial','{"center":{"x":73,"y":27},"polygon":[{"x":50,"y":6},{"x":95,"y":6},{"x":95,"y":48},{"x":50,"y":48}],"path":[]}',0.08,2),
('oceanfront','beach','Oceanfront','residential','{"center":{"x":27,"y":72},"polygon":[{"x":5,"y":48},{"x":50,"y":48},{"x":50,"y":94},{"x":5,"y":94}],"path":[]}',0.12,3),
('marina_del_sol','beach','Marina del Sol','mixed_use','{"center":{"x":73,"y":72},"polygon":[{"x":50,"y":48},{"x":95,"y":48},{"x":95,"y":94},{"x":50,"y":94}],"path":[]}',0.10,4),
-- Hills
('oro_hills','hills','Oro Hills','residential','{"center":{"x":27,"y":27},"polygon":[{"x":5,"y":6},{"x":50,"y":6},{"x":50,"y":48},{"x":5,"y":48}],"path":[]}',0.12,1),
('vista_heights','hills','Vista Heights','residential','{"center":{"x":73,"y":27},"polygon":[{"x":50,"y":6},{"x":95,"y":6},{"x":95,"y":48},{"x":50,"y":48}],"path":[]}',0.12,2),
('canyon_estates','hills','Canyon Estates','residential','{"center":{"x":27,"y":72},"polygon":[{"x":5,"y":48},{"x":50,"y":48},{"x":50,"y":94},{"x":5,"y":94}],"path":[]}',0.10,3),
('observatory_heights','hills','Observatory Heights','civic','{"center":{"x":73,"y":72},"polygon":[{"x":50,"y":48},{"x":95,"y":48},{"x":95,"y":94},{"x":50,"y":94}],"path":[]}',0.04,4),
-- Airport
('dorado_airport','airport','Dorado Airport','transit','{"center":{"x":50,"y":22},"polygon":[{"x":5,"y":6},{"x":95,"y":6},{"x":95,"y":40},{"x":5,"y":40}],"path":[]}',0.02,1),
('airport_gateway','airport','Airport Gateway','commercial','{"center":{"x":27,"y":68},"polygon":[{"x":5,"y":40},{"x":50,"y":40},{"x":50,"y":94},{"x":5,"y":94}],"path":[]}',0.08,2),
('cargo_park','airport','Dorado Cargo Park','industrial','{"center":{"x":73,"y":68},"polygon":[{"x":50,"y":40},{"x":95,"y":40},{"x":95,"y":94},{"x":50,"y":94}],"path":[]}',0.04,3)
ON CONFLICT (id) DO UPDATE SET zone_id=EXCLUDED.zone_id,name=EXCLUDED.name,kind=EXCLUDED.kind,geometry=EXCLUDED.geometry,max_player_property_share=EXCLUDED.max_player_property_share,sort_order=EXCLUDED.sort_order;

-- Add a dense but still structural street skeleton. These streets are map/navigation entities;
-- only authored street scenes are marked playable.
WITH templates(district_id, names) AS (VALUES
('centro_financiero', ARRAY['Grand Avenue','Bankers Row','Dorado Exchange Way','Prospect Street','Crown Boulevard','Tower Lane']),
('civic_center', ARRAY['Civic Boulevard','Justice Avenue','Union Street','Republic Way','Memorial Drive','City Hall Lane']),
('old_market', ARRAY['Mercantile Street','San Oro Avenue','Founders Lane','Arcade Street','Bellflower Road']),
('arts_quarter', ARRAY['Gallery Row','Theatre Avenue','Canvas Street','Orchid Way','Studio Lane']),
('las_palmas_north', ARRAY['Palmas Norte Avenue','Azalea Street','Cypress Ridge Road','Palm Terrace','Lucero Street']),
('las_palmas_central', ARRAY['Central Palmas Boulevard','Verde Avenue','Mercado Norte','Del Sol Street','Mission Road','Paseo Central']),
('las_palmas_west', ARRAY['Paloma Boulevard','Serrano Street','Juniper Avenue','Solano Road','Mariposa Drive','Mercado Lane','Orange Walk','Vista Street']),
('las_palmas_east', ARRAY['Carmela Avenue','East Palmas Road','Magnolia Street','Mirador Drive','Catalina Way']),
('harbor_west', ARRAY['Harbor Boulevard','Anchor Street','Pier Avenue','Mariner Way','Fisher Road']),
('harbor_east', ARRAY['Harbor Way','Dock Street','Pier Nine Road','Seafarer Avenue','Terminal Lane']),
('marina_dorada', ARRAY['Marina Promenade','Yacht Club Road','Seabreeze Avenue','Pelican Street','Dorado Quay']),
('docklands', ARRAY['Container Way','Docklands Road','Freight Street','Quayside Avenue','Customs Lane']),
('mesa_industrial', ARRAY['Foundry Road','Mesa Works Avenue','Boiler Street','Forge Lane','Industrial Boulevard']),
('foundry_district', ARRAY['Smelter Road','Ironworks Street','Foundry Avenue','Copper Lane','Kiln Road']),
('rail_yards', ARRAY['Railway Avenue','Depot Street','Switchyard Road','Freight Line','Signal Way']),
('logistics_park', ARRAY['Logistics Boulevard','Warehouse Row','Cargo Avenue','Distribution Road','Fleet Street']),
('costa_azul', ARRAY['Pacifica Boulevard','Azul Avenue','Sunset Street','Coral Way','Nightfall Road']),
('boardwalk', ARRAY['Boardwalk Avenue','Ocean Walk','Pier Street','Seashell Lane','Pacific Promenade']),
('oceanfront', ARRAY['Oceanfront Drive','Azure Street','Laguna Way','Coastal Avenue','Vista del Mar']),
('marina_del_sol', ARRAY['Marina del Sol Boulevard','Sailor Street','Harborlight Way','Regatta Road','Bayview Avenue']),
('oro_hills', ARRAY['Canyon Drive','Oro Crest Road','Summit Avenue','Laurel Lane','Ridge Street']),
('vista_heights', ARRAY['Vista Heights Drive','Panorama Road','Skyline Avenue','Eagle Crest','Belvedere Lane']),
('canyon_estates', ARRAY['Canyon Estates Road','Ravine Drive','Stonegate Avenue','Juniper Ridge','Mesa View']),
('observatory_heights', ARRAY['Observatory Road','Celestial Avenue','Summit Plaza','Telescope Way','Northstar Lane']),
('dorado_airport', ARRAY['Terminal Loop','Runway Service Road','Arrivals Way','Departures Avenue','Aviation Boulevard']),
('airport_gateway', ARRAY['Gateway Boulevard','Hotel Row','Rental Car Road','Airport Commerce Way','Traveler Street']),
('cargo_park', ARRAY['Cargo Loop','Airfreight Road','Hangar Avenue','Logistics Air Way','Ramp Service Lane'])
), expanded AS (
  SELECT district_id, name, ord::int AS ord
  FROM templates, unnest(names) WITH ORDINALITY AS n(name, ord)
), shaped AS (
  SELECT district_id,
         district_id || '_street_' || ord AS id,
         name,
         ord,
         CASE ord % 4 WHEN 1 THEN 'avenue' WHEN 2 THEN 'street' WHEN 3 THEN 'boulevard' ELSE 'road' END AS kind,
         CASE ord
           WHEN 1 THEN jsonb_build_object('center',jsonb_build_object('x',50,'y',18),'polygon','[]'::jsonb,'path',jsonb_build_array(jsonb_build_object('x',8,'y',18),jsonb_build_object('x',92,'y',18)))
           WHEN 2 THEN jsonb_build_object('center',jsonb_build_object('x',50,'y',36),'polygon','[]'::jsonb,'path',jsonb_build_array(jsonb_build_object('x',8,'y',36),jsonb_build_object('x',92,'y',36)))
           WHEN 3 THEN jsonb_build_object('center',jsonb_build_object('x',50,'y',64),'polygon','[]'::jsonb,'path',jsonb_build_array(jsonb_build_object('x',8,'y',64),jsonb_build_object('x',92,'y',64)))
           WHEN 4 THEN jsonb_build_object('center',jsonb_build_object('x',50,'y',82),'polygon','[]'::jsonb,'path',jsonb_build_array(jsonb_build_object('x',8,'y',82),jsonb_build_object('x',92,'y',82)))
           WHEN 5 THEN jsonb_build_object('center',jsonb_build_object('x',23,'y',50),'polygon','[]'::jsonb,'path',jsonb_build_array(jsonb_build_object('x',23,'y',8),jsonb_build_object('x',23,'y',92)))
           WHEN 6 THEN jsonb_build_object('center',jsonb_build_object('x',50,'y',50),'polygon','[]'::jsonb,'path',jsonb_build_array(jsonb_build_object('x',50,'y',8),jsonb_build_object('x',50,'y',92)))
           WHEN 7 THEN jsonb_build_object('center',jsonb_build_object('x',77,'y',50),'polygon','[]'::jsonb,'path',jsonb_build_array(jsonb_build_object('x',77,'y',8),jsonb_build_object('x',77,'y',92)))
           ELSE jsonb_build_object('center',jsonb_build_object('x',52,'y',52),'polygon','[]'::jsonb,'path',jsonb_build_array(jsonb_build_object('x',12,'y',84),jsonb_build_object('x',50,'y',52),jsonb_build_object('x',88,'y',20)))
         END AS geometry
  FROM expanded
)
INSERT INTO world_streets (id,district_id,name,kind,geometry,max_properties_per_owner,sort_order)
SELECT id,district_id,name,kind,geometry,2,20+ord
FROM shaped
ON CONFLICT (id) DO UPDATE SET district_id=EXCLUDED.district_id,name=EXCLUDED.name,kind=EXCLUDED.kind,geometry=EXCLUDED.geometry,sort_order=EXCLUDED.sort_order;

INSERT INTO world_street_segments (id,street_id,display_name,kind,geometry,playable,sort_order)
SELECT s.id || '_segment_1', s.id, s.name || ' / Main Segment',
       CASE WHEN s.kind='alley' THEN 'alley' WHEN s.kind='road' THEN 'road' ELSE 'block' END,
       s.geometry, false, 1
FROM world_streets s
WHERE s.id LIKE '%_street_%'
ON CONFLICT (id) DO UPDATE SET street_id=EXCLUDED.street_id,display_name=EXCLUDED.display_name,kind=EXCLUDED.kind,geometry=EXCLUDED.geometry,playable=EXCLUDED.playable,sort_order=EXCLUDED.sort_order;
