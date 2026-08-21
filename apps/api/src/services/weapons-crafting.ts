import type { PoolClient } from 'pg';
import {
  CraftingStateSchema,
  WeaponActionResultSchema,
  type CraftingRecipeState,
  type CraftingState,
  type WeaponAction,
  type WeaponActionResult,
  type WeaponRuntimeState
} from '@sol-dorado/contracts/weapons-crafting';
import type { Database } from '../db.js';
import { getItemDefinition } from '../domain/items/index.js';
import { CRAFTING_RECIPES, getCraftingRecipe, getWeaponSpec } from '../domain/weapons-crafting.js';
import { getInventoryState, InventoryCommandError } from './inventory.js';

function numericMetadata(metadata: unknown, key: string, fallback: number) {
  if (!metadata || typeof metadata !== 'object') return fallback;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function booleanMetadata(metadata: unknown, key: string, fallback = false) {
  if (!metadata || typeof metadata !== 'object') return fallback;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'boolean' ? value : fallback;
}

function weaponRuntime(metadata: unknown, magazineCapacity: number): WeaponRuntimeState {
  return {
    equipped: booleanMetadata(metadata, 'equipped'),
    loadedRounds: Math.max(0, Math.min(magazineCapacity, Math.floor(numericMetadata(metadata, 'loadedRounds', 0)))),
    magazineCapacity,
    condition: Math.max(0, Math.min(100, Math.round(numericMetadata(metadata, 'condition', 100))))
  };
}

async function carriedCounts(db: Database | PoolClient, playerId: string) {
  const result = await db.query({
    text: `
      SELECT i.item_key, SUM(i.quantity)::int AS quantity
      FROM inventory_items i
      JOIN inventory_containers c ON c.id = i.container_id
      WHERE i.player_id = $1 AND c.container_key = 'player'
      GROUP BY i.item_key
    `,
    values: [playerId]
  });
  return new Map<string, number>(result.rows.map(row => [row.item_key, Number(row.quantity)]));
}

export async function getCraftingState(db: Database | PoolClient, playerId: string): Promise<CraftingState> {
  const counts = await carriedCounts(db, playerId);
  const recipes: CraftingRecipeState[] = CRAFTING_RECIPES.map(recipe => {
    const owned: Record<string, number> = {};
    const missing: Array<{ itemKey: string; quantity: number }> = [];
    for (const ingredient of recipe.ingredients) {
      const quantity = counts.get(ingredient.itemKey) ?? 0;
      owned[ingredient.itemKey] = quantity;
      if (quantity < ingredient.quantity) missing.push({ itemKey: ingredient.itemKey, quantity: ingredient.quantity - quantity });
    }
    return { ...recipe, canCraft: missing.length === 0, owned, missing };
  });
  return CraftingStateSchema.parse({ recipes });
}

export async function runWeaponAction(
  db: Database,
  playerId: string,
  itemId: string,
  action: WeaponAction
): Promise<WeaponActionResult> {
  const client = await db.connect();
  let runtime: WeaponRuntimeState | null = null;
  let displayName = 'Weapon';
  try {
    await client.query('BEGIN');
    const itemResult = await client.query({
      text: `
        SELECT i.*
        FROM inventory_items i
        JOIN inventory_containers c ON c.id = i.container_id
        WHERE i.id = $1 AND i.player_id = $2 AND c.container_key = 'player'
        FOR UPDATE OF i
      `,
      values: [itemId, playerId]
    });
    const item = itemResult.rows[0];
    if (!item) throw new InventoryCommandError('inventory_item_not_carried', 409);
    displayName = item.display_name;
    const spec = getWeaponSpec(item.item_key);
    if (!spec) throw new InventoryCommandError('inventory_item_not_weapon', 409);

    const current = weaponRuntime(item.metadata, spec.magazineCapacity);
    let next = current;
    if (action === 'equip') {
      await client.query({
        text: `
          UPDATE inventory_items i
          SET metadata = COALESCE(i.metadata, '{}'::jsonb) || '{"equipped":false}'::jsonb,
              updated_at = now()
          FROM inventory_containers c
          WHERE i.container_id = c.id AND i.player_id = $1 AND c.container_key = 'player' AND i.category = 'weapon'
        `,
        values: [playerId]
      });
      next = { ...current, equipped: true };
    } else if (action === 'unequip') {
      next = { ...current, equipped: false };
    } else {
      if (!spec.ammoItemKey || spec.magazineCapacity <= 0) throw new InventoryCommandError('weapon_does_not_use_ammo', 409);
      const needed = Math.max(0, spec.magazineCapacity - current.loadedRounds);
      if (needed === 0) throw new InventoryCommandError('weapon_magazine_full', 409);
      const ammoResult = await client.query({
        text: `
          SELECT i.id, i.quantity
          FROM inventory_items i
          JOIN inventory_containers c ON c.id = i.container_id
          WHERE i.player_id = $1 AND c.container_key = 'player' AND i.item_key = $2
          ORDER BY i.slot_index
          FOR UPDATE OF i
        `,
        values: [playerId, spec.ammoItemKey]
      });
      const available = ammoResult.rows.reduce((sum, row) => sum + Number(row.quantity), 0);
      if (available <= 0) throw new InventoryCommandError('weapon_ammo_not_available', 409);
      let remaining = Math.min(needed, available);
      const loaded = remaining;
      for (const ammo of ammoResult.rows) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, Number(ammo.quantity));
        if (take === Number(ammo.quantity)) await client.query('DELETE FROM inventory_items WHERE id = $1', [ammo.id]);
        else await client.query('UPDATE inventory_items SET quantity = quantity - $2, updated_at = now() WHERE id = $1', [ammo.id, take]);
        remaining -= take;
      }
      next = { ...current, loadedRounds: current.loadedRounds + loaded };
    }

    const metadata = {
      ...(item.metadata ?? {}),
      equipped: next.equipped,
      loadedRounds: next.loadedRounds,
      condition: next.condition
    };
    await client.query(
      'UPDATE inventory_items SET metadata = $2::jsonb, updated_at = now() WHERE id = $1',
      [item.id, JSON.stringify(metadata)]
    );
    await client.query('COMMIT');
    runtime = next;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  if (!runtime) throw new InventoryCommandError('weapon_action_failed', 500);
  const inventory = await getInventoryState(db, playerId);
  const messages: Record<WeaponAction, string> = {
    equip: `${displayName} is ready for contextual world use.`,
    unequip: `${displayName} is no longer equipped.`,
    reload: `${displayName} was reloaded from carried compatible ammunition.`
  };
  return WeaponActionResultSchema.parse({
    inventory,
    weapon: runtime,
    notice: { title: action === 'reload' ? 'Reloaded' : action === 'equip' ? 'Equipped' : 'Unequipped', message: messages[action] }
  });
}

