import type { PoolClient } from 'pg';
import {
  VehicleStateSchema,
  VehicleTravelResultSchema,
  type VehicleState,
  type VehicleTravelResult,
  type VehicleWorldLocation,
  type VehicleWorldPosition
} from '@sol-dorado/contracts/vehicles';
import {
  StreetSpatialSegmentIdSchema,
  resolveStreetNavigationTarget,
  streetDistance
} from '@sol-dorado/contracts/world-position';
import { resolveWorldConnectionRoute, type WorldStreetConnection } from '@sol-dorado/contracts/world-map';
import type { Database } from '../db.js';

const DEALERSHIP_KEY = 'dorado_motors';
const DEALERSHIP_NAME = 'Dorado Motors';
const DEALERSHIP_SEGMENT_ID = 'cypress_corner';
const VEHICLE_INTERACTION_RADIUS = 14;
const VEHICLE_EXIT_CLEARANCE = 8;

const PARKING_SPOTS: Record<string, VehicleWorldPosition[]> = {
  market_block_3: [{ x: 25, y: 57 }, { x: 67, y: 57 }, { x: 82, y: 57 }],
  cypress_corner: [{ x: 24, y: 58 }, { x: 66, y: 58 }, { x: 82, y: 58 }],
  mira_alley: [{ x: 29, y: 61 }, { x: 66, y: 61 }, { x: 82, y: 61 }]
};

type Queryable = Database | PoolClient;

export class VehicleCommandError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
  }
}

function modelFromRow(row: Record<string, unknown>) {
  return {
    id: String(row.model_id),
    brand: String(row.brand),
    model: String(row.model),
    displayName: String(row.display_name),
    year: Number(row.year),
    vehicleClass: String(row.vehicle_class),
    reliability: Number(row.reliability),
    performance: Number(row.performance),
    comfort: Number(row.comfort),
    economy: Number(row.economy),
    cargoKg: Number(row.cargo_kg),
    tankLiters: Number(row.tank_liters)
  };
}

function locationFromRow(row: Record<string, unknown>, prefix: 'current' | 'parked' | 'dealer'): VehicleWorldLocation {
  return {
    region: String(row[`${prefix}_region_name`]),
    settlement: String(row[`${prefix}_settlement_name`]),
    zone: String(row[`${prefix}_zone_name`]),
    district: String(row[`${prefix}_district_name`]),
    street: String(row[`${prefix}_street_name`]),
    segment: String(row[`${prefix}_segment_name`])
  };
}

function parkingPosition(segmentId: string, ordinal = 0): VehicleWorldPosition {
  const spots = PARKING_SPOTS[segmentId];
  if (!spots?.length) return { x: 50, y: 58 };
  return spots[Math.abs(ordinal) % spots.length] ?? spots[0]!;
}

function distanceBetween(a: VehicleWorldPosition, b: VehicleWorldPosition) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Parked vehicle coordinates intentionally sit on the carriageway. A character must never
 * respawn at that same coordinate after leaving the vehicle because that places the player
 * inside the vehicle interaction hitbox and off the pedestrian navigation graph.
 */
export function resolveVehicleExitPosition(segmentId: string, parkedPosition: VehicleWorldPosition): VehicleWorldPosition {
  const parsed = StreetSpatialSegmentIdSchema.safeParse(segmentId);
  if (!parsed.success) return { x: Math.max(0, Math.min(100, parkedPosition.x)), y: Math.max(0, Math.min(100, parkedPosition.y + 10)) };

  const candidates: VehicleWorldPosition[] = [
    { x: parkedPosition.x, y: parkedPosition.y + 12 },
    { x: parkedPosition.x - 12, y: parkedPosition.y },
    { x: parkedPosition.x + 12, y: parkedPosition.y },
    { x: parkedPosition.x, y: parkedPosition.y - 12 }
  ];

  const walkable = candidates
    .map(candidate => resolveStreetNavigationTarget(parsed.data, candidate)?.position ?? null)
    .filter((candidate): candidate is VehicleWorldPosition => Boolean(candidate))
    .filter(candidate => streetDistance(candidate, parkedPosition) >= VEHICLE_EXIT_CLEARANCE)
    .sort((a, b) => streetDistance(a, candidates[0]!) - streetDistance(b, candidates[0]!));

  if (walkable[0]) return walkable[0];
  const fallback = resolveStreetNavigationTarget(parsed.data, candidates[0]!)?.position;
  return fallback ?? { x: parkedPosition.x, y: Math.max(0, Math.min(100, parkedPosition.y + 10)) };
}

