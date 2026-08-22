export interface RecipeLine {
  itemKey: string;
  quantity: number;
}

export interface RecipeDefinition {
  key: string;
  nameBg: string;
  nameEn: string;
  outputItemKey: string;
  outputQuantity: number;
  preparationMinutes: number;
  lines: readonly RecipeLine[];
}

export interface StockQuantity {
  itemKey: string;
  quantity: number;
}

export const PRODUCTION_RECIPES: readonly RecipeDefinition[] = Object.freeze([
  {
    key: 'dorado_classic_burger',
    nameBg: 'Dorado Classic',
    nameEn: 'Dorado Classic',
    outputItemKey: 'burger',
    outputQuantity: 1,
    preparationMinutes: 8,
    lines: [
      { itemKey: 'bread_loaf', quantity: 1 },
      { itemKey: 'raw_beef', quantity: 1 },
      { itemKey: 'cheese_block', quantity: 1 }
    ]
  },
  {
    key: 'dorado_double_burger',
    nameBg: 'Dorado Double',
    nameEn: 'Dorado Double',
    outputItemKey: 'double_burger',
    outputQuantity: 1,
    preparationMinutes: 11,
    lines: [
      { itemKey: 'bread_loaf', quantity: 1 },
      { itemKey: 'raw_beef', quantity: 2 },
      { itemKey: 'cheese_block', quantity: 1 }
    ]
  }
]);

export function missingRecipeStock(recipe: RecipeDefinition, stock: readonly StockQuantity[], batches = 1) {
  const quantities = new Map(stock.map(row => [row.itemKey, row.quantity]));
  return recipe.lines
    .map(line => ({ itemKey: line.itemKey, required: line.quantity * batches, available: quantities.get(line.itemKey) ?? 0 }))
    .filter(line => line.available < line.required);
}

export function consumeRecipeStock(recipe: RecipeDefinition, stock: readonly StockQuantity[], batches = 1): StockQuantity[] {
  if (!Number.isInteger(batches) || batches <= 0) throw new Error('invalid_batch_count');
  if (missingRecipeStock(recipe, stock, batches).length) throw new Error('insufficient_recipe_stock');
  const required = new Map(recipe.lines.map(line => [line.itemKey, line.quantity * batches]));
  return stock.map(row => ({ ...row, quantity: row.quantity - (required.get(row.itemKey) ?? 0) }));
}

export function calculatePreparedQuality(inputQuality: number, freshness: number, skillLevel: number) {
  const value = clamp(inputQuality, 0, 100) * 0.55 + clamp(freshness, 0, 100) * 0.3 + clamp(skillLevel, 0, 10) * 1.5;
  return Math.round(clamp(value, 1, 100));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
