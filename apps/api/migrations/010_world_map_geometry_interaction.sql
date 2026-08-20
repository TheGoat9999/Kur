-- Refine world-map geometry after visual review.
-- Goals:
-- 1) remove box-like zone/district partitions;
-- 2) keep adjacent areas on shared borders instead of overlapping;
-- 3) preserve the existing canonical hierarchy and playable street IDs.

-- Sol Dorado City zones: irregular, shared-border partitions in settlement-local coordinates.
UPDATE world_zones SET geometry='{"center":{"x":13,"y":45},"polygon":[{"x":4,"y":10},{"x":21,"y":7},{"x":24,"y":24},{"x":22,"y":39},{"x":20,"y":52},{"x":18,"y":68},{"x":15,"y":82},{"x":7,"y":80},{"x":4,"y":54}],"path":[]}'::jsonb WHERE id='beach';
UPDATE world_zones SET geometry='{"center":{"x":41,"y":38},"polygon":[{"x":24,"y":24},{"x":43,"y":27},{"x":58,"y":24},{"x":61,"y":38},{"x":57,"y":52},{"x":41,"y":50},{"x":22,"y":39}],"path":[]}'::jsonb WHERE id='downtown';
UPDATE world_zones SET geometry='{"center":{"x":55,"y":15},"polygon":[{"x":21,"y":7},{"x":90,"y":5},{"x":92,"y":24},{"x":76,"y":26},{"x":58,"y":24},{"x":43,"y":27},{"x":24,"y":24}],"path":[]}'::jsonb WHERE id='hills';
UPDATE world_zones SET geometry='{"center":{"x":34,"y":66},"polygon":[{"x":22,"y":39},{"x":41,"y":50},{"x":39,"y":65},{"x":49,"y":82},{"x":18,"y":82},{"x":15,"y":82},{"x":18,"y":68},{"x":20,"y":52}],"path":[]}'::jsonb WHERE id='las_palmas';
UPDATE world_zones SET geometry='{"center":{"x":76,"y":40},"polygon":[{"x":58,"y":24},{"x":76,"y":26},{"x":92,"y":24},{"x":94,"y":47},{"x":89,"y":60},{"x":74,"y":58},{"x":57,"y":52},{"x":61,"y":38}],"path":[]}'::jsonb WHERE id='industrial';
UPDATE world_zones SET geometry='{"center":{"x":59,"y":67},"polygon":[{"x":41,"y":50},{"x":57,"y":52},{"x":74,"y":58},{"x":74,"y":82},{"x":49,"y":82},{"x":39,"y":65}],"path":[]}'::jsonb WHERE id='harbor';
UPDATE world_zones SET geometry='{"center":{"x":85,"y":77},"polygon":[{"x":74,"y":58},{"x":89,"y":60},{"x":96,"y":61},{"x":96,"y":94},{"x":74,"y":94},{"x":74,"y":82}],"path":[]}'::jsonb WHERE id='airport';

-- Downtown: irregular four-way partition with shared internal boundaries.
UPDATE world_districts SET geometry='{"center":{"x":27,"y":27},"polygon":[{"x":5,"y":6},{"x":48,"y":6},{"x":51,"y":22},{"x":47,"y":35},{"x":50,"y":49},{"x":30,"y":47},{"x":17,"y":51},{"x":5,"y":48}],"path":[]}'::jsonb WHERE id='centro_financiero';
UPDATE world_districts SET geometry='{"center":{"x":73,"y":27},"polygon":[{"x":48,"y":6},{"x":95,"y":6},{"x":95,"y":49},{"x":78,"y":46},{"x":62,"y":50},{"x":50,"y":49},{"x":47,"y":35},{"x":51,"y":22}],"path":[]}'::jsonb WHERE id='civic_center';
UPDATE world_districts SET geometry='{"center":{"x":27,"y":72},"polygon":[{"x":5,"y":48},{"x":17,"y":51},{"x":30,"y":47},{"x":50,"y":49},{"x":48,"y":66},{"x":53,"y":81},{"x":50,"y":94},{"x":5,"y":94}],"path":[]}'::jsonb WHERE id='old_market';
UPDATE world_districts SET geometry='{"center":{"x":73,"y":72},"polygon":[{"x":50,"y":49},{"x":62,"y":50},{"x":78,"y":46},{"x":95,"y":49},{"x":95,"y":94},{"x":50,"y":94},{"x":53,"y":81},{"x":48,"y":66}],"path":[]}'::jsonb WHERE id='arts_quarter';

