import { loadConfig } from '../src/config.js';
import { createDatabase } from '../src/db.js';

const playerId = '00000000-0000-4000-8000-000000000001';
const characterId = '00000000-0000-4000-8000-000000000101';
const recipe = {
  body: 'male',
  appearance: { height: 0, weight: 0, muscle: 0, age: 28, skinTone: 2, eyeColor: 1 },
  grooming: { hairStyle: 'bald', hairColor: 2 },
  morphs: {},
  faceMorphs: {}
};
const db = createDatabase(loadConfig());
try {
  await db.query('INSERT INTO players (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [playerId]);
  await db.query('INSERT INTO player_state (player_id) VALUES ($1) ON CONFLICT (player_id) DO NOTHING', [playerId]);
  await db.query({
    text: `INSERT INTO characters (id, player_id, display_name, recipe, is_active) VALUES ($1, $2, $3, $4, true) ON CONFLICT (id) DO UPDATE SET recipe = EXCLUDED.recipe, updated_at = now()`,
    values: [characterId, playerId, 'My Character', recipe]
  });
  await db.query(`
    INSERT INTO inventory_containers (id, player_id, container_key, label, capacity_grams, slot_count)
    VALUES
      ('00000000-0000-4000-8000-000000000201', $1, 'player', 'Backpack & Pockets', 14000, 20),
      ('00000000-0000-4000-8000-000000000202', $1, 'ground', 'Nearby / Ground', 50000, 20),
      ('00000000-0000-4000-8000-000000000203', $1, 'home', 'Cypress Apartment · Storage', 60000, 20),
      ('00000000-0000-4000-8000-000000000204', $1, 'vehicle_trunk', 'Active Vehicle · Trunk', 35000, 20)
    ON CONFLICT (player_id, container_key) DO UPDATE SET
      label = EXCLUDED.label,
      capacity_grams = EXCLUDED.capacity_grams,
      slot_count = EXCLUDED.slot_count,
      updated_at = now()
  `, [playerId]);
  await db.query(`
    INSERT INTO inventory_items
      (id, player_id, container_id, item_key, display_name, category, symbol, quantity, unit_weight_grams, stackable, slot_index, metadata)
    VALUES
      ('00000000-0000-4000-8000-000000000301', $1, '00000000-0000-4000-8000-000000000201', 'phone', 'Phone', 'Device', 'PH', 1, 220, false, 0, '{"condition": 94}'),
      ('00000000-0000-4000-8000-000000000302', $1, '00000000-0000-4000-8000-000000000201', 'wallet', 'Wallet', 'Personal', 'WL', 1, 180, false, 1, '{}'),
      ('00000000-0000-4000-8000-000000000303', $1, '00000000-0000-4000-8000-000000000201', 'identity_card', 'Identity Card', 'Document', 'ID', 1, 20, false, 2, '{}'),
      ('00000000-0000-4000-8000-000000000304', $1, '00000000-0000-4000-8000-000000000201', 'water', 'Water', 'Consumable', 'H2O', 2, 500, true, 3, '{"hydration": 18}'),
      ('00000000-0000-4000-8000-000000000305', $1, '00000000-0000-4000-8000-000000000201', 'sandwich', 'Sandwich', 'Food', 'FOOD', 1, 350, true, 4, '{"satiety": 15}'),
      ('00000000-0000-4000-8000-000000000306', $1, '00000000-0000-4000-8000-000000000201', 'gloves', 'Work Gloves', 'Clothing', 'GLV', 1, 150, false, 5, '{}'),
      ('00000000-0000-4000-8000-000000000307', $1, '00000000-0000-4000-8000-000000000203', 'toolbox', 'Toolbox', 'Tool', 'TOOL', 1, 5200, false, 0, '{"quality": 62}'),
      ('00000000-0000-4000-8000-000000000308', $1, '00000000-0000-4000-8000-000000000204', 'crowbar', 'Crowbar', 'Tool', 'BAR', 1, 2200, false, 0, '{}')
    ON CONFLICT (id) DO NOTHING
  `, [playerId]);
  console.log(`Seeded development player ${playerId}`);
} finally { await db.end(); }
