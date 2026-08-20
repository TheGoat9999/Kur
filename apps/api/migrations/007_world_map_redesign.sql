-- Rebuild the authored atlas geometry. 006 established the hierarchy; this migration
-- replaces placeholder overlapping polygons with non-overlapping geographic shapes.

UPDATE world_regions SET geometry = '{"center":{"x":50,"y":51},"polygon":[{"x":8,"y":11},{"x":22,"y":5},{"x":38,"y":7},{"x":54,"y":4},{"x":72,"y":8},{"x":86,"y":18},{"x":94,"y":34},{"x":92,"y":50},{"x":96,"y":64},{"x":89,"y":80},{"x":74,"y":91},{"x":56,"y":95},{"x":39,"y":92},{"x":24,"y":96},{"x":11,"y":86},{"x":5,"y":71},{"x":7,"y":55},{"x":3,"y":40},{"x":8,"y":25}],"path":[]}'::jsonb WHERE id='sol_dorado_region';

UPDATE world_settlements SET geometry = CASE id
  WHEN 'sol_dorado_city' THEN '{"center":{"x":39,"y":60},"polygon":[{"x":15,"y":36},{"x":37,"y":30},{"x":57,"y":39},{"x":61,"y":61},{"x":52,"y":82},{"x":29,"y":88},{"x":13,"y":76},{"x":10,"y":54}],"path":[]}'::jsonb
  WHEN 'mesa_roja' THEN '{"center":{"x":76,"y":67},"polygon":[{"x":66,"y":57},{"x":83,"y":55},{"x":89,"y":65},{"x":85,"y":78},{"x":72,"y":81},{"x":64,"y":72}],"path":[]}'::jsonb
  WHEN 'puerto_cielo' THEN '{"center":{"x":75,"y":23},"polygon":[{"x":65,"y":13},{"x":82,"y":10},{"x":89,"y":20},{"x":85,"y":32},{"x":71,"y":35},{"x":63,"y":27}],"path":[]}'::jsonb
  WHEN 'arroyo_seco' THEN '{"center":{"x":27,"y":20},"polygon":[{"x":18,"y":13},{"x":30,"y":10},{"x":37,"y":18},{"x":33,"y":29},{"x":22,"y":30},{"x":16,"y":23}],"path":[]}'::jsonb
  ELSE geometry END;

-- Sol Dorado City zones: deliberately tessellated with shared edges / gaps, never overlapping.
UPDATE world_zones SET geometry = CASE id
  WHEN 'beach' THEN '{"center":{"x":13,"y":29},"polygon":[{"x":1,"y":6},{"x":24,"y":6},{"x":27,"y":39},{"x":18,"y":52},{"x":1,"y":49}],"path":[]}'::jsonb
  WHEN 'downtown' THEN '{"center":{"x":43,"y":35},"polygon":[{"x":24,"y":20},{"x":57,"y":17},{"x":63,"y":48},{"x":42,"y":57},{"x":27,"y":39}],"path":[]}'::jsonb
  WHEN 'hills' THEN '{"center":{"x":64,"y":17},"polygon":[{"x":42,"y":1},{"x":78,"y":1},{"x":82,"y":26},{"x":63,"y":35},{"x":57,"y":17}],"path":[]}'::jsonb
  WHEN 'las_palmas' THEN '{"center":{"x":24,"y":69},"polygon":[{"x":18,"y":52},{"x":42,"y":57},{"x":48,"y":85},{"x":13,"y":89},{"x":1,"y":73},{"x":1,"y":49}],"path":[]}'::jsonb
  WHEN 'harbor' THEN '{"center":{"x":58,"y":72},"polygon":[{"x":42,"y":57},{"x":63,"y":48},{"x":74,"y":61},{"x":73,"y":89},{"x":48,"y":85}],"path":[]}'::jsonb
  WHEN 'industrial' THEN '{"center":{"x":80,"y":43},"polygon":[{"x":63,"y":28},{"x":90,"y":24},{"x":98,"y":55},{"x":74,"y":61},{"x":63,"y":48}],"path":[]}'::jsonb
  WHEN 'airport' THEN '{"center":{"x":86,"y":77},"polygon":[{"x":74,"y":61},{"x":98,"y":55},{"x":99,"y":92},{"x":73,"y":89}],"path":[]}'::jsonb
  WHEN 'mesa_core' THEN '{"center":{"x":50,"y":50},"polygon":[{"x":6,"y":10},{"x":92,"y":8},{"x":96,"y":70},{"x":61,"y":92},{"x":9,"y":82}],"path":[]}'::jsonb
  WHEN 'puerto_center' THEN '{"center":{"x":50,"y":50},"polygon":[{"x":7,"y":9},{"x":91,"y":8},{"x":95,"y":72},{"x":62,"y":93},{"x":8,"y":80}],"path":[]}'::jsonb
  WHEN 'arroyo_core' THEN '{"center":{"x":50,"y":50},"polygon":[{"x":6,"y":9},{"x":93,"y":8},{"x":95,"y":78},{"x":51,"y":93},{"x":6,"y":79}],"path":[]}'::jsonb
  ELSE geometry END;

