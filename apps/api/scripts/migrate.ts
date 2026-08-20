import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { createDatabase } from '../src/db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const db = createDatabase(loadConfig());
try {
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const directory = path.resolve(here, '../migrations');
  for (const name of fs.readdirSync(directory).filter(file => file.endsWith('.sql')).sort()) {
    const applied = await db.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
    if (applied.rowCount) continue;
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(fs.readFileSync(path.join(directory, name), 'utf8'));
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
      await client.query('COMMIT');
      console.log(`Applied ${name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
} finally { await db.end(); }
