import { describe, expect, it } from 'vitest';
import { CraftingRecipeSchema, WeaponSpecSchema } from '@sol-dorado/contracts/weapons-crafting';
import { ITEM_BY_KEY } from '../src/domain/items/index.js';
import { CRAFTING_RECIPES, WEAPON_SPECS } from '../src/domain/weapons-crafting.js';

describe('weapons and crafting definitions', () => {
  it('defines a runtime spec for every firearm and valid compatible ammunition', () => {
    const firearms = [...ITEM_BY_KEY.values()].filter(item => item.category === 'weapon' && item.subcategory === 'firearm');
    expect(firearms.length).toBeGreaterThanOrEqual(10);
    for (const firearm of firearms) {
      const spec = WEAPON_SPECS[firearm.key];
      expect(spec, `${firearm.key} is missing a weapon spec`).toBeDefined();
      expect(() => WeaponSpecSchema.parse(spec)).not.toThrow();
      expect(spec.ammoItemKey).toBeTruthy();
      expect(ITEM_BY_KEY.has(spec.ammoItemKey!)).toBe(true);
      expect(spec.magazineCapacity).toBeGreaterThan(0);
    }
  });

  it('keeps melee weapons ammo-free and represented in runtime specs', () => {
    const melee = [...ITEM_BY_KEY.values()].filter(item => item.category === 'weapon' && item.subcategory === 'melee');
    expect(melee.length).toBeGreaterThanOrEqual(5);
    for (const weapon of melee) {
      const spec = WEAPON_SPECS[weapon.key];
      expect(spec).toBeDefined();
      expect(spec.ammoItemKey).toBeNull();
      expect(spec.magazineCapacity).toBe(0);
    }
  });

  it('ships craftable maintenance, ammo, parts and weapons using known catalog items', () => {
    expect(CRAFTING_RECIPES.length).toBeGreaterThanOrEqual(10);
    const categories = new Set(CRAFTING_RECIPES.map(recipe => recipe.category));
    expect(categories.size).toBeGreaterThanOrEqual(4);
    expect(categories.has('maintenance')).toBe(true);
    expect(categories.has('ammunition')).toBe(true);
    expect(categories.has('weapon_part')).toBe(true);
    expect(categories.has('weapon')).toBe(true);
    for (const recipe of CRAFTING_RECIPES) {
      expect(() => CraftingRecipeSchema.parse(recipe)).not.toThrow();
      expect(ITEM_BY_KEY.has(recipe.outputItemKey), `${recipe.key} has unknown output`).toBe(true);
      for (const ingredient of recipe.ingredients) {
        expect(ITEM_BY_KEY.has(ingredient.itemKey), `${recipe.key} has unknown ingredient ${ingredient.itemKey}`).toBe(true);
      }
    }
  });

  it('introduces abstract crafting components without real-world manufacturing detail', () => {
    expect(ITEM_BY_KEY.has('weapon_parts_kit')).toBe(true);
    expect(ITEM_BY_KEY.has('ammo_components_box')).toBe(true);
    expect(ITEM_BY_KEY.has('precision_hardware_pack')).toBe(true);
  });
});
