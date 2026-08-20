import type { Pool, PoolClient } from 'pg';
import {
  StreetStateSchema,
  WORLD_ACTION_IDS,
  type StreetFlags,
  type StreetSegmentId,
  type StreetState,
  type WorldActionId
} from '@sol-dorado/contracts';
import { StreetPositionResultSchema, type StreetPosition } from '@sol-dorado/contracts/world-position';
import { getActionAvailability, STREET_SEGMENTS } from '../domain/actions.js';
import type { RedisClient } from '../redis.js';

type Queryable = Pool | PoolClient;

export class WorldActionCommandError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(code);
  }
}

export interface StreetProgressRow {
  currentSegmentId: StreetSegmentId;
  visitedSegmentIds: StreetSegmentId[];
  flags: StreetFlags;
  position: StreetPosition;
}

export function worldCooldownKey(playerId: string, actionId: WorldActionId) {
  return `world:cooldown:${playerId}:${actionId}`;
}

export async function ensureStreetProgress(db: Queryable, playerId: string): Promise<void> {
  await db.query({
    text: `
      INSERT INTO player_street_state (player_id)
      VALUES ($1)
      ON CONFLICT (player_id) DO NOTHING
    `,
    values: [playerId]
  });
}

export async function lockStreetProgress(client: PoolClient, playerId: string): Promise<StreetProgressRow> {
  await ensureStreetProgress(client, playerId);
  const result = await client.query(
    'SELECT current_segment_id, visited_segment_ids, flags, position_x, position_y FROM player_street_state WHERE player_id = $1 FOR UPDATE',
    [playerId]
  );
  return mapProgressRow(result.rows[0]);
}

export async function getStreetPosition(db: Queryable, playerId: string) {
  await ensureStreetProgress(db, playerId);
  const result = await db.query(
    'SELECT current_segment_id, visited_segment_ids, flags, position_x, position_y FROM player_street_state WHERE player_id = $1',
    [playerId]
  );
  const progress = mapProgressRow(result.rows[0]);
  return StreetPositionResultSchema.parse({ segmentId: progress.currentSegmentId, position: progress.position });
}

export async function getStreetState(
  db: Queryable,
  redis: RedisClient,
  playerId: string
): Promise<StreetState> {
  await ensureStreetProgress(db, playerId);
  const result = await db.query(
    'SELECT current_segment_id, visited_segment_ids, flags, position_x, position_y FROM player_street_state WHERE player_id = $1',
    [playerId]
  );
  const progress = mapProgressRow(result.rows[0]);
  const now = Date.now();
  const cooldowns = await Promise.all(WORLD_ACTION_IDS.map(actionId => redis.pttl(worldCooldownKey(playerId, actionId))));
  const actionStates = WORLD_ACTION_IDS.map((actionId, index) => {
    const remainingMs = cooldowns[index] ?? -1;
    const cooldownEndsAt = remainingMs > 0 ? now + remainingMs : null;
    return {
      actionId,
      availability: getActionAvailability(progress, actionId, cooldownEndsAt, now),
      cooldownEndsAt: cooldownEndsAt === null ? null : new Date(cooldownEndsAt).toISOString()
    };
  });

  return StreetStateSchema.parse({
    currentSegmentId: progress.currentSegmentId,
    visitedSegmentIds: progress.visitedSegmentIds,
    visibleObjectIds: STREET_SEGMENTS[progress.currentSegmentId].visibleObjectIds,
    flags: progress.flags,
    actionStates
  });
}

export async function addStreetReward(
  client: PoolClient,
  playerId: string,
  reward: { itemKey: string; displayName: string; quantity: number }
): Promise<void> {
  const containerResult = await client.query(
    `SELECT * FROM inventory_containers WHERE player_id = $1 AND container_key = 'player' FOR UPDATE`,
    [playerId]
  );
  const container = containerResult.rows[0];
  if (!container) throw new WorldActionCommandError('inventory_container_not_found', 409);

  const unitWeightGrams = 180;
  const weightResult = await client.query(
    'SELECT COALESCE(SUM(unit_weight_grams * quantity), 0) AS weight_grams FROM inventory_items WHERE container_id = $1',
    [container.id]
  );
  const nextWeight = Number(weightResult.rows[0].weight_grams) + unitWeightGrams * reward.quantity;
  if (nextWeight > container.capacity_grams) throw new WorldActionCommandError('inventory_capacity_exceeded', 409);

  const stackResult = await client.query(
    `SELECT id FROM inventory_items
     WHERE container_id = $1 AND item_key = $2 AND stackable = true
     ORDER BY slot_index LIMIT 1 FOR UPDATE`,
    [container.id, reward.itemKey]
  );
  if (stackResult.rows[0]) {
    await client.query(
      'UPDATE inventory_items SET quantity = quantity + $2, updated_at = now() WHERE id = $1',
      [stackResult.rows[0].id, reward.quantity]
    );
    return;
  }

  const occupiedResult = await client.query(
    'SELECT slot_index FROM inventory_items WHERE container_id = $1 ORDER BY slot_index',
    [container.id]
  );
  const occupied = new Set<number>(occupiedResult.rows.map(row => row.slot_index));
  const slotIndex = Array.from({ length: container.slot_count }, (_, index) => index).find(index => !occupied.has(index));
  if (slotIndex === undefined) throw new WorldActionCommandError('inventory_container_full', 409);

  await client.query({
    text: `
      INSERT INTO inventory_items
        (player_id, container_id, item_key, display_name, category, symbol, quantity, unit_weight_grams, stackable, slot_index, metadata)
      VALUES ($1, $2, $3, $4, 'Material', 'PCB', $5, $6, true, $7, '{"source":"mira_alley_dumpster"}'::jsonb)
    `,
    values: [playerId, container.id, reward.itemKey, reward.displayName, reward.quantity, unitWeightGrams, slotIndex]
  });
}

function mapProgressRow(row: Record<string, unknown> | undefined): StreetProgressRow {
  if (!row) throw new WorldActionCommandError('street_state_not_found', 404);
  const rawFlags = (row.flags ?? {}) as Partial<StreetFlags>;
  return {
    currentSegmentId: row.current_segment_id as StreetSegmentId,
    visitedSegmentIds: row.visited_segment_ids as StreetSegmentId[],
    flags: {
      cornerStoreAlerted: rawFlags.cornerStoreAlerted === true,
      alleyTipKnown: rawFlags.alleyTipKnown === true
    },
    position: {
      x: Number(row.position_x ?? 50),
      y: Number(row.position_y ?? 57)
    }
  };
}
