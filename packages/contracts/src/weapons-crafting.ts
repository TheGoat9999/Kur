import { z } from 'zod';
import { InventoryStateSchema } from './index.js';

export const WeaponAmmoTypeSchema = z.enum(['9mm', '45', 'revolver', 'shotgun', 'rifle']);
export const WeaponActionSchema = z.enum(['equip', 'unequip', 'reload']);

export const WeaponSpecSchema = z.object({
  itemKey: z.string().min(1),
  family: z.enum(['melee', 'pistol', 'revolver', 'smg', 'shotgun', 'rifle']),
  ammoItemKey: z.string().min(1).nullable(),
  ammoType: WeaponAmmoTypeSchema.nullable(),
  magazineCapacity: z.number().int().nonnegative().max(200),
  handling: z.enum(['light', 'standard', 'heavy']),
  rangeClass: z.enum(['melee', 'short', 'medium', 'long']),
  fireMode: z.enum(['melee', 'single', 'semi', 'automatic', 'pump']),
  conditionLossPerUse: z.number().int().nonnegative().max(10)
});

export const WeaponRuntimeStateSchema = z.object({
  equipped: z.boolean(),
  loadedRounds: z.number().int().nonnegative(),
  magazineCapacity: z.number().int().nonnegative(),
  condition: z.number().int().min(0).max(100)
});

export const WeaponActionRequestSchema = z.object({
  itemId: z.uuid(),
  action: WeaponActionSchema
});

export const WeaponActionResultSchema = z.object({
  inventory: InventoryStateSchema,
  weapon: WeaponRuntimeStateSchema,
  notice: z.object({
    title: z.string(),
    message: z.string()
  })
});

export const CraftingIngredientSchema = z.object({
  itemKey: z.string().min(1),
  quantity: z.number().int().positive()
});

export const CraftingRecipeSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]+$/),
  displayName: z.string().min(1),
  category: z.enum(['maintenance', 'weapon_part', 'ammunition', 'weapon', 'utility']),
  outputItemKey: z.string().min(1),
  outputQuantity: z.number().int().positive(),
  durationSeconds: z.number().int().nonnegative(),
  riskClass: z.enum(['standard', 'controlled', 'restricted']),
  ingredients: z.array(CraftingIngredientSchema).min(1)
});

export const CraftingRecipeStateSchema = CraftingRecipeSchema.extend({
  canCraft: z.boolean(),
  owned: z.record(z.string(), z.number().int().nonnegative()),
  missing: z.array(CraftingIngredientSchema)
});

export const CraftingStateSchema = z.object({
  recipes: z.array(CraftingRecipeStateSchema)
});

export const CraftingRequestSchema = z.object({
  recipeKey: z.string().regex(/^[a-z0-9_]+$/)
});

export const CraftingResultSchema = z.object({
  inventory: InventoryStateSchema,
  crafting: CraftingStateSchema,
  notice: z.object({
    title: z.string(),
    message: z.string()
  })
});

export type WeaponAmmoType = z.infer<typeof WeaponAmmoTypeSchema>;
export type WeaponAction = z.infer<typeof WeaponActionSchema>;
export type WeaponSpec = z.infer<typeof WeaponSpecSchema>;
export type WeaponRuntimeState = z.infer<typeof WeaponRuntimeStateSchema>;
export type WeaponActionResult = z.infer<typeof WeaponActionResultSchema>;
export type CraftingIngredient = z.infer<typeof CraftingIngredientSchema>;
export type CraftingRecipe = z.infer<typeof CraftingRecipeSchema>;
export type CraftingRecipeState = z.infer<typeof CraftingRecipeStateSchema>;
export type CraftingState = z.infer<typeof CraftingStateSchema>;
export type CraftingResult = z.infer<typeof CraftingResultSchema>;
