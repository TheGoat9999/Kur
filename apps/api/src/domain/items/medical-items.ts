import { defineCategory } from './catalog-helpers.js';

export const MEDICAL_ITEMS = defineCategory('medical', [
  ['bandage', 'Bandage', 'first_aid', 40, 10, 350, 'legal', { health: 6 }],
  ['gauze', 'Gauze', 'first_aid', 30, 10, 300, 'legal', { health: 4 }],
  ['antiseptic', 'Antiseptic', 'first_aid', 180, 10, 550, 'legal', { health: 3 }],
  ['medkit', 'Medical Kit', 'first_aid', 2200, 1, 4800, 'legal', { health: 28, stress: -4 }],
  ['first_aid_kit', 'First Aid Kit', 'first_aid', 1500, 1, 3200, 'legal', { health: 18 }],
  ['painkillers', 'Painkillers', 'medicine', 60, 10, 900, 'legal', { health: 5, stress: -5 }],
  ['cold_medicine', 'Cold Medicine', 'medicine', 90, 10, 800, 'legal', { health: 3 }],
  ['antibiotics', 'Antibiotics', 'medicine', 80, 10, 1800, 'restricted', { health: 7 }],
  ['inhaler', 'Inhaler', 'medicine', 70, 10, 2400, 'legal', { energy: 4 }],
  ['epipen', 'Epinephrine Injector', 'medicine', 45, 10, 3800, 'restricted', { health: 12, energy: 8, stress: 6 }],
  ['splint', 'Splint', 'trauma', 500, 10, 1200, 'legal', { health: 6 }],
  ['tourniquet', 'Tourniquet', 'trauma', 120, 10, 1100, 'legal', { health: 8 }],
  ['trauma_dressing', 'Trauma Dressing', 'trauma', 160, 10, 1500, 'legal', { health: 10 }],
  ['burn_dressing', 'Burn Dressing', 'trauma', 140, 10, 1400, 'legal', { health: 8 }],
  ['ice_pack', 'Ice Pack', 'first_aid', 400, 10, 700, 'legal', { health: 3, stress: -2 }],
  ['saline_bag', 'Saline Bag', 'clinical', 1000, 10, 1800, 'restricted', { hydration: 8, health: 4 }],
  ['surgical_mask', 'Surgical Mask', 'protective', 25, 10, 250],
  ['medical_gloves', 'Medical Gloves', 'protective', 30, 10, 200],
  ['thermometer', 'Thermometer', 'diagnostic', 90, 1, 1400],
  ['crutches', 'Crutches', 'mobility', 2200, 1, 5200]
]);
