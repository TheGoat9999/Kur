-- Keep street identity unambiguous inside each district after the density expansion.
UPDATE world_streets SET name='Capital Avenue' WHERE id='centro_financiero_street_1';
UPDATE world_streets SET name='Constitution Avenue' WHERE id='civic_center_street_1';
UPDATE world_streets SET name='Dockmaster Road' WHERE id='harbor_east_street_1';
UPDATE world_streets SET name='Mesa Works Avenue' WHERE id='mesa_industrial_street_1';
UPDATE world_streets SET name='Sunset Boulevard' WHERE id='costa_azul_street_1';
UPDATE world_streets SET name='Crestline Drive' WHERE id='oro_hills_street_1';
UPDATE world_streets SET name='Terminal One Loop' WHERE id='dorado_airport_street_1';

UPDATE world_street_segments seg
SET display_name = st.name || ' / Main Segment'
FROM world_streets st
WHERE seg.street_id = st.id
  AND seg.id LIKE '%_street_%_segment_1';
