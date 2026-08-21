CREATE TABLE IF NOT EXISTS world_regions (
  id text PRIMARY KEY,
  name text NOT NULL,
  geometry jsonb NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS world_settlements (
  id text PRIMARY KEY,
  region_id text NOT NULL REFERENCES world_regions(id),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('city', 'town', 'village')),
  geometry jsonb NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS world_zones (
  id text PRIMARY KEY,
  settlement_id text NOT NULL REFERENCES world_settlements(id),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('urban', 'industrial', 'coastal', 'airport', 'suburban', 'desert', 'rural')),
  geometry jsonb NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS world_districts (
  id text PRIMARY KEY,
  zone_id text NOT NULL REFERENCES world_zones(id),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('mixed_use', 'residential', 'commercial', 'civic', 'industrial', 'nightlife', 'transit')),
  geometry jsonb NOT NULL,
  max_player_property_share numeric(5,4) NOT NULL DEFAULT 0.15 CHECK (max_player_property_share BETWEEN 0 AND 1),
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS world_streets (
  id text PRIMARY KEY,
  district_id text NOT NULL REFERENCES world_districts(id),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('avenue', 'street', 'boulevard', 'alley', 'road', 'highway')),
  geometry jsonb NOT NULL,
  max_properties_per_owner integer NOT NULL DEFAULT 2 CHECK (max_properties_per_owner >= 0),
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS world_street_segments (
  id text PRIMARY KEY,
  street_id text NOT NULL REFERENCES world_streets(id),
  display_name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('block', 'intersection', 'alley', 'road')),
  geometry jsonb NOT NULL,
  playable boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS world_street_connections (
  from_segment_id text NOT NULL REFERENCES world_street_segments(id),
  to_segment_id text NOT NULL REFERENCES world_street_segments(id),
  distance_meters integer NOT NULL CHECK (distance_meters > 0),
  bidirectional boolean NOT NULL DEFAULT true,
  modes text[] NOT NULL,
  PRIMARY KEY (from_segment_id, to_segment_id),
  CHECK (from_segment_id <> to_segment_id)
);

CREATE TABLE IF NOT EXISTS world_parcels (
  id text PRIMARY KEY,
  segment_id text NOT NULL REFERENCES world_street_segments(id),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('residential', 'commercial', 'civic', 'emergency', 'transport', 'industrial', 'park', 'utility', 'parking')),
  player_ownable boolean NOT NULL DEFAULT false,
  service_key text,
  geometry jsonb NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS world_settlements_region ON world_settlements(region_id, sort_order);
CREATE INDEX IF NOT EXISTS world_zones_settlement ON world_zones(settlement_id, sort_order);
CREATE INDEX IF NOT EXISTS world_districts_zone ON world_districts(zone_id, sort_order);
CREATE INDEX IF NOT EXISTS world_streets_district ON world_streets(district_id, sort_order);
CREATE INDEX IF NOT EXISTS world_segments_street ON world_street_segments(street_id, sort_order);
CREATE INDEX IF NOT EXISTS world_parcels_segment ON world_parcels(segment_id, sort_order);

INSERT INTO world_regions (id, name, geometry, sort_order) VALUES
('sol_dorado_region', 'SOL DORADO', '{"center":{"x":50,"y":50},"polygon":[{"x":5,"y":10},{"x":82,"y":5},{"x":96,"y":40},{"x":82,"y":92},{"x":18,"y":96},{"x":3,"y":62}],"path":[]}', 1)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, geometry=EXCLUDED.geometry, sort_order=EXCLUDED.sort_order;

INSERT INTO world_settlements (id, region_id, name, kind, geometry, sort_order) VALUES
('sol_dorado_city','sol_dorado_region','Sol Dorado City','city','{"center":{"x":42,"y":56},"polygon":[{"x":12,"y":28},{"x":63,"y":20},{"x":75,"y":68},{"x":54,"y":86},{"x":18,"y":82},{"x":8,"y":52}],"path":[]}',1),
('mesa_roja','sol_dorado_region','Mesa Roja','town','{"center":{"x":79,"y":66},"polygon":[{"x":69,"y":54},{"x":90,"y":52},{"x":94,"y":73},{"x":81,"y":82},{"x":68,"y":74}],"path":[]}',2),
('puerto_cielo','sol_dorado_region','Puerto Cielo','town','{"center":{"x":72,"y":23},"polygon":[{"x":61,"y":11},{"x":84,"y":8},{"x":89,"y":29},{"x":77,"y":39},{"x":61,"y":32}],"path":[]}',3),
('arroyo_seco','sol_dorado_region','Arroyo Seco','village','{"center":{"x":25,"y":18},"polygon":[{"x":17,"y":11},{"x":31,"y":8},{"x":37,"y":19},{"x":28,"y":28},{"x":17,"y":24}],"path":[]}',4)
ON CONFLICT (id) DO UPDATE SET region_id=EXCLUDED.region_id,name=EXCLUDED.name,kind=EXCLUDED.kind,geometry=EXCLUDED.geometry,sort_order=EXCLUDED.sort_order;

INSERT INTO world_zones (id, settlement_id, name, kind, geometry, sort_order) VALUES
('downtown','sol_dorado_city','Downtown','urban','{"center":{"x":48,"y":40},"polygon":[{"x":30,"y":23},{"x":62,"y":19},{"x":69,"y":46},{"x":54,"y":57},{"x":31,"y":51}],"path":[]}',1),
('las_palmas','sol_dorado_city','Las Palmas','urban','{"center":{"x":29,"y":61},"polygon":[{"x":10,"y":45},{"x":34,"y":39},{"x":45,"y":67},{"x":33,"y":83},{"x":12,"y":78}],"path":[]}',2),
('harbor','sol_dorado_city','Harbor','coastal','{"center":{"x":56,"y":72},"polygon":[{"x":40,"y":58},{"x":67,"y":51},{"x":77,"y":79},{"x":57,"y":91},{"x":39,"y":82}],"path":[]}',3),
('industrial','sol_dorado_city','Industrial','industrial','{"center":{"x":72,"y":54},"polygon":[{"x":61,"y":37},{"x":84,"y":34},{"x":91,"y":61},{"x":78,"y":75},{"x":62,"y":66}],"path":[]}',4),
('beach','sol_dorado_city','Costa Dorada','coastal','{"center":{"x":19,"y":34},"polygon":[{"x":5,"y":18},{"x":24,"y":13},{"x":34,"y":40},{"x":22,"y":51},{"x":5,"y":45}],"path":[]}',5),
('hills','sol_dorado_city','Oro Hills','suburban','{"center":{"x":64,"y":20},"polygon":[{"x":47,"y":4},{"x":78,"y":3},{"x":87,"y":25},{"x":70,"y":38},{"x":51,"y":32}],"path":[]}',6),
('airport','sol_dorado_city','Dorado International','airport','{"center":{"x":84,"y":83},"polygon":[{"x":72,"y":72},{"x":95,"y":69},{"x":98,"y":94},{"x":75,"y":96}],"path":[]}',7),
('mesa_core','mesa_roja','Mesa Roja Center','desert','{"center":{"x":50,"y":48},"polygon":[{"x":18,"y":17},{"x":79,"y":12},{"x":90,"y":61},{"x":56,"y":87},{"x":14,"y":70}],"path":[]}',1),
('puerto_center','puerto_cielo','Puerto Cielo Center','coastal','{"center":{"x":48,"y":50},"polygon":[{"x":14,"y":14},{"x":83,"y":12},{"x":89,"y":66},{"x":57,"y":88},{"x":12,"y":72}],"path":[]}',1),
('arroyo_core','arroyo_seco','Arroyo Seco','rural','{"center":{"x":50,"y":50},"polygon":[{"x":12,"y":15},{"x":85,"y":11},{"x":90,"y":72},{"x":49,"y":91},{"x":10,"y":72}],"path":[]}',1)
ON CONFLICT (id) DO UPDATE SET settlement_id=EXCLUDED.settlement_id,name=EXCLUDED.name,kind=EXCLUDED.kind,geometry=EXCLUDED.geometry,sort_order=EXCLUDED.sort_order;

INSERT INTO world_districts (id, zone_id, name, kind, geometry, sort_order) VALUES
('centro_financiero','downtown','Centro Financiero','commercial','{"center":{"x":36,"y":48},"polygon":[{"x":8,"y":17},{"x":56,"y":10},{"x":65,"y":70},{"x":22,"y":87},{"x":5,"y":58}],"path":[]}',1),
('civic_center','downtown','Civic Center','civic','{"center":{"x":72,"y":51},"polygon":[{"x":55,"y":14},{"x":93,"y":17},{"x":96,"y":74},{"x":63,"y":87}],"path":[]}',2),
('las_palmas_west','las_palmas','Las Palmas West','mixed_use','{"center":{"x":35,"y":51},"polygon":[{"x":5,"y":10},{"x":58,"y":8},{"x":62,"y":89},{"x":10,"y":91}],"path":[]}',1),
('las_palmas_east','las_palmas','Las Palmas East','residential','{"center":{"x":77,"y":51},"polygon":[{"x":60,"y":8},{"x":95,"y":12},{"x":93,"y":90},{"x":62,"y":89}],"path":[]}',2),
('harbor_east','harbor','Harbor East','industrial','{"center":{"x":52,"y":50},"polygon":[{"x":8,"y":10},{"x":91,"y":9},{"x":92,"y":88},{"x":9,"y":91}],"path":[]}',1),
('mesa_industrial','industrial','Mesa Industrial','industrial','{"center":{"x":50,"y":50},"polygon":[{"x":8,"y":10},{"x":91,"y":9},{"x":92,"y":88},{"x":9,"y":91}],"path":[]}',1),
('costa_azul','beach','Costa Azul','nightlife','{"center":{"x":50,"y":50},"polygon":[{"x":8,"y":10},{"x":91,"y":9},{"x":92,"y":88},{"x":9,"y":91}],"path":[]}',1),
('oro_hills','hills','Oro Hills','residential','{"center":{"x":50,"y":50},"polygon":[{"x":8,"y":10},{"x":91,"y":9},{"x":92,"y":88},{"x":9,"y":91}],"path":[]}',1),
('dorado_airport','airport','Dorado Airport','transit','{"center":{"x":50,"y":50},"polygon":[{"x":8,"y":10},{"x":91,"y":9},{"x":92,"y":88},{"x":9,"y":91}],"path":[]}',1),
('mesa_roja_centro','mesa_core','Mesa Roja Centro','mixed_use','{"center":{"x":50,"y":50},"polygon":[{"x":8,"y":10},{"x":91,"y":9},{"x":92,"y":88},{"x":9,"y":91}],"path":[]}',1),
('puerto_cielo_centro','puerto_center','Puerto Cielo Centro','mixed_use','{"center":{"x":50,"y":50},"polygon":[{"x":8,"y":10},{"x":91,"y":9},{"x":92,"y":88},{"x":9,"y":91}],"path":[]}',1),
('arroyo_village','arroyo_core','Arroyo Village','residential','{"center":{"x":50,"y":50},"polygon":[{"x":8,"y":10},{"x":91,"y":9},{"x":92,"y":88},{"x":9,"y":91}],"path":[]}',1)
ON CONFLICT (id) DO UPDATE SET zone_id=EXCLUDED.zone_id,name=EXCLUDED.name,kind=EXCLUDED.kind,geometry=EXCLUDED.geometry,sort_order=EXCLUDED.sort_order;

INSERT INTO world_streets (id, district_id, name, kind, geometry, sort_order) VALUES
('market_street','las_palmas_west','Market Street','street','{"center":{"x":50,"y":54},"polygon":[],"path":[{"x":5,"y":54},{"x":95,"y":54}]}',1),
('cypress_avenue','las_palmas_west','Cypress Avenue','avenue','{"center":{"x":47,"y":46},"polygon":[],"path":[{"x":47,"y":8},{"x":47,"y":89}]}',2),
('mira_service_lane','las_palmas_west','Mira Service Lane','alley','{"center":{"x":72,"y":64},"polygon":[],"path":[{"x":58,"y":52},{"x":91,"y":78}]}',3),
('grand_avenue','centro_financiero','Grand Avenue','avenue','{"center":{"x":50,"y":50},"polygon":[],"path":[{"x":10,"y":68},{"x":92,"y":30}]}',1),
('civic_boulevard','civic_center','Civic Boulevard','boulevard','{"center":{"x":50,"y":50},"polygon":[],"path":[{"x":8,"y":52},{"x":94,"y":48}]}',1),
('harbor_way','harbor_east','Harbor Way','road','{"center":{"x":50,"y":50},"polygon":[],"path":[{"x":8,"y":72},{"x":92,"y":31}]}',1),
('foundry_road','mesa_industrial','Foundry Road','road','{"center":{"x":50,"y":50},"polygon":[],"path":[{"x":11,"y":30},{"x":90,"y":69}]}',1),
('pacifica_boulevard','costa_azul','Pacifica Boulevard','boulevard','{"center":{"x":50,"y":50},"polygon":[],"path":[{"x":10,"y":54},{"x":92,"y":49}]}',1),
('canyon_drive','oro_hills','Canyon Drive','road','{"center":{"x":50,"y":50},"polygon":[],"path":[{"x":15,"y":82},{"x":39,"y":45},{"x":84,"y":17}]}',1),
('airport_loop','dorado_airport','Airport Loop','road','{"center":{"x":50,"y":50},"polygon":[],"path":[{"x":15,"y":66},{"x":28,"y":25},{"x":78,"y":19},{"x":90,"y":61},{"x":60,"y":84},{"x":15,"y":66}]}',1),
('mesa_main_street','mesa_roja_centro','Mesa Main Street','street','{"center":{"x":50,"y":50},"polygon":[],"path":[{"x":8,"y":52},{"x":92,"y":48}]}',1),
('coast_highway','puerto_cielo_centro','Coast Highway','highway','{"center":{"x":50,"y":50},"polygon":[],"path":[{"x":14,"y":83},{"x":42,"y":46},{"x":87,"y":15}]}',1),
('arroyo_road','arroyo_village','Arroyo Road','road','{"center":{"x":50,"y":50},"polygon":[],"path":[{"x":10,"y":60},{"x":91,"y":41}]}',1)
ON CONFLICT (id) DO UPDATE SET district_id=EXCLUDED.district_id,name=EXCLUDED.name,kind=EXCLUDED.kind,geometry=EXCLUDED.geometry,sort_order=EXCLUDED.sort_order;

INSERT INTO world_street_segments (id, street_id, display_name, kind, geometry, playable, sort_order) VALUES
('market_block_3','market_street','Market Street / Block 3','block','{"center":{"x":52,"y":54},"polygon":[],"path":[{"x":25,"y":54},{"x":77,"y":54}]}',true,1),
('cypress_corner','cypress_avenue','Cypress Avenue / Market Corner','intersection','{"center":{"x":47,"y":54},"polygon":[],"path":[{"x":47,"y":31},{"x":47,"y":76}]}',true,1),
('mira_alley','mira_service_lane','Mira Service Alley','alley','{"center":{"x":73,"y":65},"polygon":[],"path":[{"x":60,"y":54},{"x":87,"y":76}]}',true,1),
('grand_avenue_central','grand_avenue','Grand Avenue / Central','block','{"center":{"x":50,"y":50},"polygon":[],"path":[{"x":25,"y":62},{"x":76,"y":39}]}',false,1),
('civic_center_plaza','civic_boulevard','Civic Boulevard / Plaza','block','{"center":{"x":50,"y":50},"polygon":[],"path":[{"x":26,"y":51},{"x":75,"y":49}]}',false,1),
('harbor_way_1','harbor_way','Harbor Way / Pier 1','road','{"center":{"x":50,"y":50},"polygon":[],"path":[{"x":25,"y":64},{"x":77,"y":39}]}',false,1),
('foundry_road_1','foundry_road','Foundry Road / Block 1','road','{"center":{"x":50,"y":50},"polygon":[],"path":[{"x":27,"y":38},{"x":75,"y":62}]}',false,1),
('pacifica_1','pacifica_boulevard','Pacifica Boulevard / Block 1','block','{"center":{"x":50,"y":50},"polygon":[],"path":[{"x":25,"y":52},{"x":76,"y":50}]}',false,1),
('canyon_1','canyon_drive','Canyon Drive / Lower Hills','road','{"center":{"x":50,"y":50},"polygon":[],"path":[{"x":29,"y":67},{"x":64,"y":34}]}',false,1),
('airport_loop_1','airport_loop','Airport Loop / Terminal','road','{"center":{"x":50,"y":50},"polygon":[],"path":[{"x":28,"y":65},{"x":67,"y":28}]}',false,1),
('mesa_main_1','mesa_main_street','Mesa Main Street / Center','block','{"center":{"x":50,"y":50},"polygon":[],"path":[{"x":25,"y":51},{"x":77,"y":49}]}',false,1),
('coast_highway_1','coast_highway','Coast Highway / Puerto Cielo','road','{"center":{"x":50,"y":50},"polygon":[],"path":[{"x":31,"y":69},{"x":70,"y":31}]}',false,1),
('arroyo_road_1','arroyo_road','Arroyo Road / Village','road','{"center":{"x":50,"y":50},"polygon":[],"path":[{"x":26,"y":56},{"x":76,"y":45}]}',false,1)
ON CONFLICT (id) DO UPDATE SET street_id=EXCLUDED.street_id,display_name=EXCLUDED.display_name,kind=EXCLUDED.kind,geometry=EXCLUDED.geometry,playable=EXCLUDED.playable,sort_order=EXCLUDED.sort_order;

INSERT INTO world_street_connections (from_segment_id,to_segment_id,distance_meters,bidirectional,modes) VALUES
('market_block_3','cypress_corner',140,true,ARRAY['walk','car','taxi','bus']),
('market_block_3','mira_alley',95,true,ARRAY['walk','car','taxi']),
('cypress_corner','mira_alley',120,true,ARRAY['walk','car','taxi'])
ON CONFLICT (from_segment_id,to_segment_id) DO UPDATE SET distance_meters=EXCLUDED.distance_meters,bidirectional=EXCLUDED.bidirectional,modes=EXCLUDED.modes;

INSERT INTO world_parcels (id,segment_id,name,kind,player_ownable,service_key,geometry,sort_order) VALUES
('mercado_24_parcel','market_block_3','Mercado 24','commercial',true,'corner_store','{"center":{"x":80,"y":24},"polygon":[{"x":72,"y":15},{"x":89,"y":15},{"x":89,"y":32},{"x":72,"y":32}],"path":[]}',1),
('el_camino_market','market_block_3','El Camino','commercial',true,'restaurant','{"center":{"x":20,"y":24},"polygon":[{"x":11,"y":15},{"x":29,"y":15},{"x":29,"y":32},{"x":11,"y":32}],"path":[]}',2),
('cypress_apartments_market','market_block_3','Cypress Apartments','residential',true,null,'{"center":{"x":50,"y":22},"polygon":[{"x":41,"y":14},{"x":59,"y":14},{"x":59,"y":31},{"x":41,"y":31}],"path":[]}',3),
('market_public_parking','market_block_3','Market Public Parking','parking',false,null,'{"center":{"x":52,"y":78},"polygon":[{"x":39,"y":70},{"x":65,"y":70},{"x":65,"y":86},{"x":39,"y":86}],"path":[]}',4),
('mira_service_yard','mira_alley','Mira Service Yard','industrial',true,null,'{"center":{"x":33,"y":45},"polygon":[{"x":20,"y":31},{"x":45,"y":31},{"x":45,"y":58},{"x":20,"y":58}],"path":[]}',1),
('cypress_pocket_park','cypress_corner','Cypress Pocket Park','park',false,null,'{"center":{"x":69,"y":28},"polygon":[{"x":59,"y":18},{"x":81,"y":18},{"x":81,"y":38},{"x":59,"y":38}],"path":[]}',1),
('central_police_precinct','civic_center_plaza','Sol Dorado Central Precinct','emergency',false,'police_precinct','{"center":{"x":35,"y":35},"polygon":[{"x":25,"y":24},{"x":45,"y":24},{"x":45,"y":46},{"x":25,"y":46}],"path":[]}',1),
('sol_dorado_medical','civic_center_plaza','Sol Dorado Medical Center','emergency',false,'hospital','{"center":{"x":67,"y":34},"polygon":[{"x":57,"y":23},{"x":78,"y":23},{"x":78,"y":46},{"x":57,"y":46}],"path":[]}',2),
('central_taxi_depot','grand_avenue_central','Dorado Taxi Central','transport',false,'taxi_depot','{"center":{"x":70,"y":70},"polygon":[{"x":60,"y":61},{"x":81,"y":61},{"x":81,"y":80},{"x":60,"y":80}],"path":[]}',1),
('foundry_auto_works','foundry_road_1','Foundry Auto Works','commercial',true,'mechanic','{"center":{"x":58,"y":38},"polygon":[{"x":48,"y":28},{"x":69,"y":28},{"x":69,"y":49},{"x":48,"y":49}],"path":[]}',1)
ON CONFLICT (id) DO UPDATE SET segment_id=EXCLUDED.segment_id,name=EXCLUDED.name,kind=EXCLUDED.kind,player_ownable=EXCLUDED.player_ownable,service_key=EXCLUDED.service_key,geometry=EXCLUDED.geometry,sort_order=EXCLUDED.sort_order;

UPDATE player_state
SET settlement='Sol Dorado City', zone='Las Palmas', district='Las Palmas West'
WHERE player_id IN (SELECT player_id FROM player_street_state);