-- Las Palmas: deliberately asymmetric partition; West remains the current playable district.
UPDATE world_districts SET geometry='{"center":{"x":26,"y":26},"polygon":[{"x":5,"y":6},{"x":45,"y":6},{"x":50,"y":19},{"x":47,"y":33},{"x":49,"y":47},{"x":33,"y":50},{"x":19,"y":46},{"x":5,"y":48}],"path":[]}'::jsonb WHERE id='las_palmas_north';
UPDATE world_districts SET geometry='{"center":{"x":74,"y":25},"polygon":[{"x":45,"y":6},{"x":95,"y":6},{"x":95,"y":45},{"x":79,"y":48},{"x":63,"y":45},{"x":49,"y":47},{"x":47,"y":33},{"x":50,"y":19}],"path":[]}'::jsonb WHERE id='las_palmas_central';
UPDATE world_districts SET geometry='{"center":{"x":27,"y":71},"polygon":[{"x":5,"y":48},{"x":19,"y":46},{"x":33,"y":50},{"x":49,"y":47},{"x":52,"y":63},{"x":48,"y":78},{"x":50,"y":94},{"x":5,"y":94}],"path":[]}'::jsonb WHERE id='las_palmas_west';
UPDATE world_districts SET geometry='{"center":{"x":74,"y":70},"polygon":[{"x":49,"y":47},{"x":63,"y":45},{"x":79,"y":48},{"x":95,"y":45},{"x":95,"y":94},{"x":50,"y":94},{"x":48,"y":78},{"x":52,"y":63}],"path":[]}'::jsonb WHERE id='las_palmas_east';

-- Harbor.
UPDATE world_districts SET geometry='{"center":{"x":27,"y":27},"polygon":[{"x":5,"y":6},{"x":52,"y":6},{"x":48,"y":20},{"x":53,"y":34},{"x":50,"y":48},{"x":34,"y":45},{"x":18,"y":49},{"x":5,"y":46}],"path":[]}'::jsonb WHERE id='harbor_west';
UPDATE world_districts SET geometry='{"center":{"x":74,"y":27},"polygon":[{"x":52,"y":6},{"x":95,"y":6},{"x":95,"y":47},{"x":80,"y":49},{"x":65,"y":46},{"x":50,"y":48},{"x":53,"y":34},{"x":48,"y":20}],"path":[]}'::jsonb WHERE id='harbor_east';
UPDATE world_districts SET geometry='{"center":{"x":27,"y":72},"polygon":[{"x":5,"y":46},{"x":18,"y":49},{"x":34,"y":45},{"x":50,"y":48},{"x":46,"y":65},{"x":51,"y":79},{"x":48,"y":94},{"x":5,"y":94}],"path":[]}'::jsonb WHERE id='marina_dorada';
UPDATE world_districts SET geometry='{"center":{"x":74,"y":72},"polygon":[{"x":50,"y":48},{"x":65,"y":46},{"x":80,"y":49},{"x":95,"y":47},{"x":95,"y":94},{"x":48,"y":94},{"x":51,"y":79},{"x":46,"y":65}],"path":[]}'::jsonb WHERE id='docklands';

-- Industrial.
UPDATE world_districts SET geometry='{"center":{"x":27,"y":27},"polygon":[{"x":5,"y":6},{"x":46,"y":6},{"x":51,"y":18},{"x":49,"y":31},{"x":53,"y":48},{"x":31,"y":46},{"x":20,"y":50},{"x":5,"y":45}],"path":[]}'::jsonb WHERE id='mesa_industrial';
UPDATE world_districts SET geometry='{"center":{"x":74,"y":27},"polygon":[{"x":46,"y":6},{"x":95,"y":6},{"x":95,"y":48},{"x":79,"y":45},{"x":64,"y":49},{"x":53,"y":48},{"x":49,"y":31},{"x":51,"y":18}],"path":[]}'::jsonb WHERE id='foundry_district';
UPDATE world_districts SET geometry='{"center":{"x":27,"y":72},"polygon":[{"x":5,"y":45},{"x":20,"y":50},{"x":31,"y":46},{"x":53,"y":48},{"x":49,"y":65},{"x":54,"y":80},{"x":50,"y":94},{"x":5,"y":94}],"path":[]}'::jsonb WHERE id='rail_yards';
UPDATE world_districts SET geometry='{"center":{"x":74,"y":72},"polygon":[{"x":53,"y":48},{"x":64,"y":49},{"x":79,"y":45},{"x":95,"y":48},{"x":95,"y":94},{"x":50,"y":94},{"x":54,"y":80},{"x":49,"y":65}],"path":[]}'::jsonb WHERE id='logistics_park';

