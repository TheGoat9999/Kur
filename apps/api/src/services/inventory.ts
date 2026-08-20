import type { PoolClient } from 'pg';
import {
  InventoryStateSchema,
  type InventoryContainerKey,
  type InventoryState
} from '@sol-dorado/contracts';
import type { Database } from '../db.js';
import { getItemDefinition } from '../domain/items/index.js';

export class InventoryCommandError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
  }
}

const access: Record<InventoryContainerKey, { accessible: boolean; reason: string }> = {
  player: { accessible: true, reason: 'Carried by the player' },
  ground: { accessible: true, reason: 'Items at the current street segment' },
  home: { accessible: false, reason: 'Travel to Cypress Apartment to access this storage' },
  vehicle_trunk: { accessible: false, reason: 'Stand beside the active vehicle and unlock its trunk' }
};

export async function getInventoryState(db: Database | PoolClient, playerId: string): Promise<InventoryState> {
  const [containerResult, itemResult] = await Promise.all([
    db.query({
      text: `
        SELECT
          c.id,
          c.container_key,
          c.label,
          c.capacity_grams,
          c.slot_count,
          COALESCE(SUM(i.unit_weight_grams * i.quantity), 0) AS weight_grams
        FROM inventory_containers c
        LEFT JOIN inventory_items i ON i.container_id = c.id
        WHERE c.player_id = $1
        GROUP BY c.id
        ORDER BY CASE c.container_key
          WHEN 'player' THEN 0 WHEN 'ground' THEN 1 WHEN 'home' THEN 2 ELSE 3 END
      `,
      values: [playerId]
    }),
    db.query({
      text: `
        SELECT
          i.id,
          i.item_key,
          i.display_name,
          i.category,
          i.symbol,
          i.quantity,
          i.unit_weight_grams,
          i.stackable,
          i.slot_index,
          i.metadata,
          c.container_key
        FROM inventory_items i
        JOIN inventory_containers c ON c.id = i.container_id
        WHERE i.player_id = $1
        ORDER BY c.container_key, i.slot_index
      `,
      values: [playerId]
    })
  ]);

  const items = itemResult.rows.map(row => ({
    id: row.id,
    itemKey: row.item_key,
    displayName: row.display_name,
    category: row.category,
    symbol: row.symbol,
    quantity: row.quantity,
    unitWeightGrams: row.unit_weight_grams,
    stackable: row.stackable,
    slotIndex: row.slot_index,
    containerKey: row.container_key,
    metadata: row.metadata
  }));

  return InventoryStateSchema.parse({
    containers: containerResult.rows.map(row => {
      const key = row.container_key as InventoryContainerKey;
      return {
        key,
        label: row.label,
        capacityGrams: row.capacity_grams,
        weightGrams: Number(row.weight_grams),
        slotCount: row.slot_count,
        accessible: access[key].accessible,
        accessReason: access[key].reason,
        items: items.filter(item => item.containerKey === key)
      };
    }),
    selectedExternalKey: 'ground'
  });
}

function assertAccessible(key: InventoryContainerKey) {
  if (!access[key].accessible) throw new InventoryCommandError('inventory_container_not_accessible', 403);
}

