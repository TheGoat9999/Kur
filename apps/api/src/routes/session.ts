import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { DevSessionSchema } from '@sol-dorado/contracts';
import type { AppServices } from '../types.js';

const DEV_PLAYER_ID = '00000000-0000-4000-8000-000000000001';

export function sessionRoutes(services: AppServices) {
  const router = Router();
  router.post('/v1/session/dev', async (_request, response) => {
    if (services.config.NODE_ENV === 'production') return response.status(404).end();
    const player = await services.db.query('SELECT id FROM players WHERE id = $1', [DEV_PLAYER_ID]);
    if (!player.rowCount) return response.status(503).json({ error: 'development_player_not_seeded' });
    if (services.redis.status === 'wait') await services.redis.connect();
    const token = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
    const expiresInSeconds = 86_400;
    await services.redis.set(`session:${token}`, DEV_PLAYER_ID, 'EX', expiresInSeconds);
    response.status(201).json(DevSessionSchema.parse({ token, expiresInSeconds }));
  });
  return router;
}
