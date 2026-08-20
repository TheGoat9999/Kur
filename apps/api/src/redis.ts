import { Redis } from 'ioredis';
import type { AppConfig } from './config.js';

export function createRedis(config: AppConfig) {
  return new Redis(config.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2, enableReadyCheck: true });
}
export type RedisClient = ReturnType<typeof createRedis>;
