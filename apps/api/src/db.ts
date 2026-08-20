import pg from 'pg';
import type { AppConfig } from './config.js';

export function createDatabase(config: AppConfig) {
  return new pg.Pool({ connectionString: config.DATABASE_URL, max: config.NODE_ENV === 'production' ? 20 : 5, idleTimeoutMillis: 30_000 });
}
export type Database = ReturnType<typeof createDatabase>;
