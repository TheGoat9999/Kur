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
  await db.query(`
    INSERT INTO player_state (player_id, street_segment)
    VALUES ($1, 'Market Street / Block 3')
    ON CONFLICT (player_id) DO NOTHING
  `, [playerId]);
  await db.query(`
    INSERT INTO player_street_state (player_id, current_segment_id, visited_segment_ids)
    VALUES ($1, 'market_block_3', ARRAY['market_block_3']::text[])
    ON CONFLICT (player_id) DO NOTHING
  `, [playerId]);
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
      ('00000000-0000-4000-8000-000000000304', $1, '00000000-0000-4000-8000-000000000201', 'water_bottle', 'Water Bottle', 'Drink', 'H2O', 2, 500, true, 3, '{}'),
      ('00000000-0000-4000-8000-000000000305', $1, '00000000-0000-4000-8000-000000000201', 'sandwich', 'Sandwich', 'Food', 'FOOD', 1, 350, true, 4, '{}'),
      ('00000000-0000-4000-8000-000000000306', $1, '00000000-0000-4000-8000-000000000201', 'work_gloves', 'Work Gloves', 'Personal', 'GLV', 1, 150, false, 5, '{}'),
      ('00000000-0000-4000-8000-000000000307', $1, '00000000-0000-4000-8000-000000000203', 'toolbox', 'Toolbox', 'Tool', 'TOOL', 1, 5200, false, 0, '{"quality": 62}'),
      ('00000000-0000-4000-8000-000000000308', $1, '00000000-0000-4000-8000-000000000204', 'crowbar', 'Crowbar', 'Tool', 'BAR', 1, 2200, false, 0, '{}')
    ON CONFLICT (id) DO NOTHING
  `, [playerId]);
  await db.query(`
    INSERT INTO finance_accounts (player_id, access_mode, checking_cents, savings_cents, exchange_cash_cents, credit_score)
    VALUES ($1, 'branch', 1280000, 350000, 0, 684)
    ON CONFLICT (player_id) DO NOTHING
  `, [playerId]);
  await db.query(`
    INSERT INTO finance_assets (symbol, name, price_cents, previous_price_cents, volatility)
    VALUES
      ('DRC', 'Dorado Coin', 1840, 1840, 0.08),
      ('VTA', 'Vanta', 475, 475, 0.14),
      ('MSA', 'Mesa', 6320, 6320, 0.05)
    ON CONFLICT (symbol) DO NOTHING
  `);
  await db.query(`
    INSERT INTO finance_holdings (player_id, symbol, quantity)
    VALUES ($1, 'DRC', 0), ($1, 'VTA', 0), ($1, 'MSA', 0)
    ON CONFLICT (player_id, symbol) DO NOTHING
  `, [playerId]);
  console.log(`Seeded development player ${playerId}`);
} finally { await db.end(); }
