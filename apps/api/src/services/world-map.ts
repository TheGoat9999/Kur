import type { Pool, PoolClient } from 'pg';
import {
  WorldMapStateSchema,
  WorldMapTravelResultSchema,
  type WorldMapState,
  type WorldMapTravelResult
} from '@sol-dorado/contracts/world-map';
import { getStreetSpawnPosition } from '@sol-dorado/contracts/world-position';

type Queryable = Pool | PoolClient;

export interface CanonicalWorldLocation {
  region: string;
  settlement: string;
  zone: string;
  district: string;
  street: string;
  streetSegment: string;
}

export class WorldMapTravelError extends Error {
  constructor(public readonly code: string, public readonly status: number) { super(code); }
}

export async function getWorldMapState(db: Queryable, playerId: string): Promise<WorldMapState> {
  const [regions, settlements, zones, districts, streets, segments, connections, parcels, currentResult] = await Promise.all([
    db.query('SELECT id,name,geometry FROM world_regions ORDER BY sort_order,id'),
    db.query('SELECT id,region_id,name,kind,geometry FROM world_settlements ORDER BY sort_order,id'),
    db.query('SELECT id,settlement_id,name,kind,geometry FROM world_zones ORDER BY sort_order,id'),
    db.query('SELECT id,zone_id,name,kind,geometry,max_player_property_share FROM world_districts ORDER BY sort_order,id'),
    db.query('SELECT id,district_id,name,kind,geometry,max_properties_per_owner FROM world_streets ORDER BY sort_order,id'),
    db.query('SELECT id,street_id,display_name,kind,geometry,playable FROM world_street_segments ORDER BY sort_order,id'),
    db.query('SELECT from_segment_id,to_segment_id,distance_meters,bidirectional,modes FROM world_street_connections ORDER BY from_segment_id,to_segment_id'),
    db.query('SELECT id,segment_id,name,kind,player_ownable,service_key,geometry FROM world_parcels ORDER BY sort_order,id'),
    db.query({
      text: `
        SELECT r.id AS region_id,s.id AS settlement_id,z.id AS zone_id,d.id AS district_id,
               st.id AS street_id,seg.id AS segment_id
        FROM player_street_state ps
        JOIN world_street_segments seg ON seg.id = ps.current_segment_id
        JOIN world_streets st ON st.id = seg.street_id
        JOIN world_districts d ON d.id = st.district_id
        JOIN world_zones z ON z.id = d.zone_id
        JOIN world_settlements s ON s.id = z.settlement_id
        JOIN world_regions r ON r.id = s.region_id
        WHERE ps.player_id = $1
      `,
      values: [playerId]
    })
  ]);

  const current = currentResult.rows[0];
  if (!current) throw new Error('world_current_location_not_found');

  return WorldMapStateSchema.parse({
    regions: regions.rows.map(row => ({ id: row.id, name: row.name, geometry: row.geometry })),
    settlements: settlements.rows.map(row => ({ id: row.id, regionId: row.region_id, name: row.name, kind: row.kind, geometry: row.geometry })),
    zones: zones.rows.map(row => ({ id: row.id, settlementId: row.settlement_id, name: row.name, kind: row.kind, geometry: row.geometry })),
    districts: districts.rows.map(row => ({ id: row.id, zoneId: row.zone_id, name: row.name, kind: row.kind, maxPlayerPropertyShare: Number(row.max_player_property_share), geometry: row.geometry })),
    streets: streets.rows.map(row => ({ id: row.id, districtId: row.district_id, name: row.name, kind: row.kind, maxPropertiesPerOwner: Number(row.max_properties_per_owner), geometry: row.geometry })),
    segments: segments.rows.map(row => ({ id: row.id, streetId: row.street_id, displayName: row.display_name, kind: row.kind, playable: row.playable, geometry: row.geometry })),
    connections: connections.rows.map(row => ({ fromSegmentId: row.from_segment_id, toSegmentId: row.to_segment_id, distanceMeters: Number(row.distance_meters), bidirectional: row.bidirectional, modes: row.modes })),
    parcels: parcels.rows.map(row => ({ id: row.id, segmentId: row.segment_id, name: row.name, kind: row.kind, playerOwnable: row.player_ownable, serviceKey: row.service_key, geometry: row.geometry })),
    current: {
      regionId: current.region_id,
      settlementId: current.settlement_id,
      zoneId: current.zone_id,
      districtId: current.district_id,
      streetId: current.street_id,
      segmentId: current.segment_id
    }
  });
}