async function consumeIngredient(client: PoolClient, playerId: string, containerId: string, itemKey: string, quantity: number) {
  const result = await client.query({
    text: `SELECT id, quantity FROM inventory_items WHERE player_id = $1 AND container_id = $2 AND item_key = $3 ORDER BY slot_index FOR UPDATE`,
    values: [playerId, containerId, itemKey]
  });
  const available = result.rows.reduce((sum, row) => sum + Number(row.quantity), 0);
  if (available < quantity) throw new InventoryCommandError('crafting_missing_ingredients', 409);
  let remaining = quantity;
  for (const row of result.rows) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, Number(row.quantity));
    if (take === Number(row.quantity)) await client.query('DELETE FROM inventory_items WHERE id = $1', [row.id]);
    else await client.query('UPDATE inventory_items SET quantity = quantity - $2, updated_at = now() WHERE id = $1', [row.id, take]);
    remaining -= take;
  }
}

async function addCraftedOutput(client: PoolClient, playerId: string, container: any, itemKey: string, quantity: number) {
  const definition = getItemDefinition(itemKey);
  if (!definition) throw new InventoryCommandError('crafting_output_unknown', 500);
  const weightResult = await client.query('SELECT COALESCE(SUM(unit_weight_grams * quantity), 0) AS weight_grams FROM inventory_items WHERE container_id = $1', [container.id]);
  const nextWeight = Number(weightResult.rows[0].weight_grams) + definition.unitWeightGrams * quantity;
  if (nextWeight > Number(container.capacity_grams)) throw new InventoryCommandError('inventory_capacity_exceeded', 409);

  let remaining = quantity;
  if (definition.stackable) {
    const stacks = await client.query({
      text: 'SELECT id, quantity FROM inventory_items WHERE container_id = $1 AND item_key = $2 AND quantity < $3 ORDER BY slot_index FOR UPDATE',
      values: [container.id, itemKey, definition.maxStack]
    });
    for (const stack of stacks.rows) {
      if (remaining <= 0) break;
      const room = definition.maxStack - Number(stack.quantity);
      const add = Math.min(room, remaining);
      await client.query('UPDATE inventory_items SET quantity = quantity + $2, updated_at = now() WHERE id = $1', [stack.id, add]);
      remaining -= add;
    }
  }

  while (remaining > 0) {
    const occupiedResult = await client.query('SELECT slot_index FROM inventory_items WHERE container_id = $1 ORDER BY slot_index', [container.id]);
    const occupied = new Set<number>(occupiedResult.rows.map(row => Number(row.slot_index)));
    const slot = Array.from({ length: Number(container.slot_count) }, (_, index) => index).find(index => !occupied.has(index));
    if (slot === undefined) throw new InventoryCommandError('inventory_container_full', 409);
    const add = definition.stackable ? Math.min(definition.maxStack, remaining) : 1;
    const spec = getWeaponSpec(itemKey);
    const metadata = spec ? { condition: 100, equipped: false, loadedRounds: 0 } : {};
    await client.query({
      text: `
        INSERT INTO inventory_items
          (player_id, container_id, item_key, display_name, category, symbol, quantity, unit_weight_grams, stackable, slot_index, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
      `,
      values: [playerId, container.id, itemKey, definition.displayName, definition.category, '◈', add, definition.unitWeightGrams, definition.stackable, slot, JSON.stringify(metadata)]
    });
    remaining -= add;
  }
}

export async function craftInventoryRecipe(db: Database, playerId: string, recipeKey: string) {
  const recipe = getCraftingRecipe(recipeKey);
  if (!recipe) throw new InventoryCommandError('crafting_recipe_not_found', 404);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const containerResult = await client.query({
      text: `SELECT * FROM inventory_containers WHERE player_id = $1 AND container_key = 'player' FOR UPDATE`,
      values: [playerId]
    });
    const container = containerResult.rows[0];
    if (!container) throw new InventoryCommandError('inventory_container_not_found', 404);

    for (const ingredient of recipe.ingredients) {
      await consumeIngredient(client, playerId, container.id, ingredient.itemKey, ingredient.quantity);
    }
    await addCraftedOutput(client, playerId, container, recipe.outputItemKey, recipe.outputQuantity);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const [inventory, crafting] = await Promise.all([getInventoryState(db, playerId), getCraftingState(db, playerId)]);
  return {
    inventory,
    crafting,
    notice: { title: 'Crafting complete', message: `${recipe.displayName} was added to your carried inventory.` }
  };
}