export async function getVehicleState(db: Queryable, playerId: string): Promise<VehicleState> {
  const [currentResult, ownedResult, dealershipSegmentResult] = await Promise.all([
    db.query({
      text: `
        SELECT pss.current_segment_id,pss.position_x,pss.position_y,
               r.name AS current_region_name,s.name AS current_settlement_name,z.name AS current_zone_name,
               d.name AS current_district_name,st.name AS current_street_name,seg.display_name AS current_segment_name
        FROM player_street_state pss
        JOIN world_street_segments seg ON seg.id = pss.current_segment_id
        JOIN world_streets st ON st.id = seg.street_id
        JOIN world_districts d ON d.id = st.district_id
        JOIN world_zones z ON z.id = d.zone_id
        JOIN world_settlements s ON s.id = z.settlement_id
        JOIN world_regions r ON r.id = s.region_id
        WHERE pss.player_id = $1
      `,
      values: [playerId]
    }),
    db.query({
      text: `
        SELECT pv.*, vm.brand,vm.model,vm.display_name,vm.year,vm.vehicle_class,vm.reliability,
               vm.performance,vm.comfort,vm.economy,vm.cargo_kg,vm.tank_liters,
               r.name AS parked_region_name,s.name AS parked_settlement_name,z.name AS parked_zone_name,
               d.name AS parked_district_name,st.name AS parked_street_name,seg.display_name AS parked_segment_name,
               seg.display_name AS parked_display_name
        FROM player_vehicles pv
        JOIN vehicle_models vm ON vm.id = pv.model_id
        JOIN world_street_segments seg ON seg.id = pv.parked_segment_id
        JOIN world_streets st ON st.id = seg.street_id
        JOIN world_districts d ON d.id = st.district_id
        JOIN world_zones z ON z.id = d.zone_id
        JOIN world_settlements s ON s.id = z.settlement_id
        JOIN world_regions r ON r.id = s.region_id
        WHERE pv.player_id = $1
        ORDER BY pv.active DESC, pv.created_at DESC
      `,
      values: [playerId]
    }),
    db.query({
      text: `
        SELECT r.name AS dealer_region_name,s.name AS dealer_settlement_name,z.name AS dealer_zone_name,
               d.name AS dealer_district_name,st.name AS dealer_street_name,seg.display_name AS dealer_segment_name,
               seg.display_name
        FROM world_street_segments seg
        JOIN world_streets st ON st.id = seg.street_id
        JOIN world_districts d ON d.id = st.district_id
        JOIN world_zones z ON z.id = d.zone_id
        JOIN world_settlements s ON s.id = z.settlement_id
        JOIN world_regions r ON r.id = s.region_id
        WHERE seg.id = $1
      `,
      values: [DEALERSHIP_SEGMENT_ID]
    })
  ]);

  const current = currentResult.rows[0] as Record<string, unknown> | undefined;
  const currentSegmentId = current?.current_segment_id ? String(current.current_segment_id) : '';
  const currentPosition = current ? { x: Number(current.position_x), y: Number(current.position_y) } : null;
  const playerLocation = current ? locationFromRow(current, 'current') : null;
  const dealershipAccessible = currentSegmentId === DEALERSHIP_SEGMENT_ID;
  const stockResult = dealershipAccessible
    ? await db.query({
        text: `
          SELECT s.stock_key,s.price_cents,s.mileage_km,s.engine_condition,s.body_condition,s.tire_condition,
                 vm.id AS model_id,vm.brand,vm.model,vm.display_name,vm.year,vm.vehicle_class,vm.reliability,
                 vm.performance,vm.comfort,vm.economy,vm.cargo_kg,vm.tank_liters
          FROM dealership_vehicle_stock s
          JOIN vehicle_models vm ON vm.id = s.model_id
          WHERE s.dealership_key = $1 AND s.available = true
          ORDER BY s.price_cents, s.stock_key
        `,
        values: [DEALERSHIP_KEY]
      })
    : { rows: [] as Record<string, unknown>[] };

  const ownedVehicles = ownedResult.rows.map(row => {
    const parkedPosition = { x: Number(row.parked_position_x), y: Number(row.parked_position_y) };
    const atPlayerLocation = String(row.parked_segment_id) === currentSegmentId;
    const withinInteractionRange = Boolean(row.occupied) || Boolean(atPlayerLocation && currentPosition && distanceBetween(parkedPosition, currentPosition) <= VEHICLE_INTERACTION_RADIUS);
    return {
      id: row.id,
      model: modelFromRow(row),
      active: Boolean(row.active),
      fuelPercent: Number(row.fuel_percent),
      engineCondition: Number(row.engine_condition),
      bodyCondition: Number(row.body_condition),
      tireCondition: Number(row.tire_condition),
      mileageKm: Number(row.mileage_km),
      parkedSegmentId: String(row.parked_segment_id),
      parkedDisplayName: String(row.parked_display_name),
      parkedLocation: locationFromRow(row, 'parked'),
      parkedPosition,
      atPlayerLocation,
      withinInteractionRange,
      locked: Boolean(row.locked),
      occupied: Boolean(row.occupied),
      parkingKind: String(row.parking_kind)
    };
  });

  const dealerRow = dealershipSegmentResult.rows[0] as Record<string, unknown> | undefined;
  if (!dealerRow) throw new VehicleCommandError('vehicle_dealership_location_missing', 500);

  return VehicleStateSchema.parse({
    activeVehicleId: ownedVehicles.find(vehicle => vehicle.active)?.id ?? null,
    playerLocation,
    ownedVehicles,
    dealership: {
      key: DEALERSHIP_KEY,
      name: DEALERSHIP_NAME,
      segmentId: DEALERSHIP_SEGMENT_ID,
      segmentDisplayName: String(dealerRow.display_name ?? 'Cypress Avenue / Market Corner'),
      location: locationFromRow(dealerRow, 'dealer'),
      accessible: dealershipAccessible,
      stock: stockResult.rows.map(row => ({
        stockKey: String(row.stock_key),
        model: modelFromRow(row),
        priceCents: Number(row.price_cents),
        mileageKm: Number(row.mileage_km),
        engineCondition: Number(row.engine_condition),
        bodyCondition: Number(row.body_condition),
        tireCondition: Number(row.tire_condition)
      }))
    }
  });
}