-- Beach / coastal districts.
UPDATE world_districts SET geometry='{"center":{"x":27,"y":27},"polygon":[{"x":5,"y":6},{"x":50,"y":6},{"x":47,"y":19},{"x":52,"y":34},{"x":49,"y":47},{"x":31,"y":45},{"x":17,"y":50},{"x":5,"y":45}],"path":[]}'::jsonb WHERE id='costa_azul';
UPDATE world_districts SET geometry='{"center":{"x":74,"y":27},"polygon":[{"x":50,"y":6},{"x":95,"y":6},{"x":95,"y":46},{"x":80,"y":50},{"x":66,"y":46},{"x":49,"y":47},{"x":52,"y":34},{"x":47,"y":19}],"path":[]}'::jsonb WHERE id='boardwalk';
UPDATE world_districts SET geometry='{"center":{"x":27,"y":72},"polygon":[{"x":5,"y":45},{"x":17,"y":50},{"x":31,"y":45},{"x":49,"y":47},{"x":46,"y":64},{"x":51,"y":80},{"x":48,"y":94},{"x":5,"y":94}],"path":[]}'::jsonb WHERE id='oceanfront';
UPDATE world_districts SET geometry='{"center":{"x":74,"y":72},"polygon":[{"x":49,"y":47},{"x":66,"y":46},{"x":80,"y":50},{"x":95,"y":46},{"x":95,"y":94},{"x":48,"y":94},{"x":51,"y":80},{"x":46,"y":64}],"path":[]}'::jsonb WHERE id='marina_del_sol';

-- Hills.
UPDATE world_districts SET geometry='{"center":{"x":27,"y":27},"polygon":[{"x":5,"y":6},{"x":49,"y":6},{"x":53,"y":21},{"x":48,"y":34},{"x":50,"y":48},{"x":32,"y":51},{"x":18,"y":46},{"x":5,"y":49}],"path":[]}'::jsonb WHERE id='oro_hills';
UPDATE world_districts SET geometry='{"center":{"x":74,"y":27},"polygon":[{"x":49,"y":6},{"x":95,"y":6},{"x":95,"y":49},{"x":79,"y":46},{"x":63,"y":50},{"x":50,"y":48},{"x":48,"y":34},{"x":53,"y":21}],"path":[]}'::jsonb WHERE id='vista_heights';
UPDATE world_districts SET geometry='{"center":{"x":27,"y":72},"polygon":[{"x":5,"y":49},{"x":18,"y":46},{"x":32,"y":51},{"x":50,"y":48},{"x":47,"y":65},{"x":52,"y":79},{"x":49,"y":94},{"x":5,"y":94}],"path":[]}'::jsonb WHERE id='canyon_estates';
UPDATE world_districts SET geometry='{"center":{"x":74,"y":72},"polygon":[{"x":50,"y":48},{"x":63,"y":50},{"x":79,"y":46},{"x":95,"y":49},{"x":95,"y":94},{"x":49,"y":94},{"x":52,"y":79},{"x":47,"y":65}],"path":[]}'::jsonb WHERE id='observatory_heights';

-- Airport: one irregular terminal district over two gateway/cargo districts.
UPDATE world_districts SET geometry='{"center":{"x":51,"y":23},"polygon":[{"x":5,"y":6},{"x":95,"y":6},{"x":92,"y":34},{"x":77,"y":40},{"x":58,"y":37},{"x":39,"y":42},{"x":7,"y":37}],"path":[]}'::jsonb WHERE id='dorado_airport';
UPDATE world_districts SET geometry='{"center":{"x":28,"y":69},"polygon":[{"x":7,"y":37},{"x":39,"y":42},{"x":58,"y":37},{"x":52,"y":61},{"x":49,"y":94},{"x":5,"y":94}],"path":[]}'::jsonb WHERE id='airport_gateway';
UPDATE world_districts SET geometry='{"center":{"x":75,"y":68},"polygon":[{"x":58,"y":37},{"x":77,"y":40},{"x":92,"y":34},{"x":95,"y":94},{"x":49,"y":94},{"x":52,"y":61}],"path":[]}'::jsonb WHERE id='cargo_park';
