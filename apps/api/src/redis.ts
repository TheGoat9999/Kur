import { Redis } from 'ioredis';
import type { AppConfig } from './config.js';

export function createRedis(config: AppConfig) {
  const redis = new Redis(config.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    retryStrategy: attempts => Math.min(250 * attempts, 3_000)
  });
  redis.on('error', error => console.warn(`Redis unavailable: ${error.message}`));
  return redis;
}
export type RedisClient = ReturnType<typeof createRedis>;
