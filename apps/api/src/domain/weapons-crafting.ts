import type { CraftingRecipe, WeaponSpec } from '@sol-dorado/contracts/weapons-crafting';

export const WEAPON_SPECS: Readonly<Record<string, WeaponSpec>> = Object.freeze({
  kitchen_knife: { itemKey: 'kitchen_knife', family: 'melee', ammoItemKey: null, ammoType: null, magazineCapacity: 0, handling: 'light', rangeClass: 'melee', fireMode: 'melee', conditionLossPerUse: 1 },
  pocket_knife: { itemKey: 'pocket_knife', family: 'melee', ammoItemKey: null, ammoType: null, magazineCapacity: 0, handling: 'light', rangeClass: 'melee', fireMode: 'melee', conditionLossPerUse: 1 },
  combat_knife: { itemKey: 'combat_knife', family: 'melee', ammoItemKey: null, ammoType: null, magazineCapacity: 0, handling: 'light', rangeClass: 'melee', fireMode: 'melee', conditionLossPerUse: 1 },
  baseball_bat: { itemKey: 'baseball_bat', family: 'melee', ammoItemKey: null, ammoType: null, magazineCapacity: 0, handling: 'standard', rangeClass: 'melee', fireMode: 'melee', conditionLossPerUse: 1 },
  baton: { itemKey: 'baton', family: 'melee', ammoItemKey: null, ammoType: null, magazineCapacity: 0, handling: 'light', rangeClass: 'melee', fireMode: 'melee', conditionLossPerUse: 1 },
  machete: { itemKey: 'machete', family: 'melee', ammoItemKey: null, ammoType: null, magazineCapacity: 0, handling: 'standard', rangeClass: 'melee', fireMode: 'melee', conditionLossPerUse: 1 },
  hatchet: { itemKey: 'hatchet', family: 'melee', ammoItemKey: null, ammoType: null, magazineCapacity: 0, handling: 'standard', rangeClass: 'melee', fireMode: 'melee', conditionLossPerUse: 1 },
  compact_pistol: { itemKey: 'compact_pistol', family: 'pistol', ammoItemKey: 'ammo_9mm', ammoType: '9mm', magazineCapacity: 10, handling: 'light', rangeClass: 'short', fireMode: 'semi', conditionLossPerUse: 1 },
  service_pistol: { itemKey: 'service_pistol', family: 'pistol', ammoItemKey: 'ammo_9mm', ammoType: '9mm', magazineCapacity: 15, handling: 'standard', rangeClass: 'short', fireMode: 'semi', conditionLossPerUse: 1 },
  revolver: { itemKey: 'revolver', family: 'revolver', ammoItemKey: 'ammo_revolver', ammoType: 'revolver', magazineCapacity: 6, handling: 'heavy', rangeClass: 'short', fireMode: 'single', conditionLossPerUse: 1 },
  machine_pistol: { itemKey: 'machine_pistol', family: 'pistol', ammoItemKey: 'ammo_9mm', ammoType: '9mm', magazineCapacity: 18, handling: 'standard', rangeClass: 'short', fireMode: 'automatic', conditionLossPerUse: 1 },
  compact_smg: { itemKey: 'compact_smg', family: 'smg', ammoItemKey: 'ammo_9mm', ammoType: '9mm', magazineCapacity: 24, handling: 'standard', rangeClass: 'short', fireMode: 'automatic', conditionLossPerUse: 1 },
  smg: { itemKey: 'smg', family: 'smg', ammoItemKey: 'ammo_45', ammoType: '45', magazineCapacity: 30, handling: 'standard', rangeClass: 'medium', fireMode: 'automatic', conditionLossPerUse: 1 },
  pump_shotgun: { itemKey: 'pump_shotgun', family: 'shotgun', ammoItemKey: 'shotgun_shells', ammoType: 'shotgun', magazineCapacity: 6, handling: 'heavy', rangeClass: 'short', fireMode: 'pump', conditionLossPerUse: 1 },
  carbine_rifle: { itemKey: 'carbine_rifle', family: 'rifle', ammoItemKey: 'rifle_ammo', ammoType: 'rifle', magazineCapacity: 30, handling: 'standard', rangeClass: 'medium', fireMode: 'automatic', conditionLossPerUse: 1 },
  assault_rifle: { itemKey: 'assault_rifle', family: 'rifle', ammoItemKey: 'rifle_ammo', ammoType: 'rifle', magazineCapacity: 30, handling: 'heavy', rangeClass: 'medium', fireMode: 'automatic', conditionLossPerUse: 1 },
  marksman_rifle: { itemKey: 'marksman_rifle', family: 'rifle', ammoItemKey: 'rifle_ammo', ammoType: 'rifle', magazineCapacity: 20, handling: 'heavy', rangeClass: 'long', fireMode: 'semi', conditionLossPerUse: 1 }
});

