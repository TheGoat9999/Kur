import { defineCategory } from './catalog-helpers.js';

export const PERSONAL_ITEMS = defineCategory("personal", [
  ["wallet", "Wallet", "personal", 180, 1, 2500, "legal", {}, ["wallet"], null],
  ["identity_card", "Identity Card", "document", 20, 1, 0, "legal", {}, ["identity card"], null],
  ["house_keys", "House Keys", "keys", 90, 1, 1200, "legal", {}, ["house keys"], null],
  ["vehicle_keys", "Vehicle Keys", "keys", 100, 1, 1800, "legal", {}, ["vehicle keys"], null],
  ["work_gloves", "Work Gloves", "clothing", 150, 1, 1600, "legal", {}, ["work gloves"], null],
]);