export async function travelFromWorldMap(db: Pool, playerId: string, destinationSegmentId: string): Promise<WorldMapTravelResult> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const progressResult = await client.query(
      'SELECT current_segment_id, visited_segment_ids FROM player_street_state WHERE player_id = $1 FOR UPDATE',
      [playerId]
    );
    const progress = progressResult.rows[0];
    if (!progress) throw new WorldMapTravelError('world_current_location_not_found', 404);
    const currentSegmentId = String(progress.current_segment_id);
    if (currentSegmentId === destinationSegmentId) {
      await client.query('COMMIT');
      return WorldMapTravelResultSchema.parse({ segmentId: destinationSegmentId, distanceMeters: 0, energyCost: 0, hydrationCost: 0 });
    }

    const destinationResult = await client.query({
      text: `
        SELECT seg.id,seg.display_name,seg.playable,st.name AS street_name,
               d.name AS district_name,z.name AS zone_name,s.name AS settlement_name
        FROM world_street_segments seg
        JOIN world_streets st ON st.id = seg.street_id
        JOIN world_districts d ON d.id = st.district_id
        JOIN world_zones z ON z.id = d.zone_id
        JOIN world_settlements s ON s.id = z.settlement_id
        WHERE seg.id = $1
      `,
      values: [destinationSegmentId]
    });
    const destination = destinationResult.rows[0];
    if (!destination) throw new WorldMapTravelError('world_destination_not_found', 404);
    if (!destination.playable) throw new WorldMapTravelError('world_destination_not_playable', 409);

    const connectionResult = await client.query({
      text: `
        SELECT distance_meters
        FROM world_street_connections
        WHERE 'walk' = ANY(modes)
          AND (
            (from_segment_id = $1 AND to_segment_id = $2)
            OR (bidirectional = true AND from_segment_id = $2 AND to_segment_id = $1)
          )
        ORDER BY distance_meters
        LIMIT 1
      `,
      values: [currentSegmentId, destinationSegmentId]
    });
    const connection = connectionResult.rows[0];
    if (!connection) throw new WorldMapTravelError('world_map_route_unavailable', 409);

    const distanceMeters = Number(connection.distance_meters);
    const energyCost = Math.max(1, Math.ceil(distanceMeters / 90));
    const hydrationCost = Math.max(1, Math.ceil(distanceMeters / 180));
    const stateResult = await client.query('SELECT energy,hydration FROM player_state WHERE player_id = $1 FOR UPDATE', [playerId]);
    const state = stateResult.rows[0];
    if (!state) throw new WorldMapTravelError('player_not_found', 404);
    if (Number(state.energy) < energyCost) throw new WorldMapTravelError('world_map_not_enough_energy', 409);

    await client.query({
      text: `
        UPDATE player_state
        SET version = version + 1,
            energy = GREATEST(0, energy - $2),
            hydration = GREATEST(0, hydration - $3),
            settlement = $4,
            zone = $5,
            district = $6,
            street_segment = $7,
            updated_at = now()
        WHERE player_id = $1
      `,
      values: [playerId, energyCost, hydrationCost, destination.settlement_name, destination.zone_name, destination.district_name, destination.display_name]
    });

    const spawn = getStreetSpawnPosition(destinationSegmentId as 'market_block_3' | 'cypress_corner' | 'mira_alley');
    const visited = Array.isArray(progress.visited_segment_ids) ? progress.visited_segment_ids.map(String) : [];
    if (!visited.includes(destinationSegmentId)) visited.push(destinationSegmentId);
    await client.query({
      text: `
        UPDATE player_street_state
        SET current_segment_id = $2,
            visited_segment_ids = $3,
            position_x = $4,
            position_y = $5,
            updated_at = now()
        WHERE player_id = $1
      `,
      values: [playerId, destinationSegmentId, visited, spawn.x, spawn.y]
    });

    await client.query('COMMIT');
    return WorldMapTravelResultSchema.parse({ segmentId: destinationSegmentId, distanceMeters, energyCost, hydrationCost });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getCanonicalWorldLocation(db: Queryable, segmentId: string): Promise<CanonicalWorldLocation | null> {
  const result = await db.query({
    text: `
      SELECT r.name AS region,s.name AS settlement,z.name AS zone,d.name AS district,
             st.name AS street,seg.display_name AS street_segment
      FROM world_street_segments seg
      JOIN world_streets st ON st.id = seg.street_id
      JOIN world_districts d ON d.id = st.district_id
      JOIN world_zones z ON z.id = d.zone_id
      JOIN world_settlements s ON s.id = z.settlement_id
      JOIN world_regions r ON r.id = s.region_id
      WHERE seg.id = $1
    `,
    values: [segmentId]
  });
  const row = result.rows[0];
  if (!row) return null;
  return { region: row.region, settlement: row.settlement, zone: row.zone, district: row.district, street: row.street, streetSegment: row.street_segment };
}
