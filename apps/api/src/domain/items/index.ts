import { ItemCatalogSchema, type ItemCategory, type ItemDefinition } from '@sol-dorado/contracts/items';
import { PERSONAL_ITEMS } from './personal-items.js';
import { FOOD_ITEMS } from './food-items.js';
import { DRINK_ITEMS } from './drink-items.js';
import { TOOL_ITEMS } from './tool-items.js';
import { MATERIAL_ITEMS } from './material-items.js';
import { ELECTRONICS_ITEMS } from './electronics-items.js';
import { MEDICAL_ITEMS } from './medical-items.js';
import { WEAPON_ITEMS } from './weapon-items.js';

export const CORE_ITEM_CATALOG = ItemCatalogSchema.parse([
  ...PERSONAL_ITEMS,
  ...FOOD_ITEMS,
  ...DRINK_ITEMS,
  ...TOOL_ITEMS,
  ...MATERIAL_ITEMS,
  ...ELECTRONICS_ITEMS,
  ...MEDICAL_ITEMS,
  ...WEAPON_ITEMS
]);

const uniqueKeys = new Set(CORE_ITEM_CATALOG.map(item => item.key));
if (uniqueKeys.size !== CORE_ITEM_CATALOG.length) {
  throw new Error('Core item catalog contains duplicate item keys');
}

export const ITEM_BY_KEY: ReadonlyMap<string, ItemDefinition> = new Map(
  CORE_ITEM_CATALOG.map(item => [item.key, item])
);

/**
 * Keys used by the first inventory prototype before the 200-item catalog landed.
 * Keep these aliases so old development databases remain playable even before
 * the repair migration has been applied.
 */
export const LEGACY_ITEM_KEY_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  water: 'water_bottle',
  gloves: 'work_gloves'
});

export function resolveItemKey(itemKey: string): string {
  return LEGACY_ITEM_KEY_ALIASES[itemKey] ?? itemKey;
}

export const CORE_ITEM_CATEGORY_COUNTS: Readonly<Record<ItemCategory, number>> = Object.freeze(
  CORE_ITEM_CATALOG.reduce<Record<ItemCategory, number>>((counts, item) => {
    counts[item.category] += 1;
    return counts;
  }, {
    personal: 0,
    food: 0,
    drink: 0,
    tool: 0,
    material: 0,
    electronics: 0,
    medical: 0,
    weapon: 0
  })
);

export function getItemDefinition(itemKey: string): ItemDefinition | undefined {
  return ITEM_BY_KEY.get(resolveItemKey(itemKey));
}

export function findItems(options: { category?: ItemCategory; search?: string } = {}): ItemDefinition[] {
  const normalizedSearch = options.search?.trim().toLowerCase();
  return CORE_ITEM_CATALOG.filter(item => {
    if (options.category && item.category !== options.category) return false;
    if (!normalizedSearch) return true;
    return [item.key, item.displayName, item.subcategory, ...item.tags]
      .some(value => value.toLowerCase().includes(normalizedSearch));
  });
}
