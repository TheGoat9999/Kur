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
  console.log(`Seeded development player ${playerId}`);
} finally { await db.end(); }