-- District geometry is local to its selected zone. Multiple districts share one clean boundary.
UPDATE world_districts SET geometry = CASE id
  WHEN 'centro_financiero' THEN '{"center":{"x":29,"y":50},"polygon":[{"x":5,"y":8},{"x":53,"y":8},{"x":53,"y":92},{"x":5,"y":92}],"path":[]}'::jsonb
  WHEN 'civic_center' THEN '{"center":{"x":74,"y":50},"polygon":[{"x":53,"y":8},{"x":95,"y":8},{"x":95,"y":92},{"x":53,"y":92}],"path":[]}'::jsonb
  WHEN 'las_palmas_west' THEN '{"center":{"x":29,"y":50},"polygon":[{"x":5,"y":7},{"x":53,"y":7},{"x":53,"y":93},{"x":5,"y":93}],"path":[]}'::jsonb
  WHEN 'las_palmas_east' THEN '{"center":{"x":74,"y":50},"polygon":[{"x":53,"y":7},{"x":95,"y":7},{"x":95,"y":93},{"x":53,"y":93}],"path":[]}'::jsonb
  ELSE '{"center":{"x":50,"y":50},"polygon":[{"x":6,"y":8},{"x":94,"y":8},{"x":94,"y":92},{"x":6,"y":92}],"path":[]}'::jsonb END;

-- A believable local street network for the current playable district.
UPDATE world_streets SET geometry = CASE id
  WHEN 'market_street' THEN '{"center":{"x":51,"y":55},"polygon":[],"path":[{"x":8,"y":55},{"x":93,"y":55}]}'::jsonb
  WHEN 'cypress_avenue' THEN '{"center":{"x":42,"y":51},"polygon":[],"path":[{"x":42,"y":10},{"x":42,"y":91}]}'::jsonb
  WHEN 'mira_service_lane' THEN '{"center":{"x":72,"y":67},"polygon":[],"path":[{"x":55,"y":56},{"x":71,"y":68},{"x":91,"y":68}]}'::jsonb
  ELSE geometry END;

UPDATE world_street_segments SET geometry = CASE id
  WHEN 'market_block_3' THEN '{"center":{"x":65,"y":55},"polygon":[],"path":[{"x":43,"y":55},{"x":88,"y":55}]}'::jsonb
  WHEN 'cypress_corner' THEN '{"center":{"x":42,"y":55},"polygon":[],"path":[{"x":42,"y":30},{"x":42,"y":78}]}'::jsonb
  WHEN 'mira_alley' THEN '{"center":{"x":73,"y":68},"polygon":[],"path":[{"x":56,"y":56},{"x":71,"y":68},{"x":90,"y":68}]}'::jsonb
  ELSE geometry END;
