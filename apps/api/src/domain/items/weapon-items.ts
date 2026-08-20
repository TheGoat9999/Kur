import { defineCategory } from './catalog-helpers.js';

export const WEAPON_ITEMS = defineCategory('weapon', [
  ['kitchen_knife', 'Kitchen Knife', 'melee', 320, 1, 1200],
  ['pocket_knife', 'Pocket Knife', 'melee', 180, 1, 1800],
  ['combat_knife', 'Combat Knife', 'melee', 420, 1, 4200, 'restricted'],
  ['baseball_bat', 'Baseball Bat', 'melee', 1100, 1, 2400],
  ['baton', 'Baton', 'melee', 650, 1, 2800, 'restricted', {}, ['baton'], 'meleeWpnBatonT0PipeBaton.png'],
  ['machete', 'Machete', 'melee', 900, 1, 4800, 'restricted'],
  ['hatchet', 'Hatchet', 'melee', 1200, 1, 3200],
  ['compact_pistol', 'Compact Pistol', 'firearm', 760, 1, 42000, 'regulated'],
  ['service_pistol', 'Service Pistol', 'firearm', 980, 1, 58000, 'regulated'],
  ['revolver', 'Revolver', 'firearm', 1100, 1, 65000, 'regulated'],
  ['machine_pistol', 'Machine Pistol', 'firearm', 1400, 1, 88000, 'regulated'],
  ['compact_smg', 'Compact SMG', 'firearm', 2500, 1, 120000, 'regulated'],
  ['smg', 'SMG', 'firearm', 3200, 1, 145000, 'regulated'],
  ['pump_shotgun', 'Pump Shotgun', 'firearm', 3800, 1, 98000, 'regulated'],
  ['carbine_rifle', 'Carbine Rifle', 'firearm', 3500, 1, 165000, 'regulated'],
  ['assault_rifle', 'Assault Rifle', 'firearm', 3900, 1, 185000, 'regulated'],
  ['marksman_rifle', 'Marksman Rifle', 'firearm', 4300, 1, 220000, 'regulated'],
  ['ammo_9mm', '9mm Ammunition', 'ammunition', 15, 100, 90, 'regulated'],
  ['ammo_45', '.45 Ammunition', 'ammunition', 20, 100, 120, 'regulated'],
  ['ammo_revolver', 'Revolver Ammunition', 'ammunition', 22, 100, 140, 'regulated'],
  ['shotgun_shells', 'Shotgun Shells', 'ammunition', 45, 100, 180, 'regulated'],
  ['rifle_ammo', 'Rifle Ammunition', 'ammunition', 18, 100, 160, 'regulated'],
  ['pistol_magazine', 'Pistol Magazine', 'weapon_part', 180, 5, 3500, 'regulated'],
  ['rifle_magazine', 'Rifle Magazine', 'weapon_part', 320, 5, 5200, 'regulated'],
  ['weapon_cleaning_kit', 'Weapon Cleaning Kit', 'maintenance', 850, 5, 4200, 'restricted']
]);