export async function moveInventoryItem(
  db: Database,
  playerId: string,
  itemId: string,
  toContainerKey: InventoryContainerKey,
  requestedSlot?: number
): Promise<InventoryState> {
  assertAccessible(toContainerKey);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const sourceResult = await client.query({
      text: `
        SELECT i.*, c.container_key AS source_key, c.capacity_grams AS source_capacity
        FROM inventory_items i
        JOIN inventory_containers c ON c.id = i.container_id
        WHERE i.id = $1 AND i.player_id = $2
        FOR UPDATE OF i, c
      `,
      values: [itemId, playerId]
    });
    const source = sourceResult.rows[0];
    if (!source) throw new InventoryCommandError('inventory_item_not_found', 404);
    assertAccessible(source.source_key);

    const targetResult = await client.query({
      text: `SELECT * FROM inventory_containers WHERE player_id = $1 AND container_key = $2 FOR UPDATE`,
      values: [playerId, toContainerKey]
    });
    const target = targetResult.rows[0];
    if (!target) throw new InventoryCommandError('inventory_container_not_found', 404);

    let targetSlot = requestedSlot;
    if (targetSlot === undefined) {
      const occupiedResult = await client.query(
        'SELECT slot_index FROM inventory_items WHERE container_id = $1 ORDER BY slot_index',
        [target.id]
      );
      const occupied = new Set<number>(occupiedResult.rows.map(row => row.slot_index));
      targetSlot = Array.from({ length: target.slot_count }, (_, index) => index).find(index => !occupied.has(index));
    }
    if (targetSlot === undefined || targetSlot < 0 || targetSlot >= target.slot_count) {
      throw new InventoryCommandError('inventory_container_full', 409);
    }
    if (source.container_id === target.id && source.slot_index === targetSlot) {
      await client.query('COMMIT');
      return getInventoryState(db, playerId);
    }

    const occupiedResult = await client.query(
      'SELECT * FROM inventory_items WHERE container_id = $1 AND slot_index = $2 FOR UPDATE',
      [target.id, targetSlot]
    );
    const occupied = occupiedResult.rows[0];
    if (occupied) {
      if (source.stackable && occupied.stackable && source.item_key === occupied.item_key) {
        await client.query('UPDATE inventory_items SET quantity = quantity + $2, updated_at = now() WHERE id = $1', [occupied.id, source.quantity]);
        await client.query('DELETE FROM inventory_items WHERE id = $1', [source.id]);
        await client.query('COMMIT');
        return getInventoryState(db, playerId);
      }
      if (source.container_id !== target.id) {
        const weightsResult = await client.query({
          text: `
            SELECT container_id, COALESCE(SUM(unit_weight_grams * quantity), 0) AS weight_grams
            FROM inventory_items
            WHERE container_id = ANY($1::uuid[])
            GROUP BY container_id
          `,
          values: [[source.container_id, target.id]]
        });
        const weights = new Map<string, number>(weightsResult.rows.map(row => [row.container_id, Number(row.weight_grams)]));
        const sourceItemWeight = source.unit_weight_grams * source.quantity;
        const occupiedItemWeight = occupied.unit_weight_grams * occupied.quantity;
        const nextTargetWeight = (weights.get(target.id) ?? 0) - occupiedItemWeight + sourceItemWeight;
        const nextSourceWeight = (weights.get(source.container_id) ?? 0) - sourceItemWeight + occupiedItemWeight;
        if (nextTargetWeight > target.capacity_grams || nextSourceWeight > source.source_capacity) {
          throw new InventoryCommandError('inventory_capacity_exceeded', 409);
        }
      }
      await client.query('SET CONSTRAINTS inventory_slot_unique DEFERRED');
      await client.query(
        `UPDATE inventory_items
         SET container_id = CASE WHEN id = $1 THEN $3 ELSE $5 END,
             slot_index = CASE WHEN id = $1 THEN $4 ELSE $6 END,
             updated_at = now()
         WHERE id IN ($1, $2)`,
        [source.id, occupied.id, target.id, targetSlot, source.container_id, source.slot_index]
      );
      await client.query('COMMIT');
      return getInventoryState(db, playerId);
    }

    if (source.container_id !== target.id) {
      const weightResult = await client.query(
        'SELECT COALESCE(SUM(unit_weight_grams * quantity), 0) AS weight_grams FROM inventory_items WHERE container_id = $1',
        [target.id]
      );
      const nextWeight = Number(weightResult.rows[0].weight_grams) + source.unit_weight_grams * source.quantity;
      if (nextWeight > target.capacity_grams) throw new InventoryCommandError('inventory_capacity_exceeded', 409);
    }

    await client.query(
      'UPDATE inventory_items SET container_id = $2, slot_index = $3, updated_at = now() WHERE id = $1',
      [source.id, target.id, targetSlot]
    );
    await client.query('COMMIT');
    return getInventoryState(db, playerId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function splitInventoryItem(
  db: Database,
  playerId: string,
  itemId: string,
  quantity: number,
  requestedSlot?: number
): Promise<InventoryState> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const sourceResult = await client.query({
      text: `
        SELECT i.*, c.container_key, c.slot_count
        FROM inventory_items i
        JOIN inventory_containers c ON c.id = i.container_id
        WHERE i.id = $1 AND i.player_id = $2
        FOR UPDATE OF i, c
      `,
      values: [itemId, playerId]
    });
    const source = sourceResult.rows[0];
    if (!source) throw new InventoryCommandError('inventory_item_not_found', 404);
    assertAccessible(source.container_key);
    if (!source.stackable || source.quantity <= 1) throw new InventoryCommandError('inventory_item_not_splittable', 409);
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity >= source.quantity) {
      throw new InventoryCommandError('inventory_split_quantity_invalid', 400);
    }

    let targetSlot = requestedSlot;
    if (targetSlot === undefined) {
      const occupiedResult = await client.query(
        'SELECT slot_index FROM inventory_items WHERE container_id = $1 ORDER BY slot_index',
        [source.container_id]
      );
      const occupied = new Set<number>(occupiedResult.rows.map(row => row.slot_index));
      targetSlot = Array.from({ length: source.slot_count }, (_, index) => index).find(index => !occupied.has(index));
    }
    if (targetSlot === undefined || targetSlot < 0 || targetSlot >= source.slot_count) {
      throw new InventoryCommandError('inventory_container_full', 409);
    }

    const occupiedTarget = await client.query(
      'SELECT id FROM inventory_items WHERE container_id = $1 AND slot_index = $2 FOR UPDATE',
      [source.container_id, targetSlot]
    );
    if (occupiedTarget.rows[0]) throw new InventoryCommandError('inventory_slot_occupied', 409);

    await client.query(
      'UPDATE inventory_items SET quantity = quantity - $2, updated_at = now() WHERE id = $1',
      [source.id, quantity]
    );
    await client.query({
      text: `
        INSERT INTO inventory_items
          (player_id, container_id, item_key, display_name, category, symbol, quantity, unit_weight_grams, stackable, slot_index, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      values: [
        playerId,
        source.container_id,
        source.item_key,
        source.display_name,
        source.category,
        source.symbol,
        quantity,
        source.unit_weight_grams,
        source.stackable,
        targetSlot,
        source.metadata
      ]
    });
    await client.query('COMMIT');
    return getInventoryState(db, playerId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function useInventoryItem(db: Database, playerId: string, itemId: string): Promise<void> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const itemResult = await client.query({
      text: `
        SELECT i.* FROM inventory_items i
        JOIN inventory_containers c ON c.id = i.container_id
        WHERE i.id = $1 AND i.player_id = $2 AND c.container_key = 'player'
        FOR UPDATE OF i
      `,
      values: [itemId, playerId]
    });
    const item = itemResult.rows[0];
    if (!item) throw new InventoryCommandError('inventory_item_not_carried', 409);

    const definition = getItemDefinition(item.item_key);
    if (!definition || Object.keys(definition.useEffects).length === 0) {
      throw new InventoryCommandError('inventory_item_not_usable', 409);
    }
    const effect = definition.useEffects;

    await client.query({
      text: `
        UPDATE player_state
        SET health = GREATEST(0, LEAST(100, health + $2)),
            energy = GREATEST(0, LEAST(100, energy + $3)),
            satiety = GREATEST(0, LEAST(100, satiety + $4)),
            hydration = GREATEST(0, LEAST(100, hydration + $5)),
            stress = GREATEST(0, LEAST(100, stress + $6)),
            police_heat = GREATEST(0, LEAST(100, police_heat + $7)),
            version = version + 1,
            updated_at = now()
        WHERE player_id = $1
      `,
      values: [
        playerId,
        effect.health ?? 0,
        effect.energy ?? 0,
        effect.satiety ?? 0,
        effect.hydration ?? 0,
        effect.stress ?? 0,
        effect.policeHeat ?? 0
      ]
    });
    if (item.quantity === 1) await client.query('DELETE FROM inventory_items WHERE id = $1', [item.id]);
    else await client.query('UPDATE inventory_items SET quantity = quantity - 1, updated_at = now() WHERE id = $1', [item.id]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