export async function purchaseVehicle(db: Database, playerId: string, stockKey: string): Promise<VehicleState> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const locationResult = await client.query(
      'SELECT current_segment_id FROM player_street_state WHERE player_id = $1 FOR UPDATE',
      [playerId]
    );
    if (!locationResult.rows[0]) throw new VehicleCommandError('vehicle_player_location_missing', 404);
    if (String(locationResult.rows[0].current_segment_id) !== DEALERSHIP_SEGMENT_ID) {
      throw new VehicleCommandError('vehicle_dealership_not_accessible', 403);
    }

    const stockResult = await client.query({
      text: `
        SELECT s.*, vm.display_name
        FROM dealership_vehicle_stock s
        JOIN vehicle_models vm ON vm.id = s.model_id
        WHERE s.stock_key = $1 AND s.dealership_key = $2 AND s.available = true
        FOR UPDATE OF s
      `,
      values: [stockKey, DEALERSHIP_KEY]
    });
    const stock = stockResult.rows[0];
    if (!stock) throw new VehicleCommandError('vehicle_stock_not_available', 404);

    const stateResult = await client.query('SELECT cash_cents FROM player_state WHERE player_id = $1 FOR UPDATE', [playerId]);
    const player = stateResult.rows[0];
    if (!player) throw new VehicleCommandError('player_not_found', 404);
    if (Number(player.cash_cents) < Number(stock.price_cents)) throw new VehicleCommandError('vehicle_not_enough_cash', 409);

    const [ownedCountResult, parkedCountResult] = await Promise.all([
      client.query('SELECT COUNT(*)::int AS count FROM player_vehicles WHERE player_id = $1', [playerId]),
      client.query('SELECT COUNT(*)::int AS count FROM player_vehicles WHERE player_id = $1 AND parked_segment_id = $2', [playerId, DEALERSHIP_SEGMENT_ID])
    ]);
    const firstVehicle = Number(ownedCountResult.rows[0]?.count ?? 0) === 0;
    const spot = parkingPosition(DEALERSHIP_SEGMENT_ID, Number(parkedCountResult.rows[0]?.count ?? 0));

    await client.query({
      text: `
        UPDATE player_state
        SET cash_cents = cash_cents - $2, version = version + 1, updated_at = now()
        WHERE player_id = $1
      `,
      values: [playerId, Number(stock.price_cents)]
    });

    await client.query({
      text: `
        INSERT INTO player_vehicles
          (player_id,model_id,active,fuel_percent,engine_condition,body_condition,tire_condition,mileage_km,
           parked_segment_id,parked_position_x,parked_position_y,locked,occupied,parking_kind,purchased_from)
        VALUES ($1,$2,$3,72,$4,$5,$6,$7,$8,$9,$10,false,false,'dealership',$11)
      `,
      values: [
        playerId,
        stock.model_id,
        firstVehicle,
        stock.engine_condition,
        stock.body_condition,
        stock.tire_condition,
        stock.mileage_km,
        DEALERSHIP_SEGMENT_ID,
        spot.x,
        spot.y,
        DEALERSHIP_KEY
      ]
    });

    await client.query('UPDATE dealership_vehicle_stock SET available = false, updated_at = now() WHERE stock_key = $1', [stockKey]);
    await client.query({
      text: `
        INSERT INTO finance_ledger (player_id,entry_type,title,amount_cents,direction,detail)
        VALUES ($1,'cash','Vehicle purchase',$2,'out',$3)
      `,
      values: [playerId, Number(stock.price_cents), `${DEALERSHIP_NAME} · ${stock.display_name}`]
    });

    await client.query('COMMIT');
    return getVehicleState(db, playerId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function vehicleAction(
  db: Database,
  playerId: string,
  vehicleId: string,
  action: 'select' | 'enter' | 'exit' | 'lock' | 'unlock'
): Promise<VehicleState> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const [locationResult, vehicleResult] = await Promise.all([
      client.query('SELECT current_segment_id,position_x,position_y FROM player_street_state WHERE player_id = $1 FOR UPDATE', [playerId]),
      client.query('SELECT * FROM player_vehicles WHERE id = $1 AND player_id = $2 FOR UPDATE', [vehicleId, playerId])
    ]);
    const vehicle = vehicleResult.rows[0];
    if (!vehicle) throw new VehicleCommandError('vehicle_not_found', 404);
    const current = locationResult.rows[0];
    if (!current) throw new VehicleCommandError('vehicle_player_location_missing', 404);

    if (action !== 'exit') {
      const sameSegment = String(current.current_segment_id) === String(vehicle.parked_segment_id);
      if (!sameSegment) throw new VehicleCommandError('vehicle_not_at_player_location', 409);
      const distance = distanceBetween(
        { x: Number(current.position_x), y: Number(current.position_y) },
        { x: Number(vehicle.parked_position_x), y: Number(vehicle.parked_position_y) }
      );
      if (distance > VEHICLE_INTERACTION_RADIUS) throw new VehicleCommandError('vehicle_too_far', 409);
    }

    if (action === 'select') {
      await client.query('UPDATE player_vehicles SET active = false, occupied = false, updated_at = now() WHERE player_id = $1', [playerId]);
      await client.query('UPDATE player_vehicles SET active = true, updated_at = now() WHERE id = $1', [vehicleId]);
    } else if (action === 'enter') {
      if (vehicle.locked) throw new VehicleCommandError('vehicle_locked', 409);
      await client.query('UPDATE player_vehicles SET active = false, occupied = false, updated_at = now() WHERE player_id = $1', [playerId]);
      await client.query('UPDATE player_vehicles SET active = true, occupied = true, updated_at = now() WHERE id = $1', [vehicleId]);
    } else if (action === 'exit') {
      if (!vehicle.occupied) throw new VehicleCommandError('vehicle_not_occupied', 409);
      const parkedPosition = { x: Number(vehicle.parked_position_x), y: Number(vehicle.parked_position_y) };
      const exitPosition = resolveVehicleExitPosition(String(vehicle.parked_segment_id), parkedPosition);
      await client.query('UPDATE player_vehicles SET occupied = false, updated_at = now() WHERE id = $1', [vehicleId]);
      await client.query(
        'UPDATE player_street_state SET position_x = $2, position_y = $3, updated_at = now() WHERE player_id = $1',
        [playerId, exitPosition.x, exitPosition.y]
      );
    } else if (action === 'lock') {
      if (vehicle.occupied) throw new VehicleCommandError('vehicle_exit_before_locking', 409);
      await client.query('UPDATE player_vehicles SET locked = true, updated_at = now() WHERE id = $1', [vehicleId]);
    } else if (action === 'unlock') {
      await client.query('UPDATE player_vehicles SET locked = false, updated_at = now() WHERE id = $1', [vehicleId]);
    }

    await client.query('COMMIT');
    return getVehicleState(db, playerId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function travelWithVehicle(
  db: Database,
  playerId: string,
  vehicleId: string,
  destinationSegmentId: string
): Promise<VehicleTravelResult> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const [progressResult, vehicleResult] = await Promise.all([
      client.query('SELECT current_segment_id, visited_segment_ids FROM player_street_state WHERE player_id = $1 FOR UPDATE', [playerId]),
      client.query({
        text: `
          SELECT pv.*,vm.economy
          FROM player_vehicles pv
          JOIN vehicle_models vm ON vm.id = pv.model_id
          WHERE pv.id = $1 AND pv.player_id = $2
          FOR UPDATE OF pv
        `,
        values: [vehicleId, playerId]
      })
    ]);
    const progress = progressResult.rows[0];
    const vehicle = vehicleResult.rows[0];
    if (!progress) throw new VehicleCommandError('vehicle_player_location_missing', 404);
    if (!vehicle) throw new VehicleCommandError('vehicle_not_found', 404);
    const currentSegmentId = String(progress.current_segment_id);
    if (String(vehicle.parked_segment_id) !== currentSegmentId) throw new VehicleCommandError('vehicle_not_at_player_location', 409);
    if (!vehicle.active || !vehicle.occupied) throw new VehicleCommandError('vehicle_enter_before_driving', 409);
    if (vehicle.locked) throw new VehicleCommandError('vehicle_locked', 409);

    if (destinationSegmentId === currentSegmentId) {
      await client.query('COMMIT');
      return VehicleTravelResultSchema.parse({ segmentId: currentSegmentId, distanceMeters: 0, fuelCostPercent: 0, mileageAddedKm: 0, state: await getVehicleState(db, playerId) });
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
    if (!destination) throw new VehicleCommandError('vehicle_destination_not_found', 404);
    if (!destination.playable) throw new VehicleCommandError('vehicle_destination_not_playable', 409);

    const connectionResult = await client.query(`
      SELECT from_segment_id,to_segment_id,distance_meters,bidirectional,modes
      FROM world_street_connections
      WHERE 'car' = ANY(modes)
      ORDER BY from_segment_id,to_segment_id
    `);
    const connections: WorldStreetConnection[] = connectionResult.rows.map(row => ({
      fromSegmentId: String(row.from_segment_id),
      toSegmentId: String(row.to_segment_id),
      distanceMeters: Number(row.distance_meters),
      bidirectional: Boolean(row.bidirectional),
      modes: row.modes
    }));
    const route = resolveWorldConnectionRoute(connections, currentSegmentId, destinationSegmentId, 'car');
    if (!route) throw new VehicleCommandError('vehicle_route_unavailable', 409);

    const distanceMeters = route.distanceMeters;
    const economyFactor = Math.max(.55, (135 - Number(vehicle.economy)) / 100);
    const fuelCostPercent = Math.max(.5, Math.round((distanceMeters / 300) * economyFactor * 10) / 10);
    if (Number(vehicle.fuel_percent) < fuelCostPercent) throw new VehicleCommandError('vehicle_not_enough_fuel', 409);
    const mileageAddedKm = Math.round((distanceMeters / 1000) * 100) / 100;
    const storedMileageAdded = Math.max(1, Math.round(mileageAddedKm));
    const wear = Math.max(.05, distanceMeters / 6000);
    const parkedCountResult = await client.query(
      'SELECT COUNT(*)::int AS count FROM player_vehicles WHERE player_id = $1 AND parked_segment_id = $2 AND id <> $3',
      [playerId, destinationSegmentId, vehicleId]
    );
    const spot = parkingPosition(destinationSegmentId, Number(parkedCountResult.rows[0]?.count ?? 0));

    await client.query({
      text: `
        UPDATE player_vehicles
        SET parked_segment_id = $2,
            parked_position_x = $3,
            parked_position_y = $4,
            parking_kind = 'street',
            fuel_percent = GREATEST(0, fuel_percent - $5),
            mileage_km = mileage_km + $6,
            engine_condition = GREATEST(0, engine_condition - $7),
            tire_condition = GREATEST(0, tire_condition - $8),
            updated_at = now()
        WHERE id = $1
      `,
      values: [vehicleId, destinationSegmentId, spot.x, spot.y, fuelCostPercent, storedMileageAdded, wear * .45, wear]
    });

    await client.query({
      text: `
        UPDATE player_state
        SET version = version + 1,
            settlement = $2,
            zone = $3,
            district = $4,
            street_segment = $5,
            updated_at = now()
        WHERE player_id = $1
      `,
      values: [playerId, destination.settlement_name, destination.zone_name, destination.district_name, destination.display_name]
    });

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
      values: [playerId, destinationSegmentId, visited, spot.x, spot.y]
    });

    await client.query('COMMIT');
    return VehicleTravelResultSchema.parse({
      segmentId: destinationSegmentId,
      distanceMeters,
      fuelCostPercent,
      mileageAddedKm,
      state: await getVehicleState(db, playerId)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
