import { Router } from 'express';
import type { AppServices } from '../types.js';

export function healthRoutes(services: AppServices) {
  const router = Router();
  router.get('/health', async (_request, response) => {
    const checks = { postgres: false, redis: false };
    try { await services.db.query('SELECT 1'); checks.postgres = true; } catch {}
    try { if (services.redis.status === 'wait') await services.redis.connect(); await services.redis.ping(); checks.redis = true; } catch {}
    const healthy = checks.postgres && checks.redis;
    response.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'degraded', checks, time: new Date().toISOString() });
  });
  return router;
}
