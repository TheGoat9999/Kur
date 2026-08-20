import type { Database } from './db.js';
import type { RedisClient } from './redis.js';
import type { AppConfig } from './config.js';

export interface AppServices { config: AppConfig; db: Database; redis: RedisClient; }

declare global {
  namespace Express {
    interface Request { playerId?: string; }
  }
}