export const CRAFTING_RECIPES: readonly CraftingRecipe[] = Object.freeze([
  {
    key: 'weapon_cleaning_kit', displayName: 'Weapon Cleaning Kit', category: 'maintenance', outputItemKey: 'weapon_cleaning_kit', outputQuantity: 1,
    durationSeconds: 8, riskClass: 'standard', ingredients: [{ itemKey: 'cloth_scraps', quantity: 2 }, { itemKey: 'adhesive', quantity: 1 }]
  },
  {
    key: 'pistol_magazine', displayName: 'Pistol Magazine', category: 'weapon_part', outputItemKey: 'pistol_magazine', outputQuantity: 1,
    durationSeconds: 12, riskClass: 'controlled', ingredients: [{ itemKey: 'precision_hardware_pack', quantity: 1 }, { itemKey: 'aluminum_sheet', quantity: 1 }]
  },
  {
    key: 'rifle_magazine', displayName: 'Rifle Magazine', category: 'weapon_part', outputItemKey: 'rifle_magazine', outputQuantity: 1,
    durationSeconds: 14, riskClass: 'controlled', ingredients: [{ itemKey: 'precision_hardware_pack', quantity: 1 }, { itemKey: 'steel_sheet', quantity: 1 }]
  },
  {
    key: 'ammo_9mm_bundle', displayName: '9mm Ammunition Bundle', category: 'ammunition', outputItemKey: 'ammo_9mm', outputQuantity: 30,
    durationSeconds: 10, riskClass: 'controlled', ingredients: [{ itemKey: 'ammo_components_box', quantity: 1 }]
  },
  {
    key: 'ammo_45_bundle', displayName: '.45 Ammunition Bundle', category: 'ammunition', outputItemKey: 'ammo_45', outputQuantity: 24,
    durationSeconds: 10, riskClass: 'controlled', ingredients: [{ itemKey: 'ammo_components_box', quantity: 1 }]
  },
  {
    key: 'shotgun_shell_bundle', displayName: 'Shotgun Shell Bundle', category: 'ammunition', outputItemKey: 'shotgun_shells', outputQuantity: 12,
    durationSeconds: 10, riskClass: 'controlled', ingredients: [{ itemKey: 'ammo_components_box', quantity: 1 }]
  },
  {
    key: 'rifle_ammo_bundle', displayName: 'Rifle Ammunition Bundle', category: 'ammunition', outputItemKey: 'rifle_ammo', outputQuantity: 30,
    durationSeconds: 12, riskClass: 'controlled', ingredients: [{ itemKey: 'ammo_components_box', quantity: 1 }, { itemKey: 'precision_hardware_pack', quantity: 1 }]
  },
  {
    key: 'compact_pistol', displayName: 'Compact Pistol', category: 'weapon', outputItemKey: 'compact_pistol', outputQuantity: 1,
    durationSeconds: 24, riskClass: 'restricted', ingredients: [{ itemKey: 'weapon_parts_kit', quantity: 2 }, { itemKey: 'precision_hardware_pack', quantity: 1 }]
  },
  {
    key: 'service_pistol', displayName: 'Service Pistol', category: 'weapon', outputItemKey: 'service_pistol', outputQuantity: 1,
    durationSeconds: 28, riskClass: 'restricted', ingredients: [{ itemKey: 'weapon_parts_kit', quantity: 3 }, { itemKey: 'precision_hardware_pack', quantity: 1 }]
  },
  {
    key: 'compact_smg', displayName: 'Compact SMG', category: 'weapon', outputItemKey: 'compact_smg', outputQuantity: 1,
    durationSeconds: 36, riskClass: 'restricted', ingredients: [{ itemKey: 'weapon_parts_kit', quantity: 4 }, { itemKey: 'precision_hardware_pack', quantity: 2 }]
  },
  {
    key: 'carbine_rifle', displayName: 'Carbine Rifle', category: 'weapon', outputItemKey: 'carbine_rifle', outputQuantity: 1,
    durationSeconds: 42, riskClass: 'restricted', ingredients: [{ itemKey: 'weapon_parts_kit', quantity: 5 }, { itemKey: 'precision_hardware_pack', quantity: 3 }]
  }
]);

export function getWeaponSpec(itemKey: string): WeaponSpec | undefined {
  return WEAPON_SPECS[itemKey];
}

export function getCraftingRecipe(recipeKey: string): CraftingRecipe | undefined {
  return CRAFTING_RECIPES.find(recipe => recipe.key === recipeKey);
}
