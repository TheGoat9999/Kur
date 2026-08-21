import { Router } from 'express';
import { HoodWalkCommandSchema } from '@sol-dorado/contracts/hood-walk';
import type { AppServices } from '../types.js';
import { getHoodWalkState, HoodWalkCommandError, runHoodWalkCommand } from '../services/hood-walk.js';
import { WorldActionCommandError } from '../services/street-world.js';

export function hoodWalkRoutes(services: AppServices) {
  const router = Router();

  router.get('/v1/world/hood-walk', async (request, response) => {
    response.json(await getHoodWalkState(services.db, request.playerId!));
  });

  router.post('/v1/world/hood-walk', async (request, response) => {
    const parsed = HoodWalkCommandSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error:'invalid_hood_walk_command', issues:parsed.error.issues });
    try {
      response.json(await runHoodWalkCommand(services.db, request.playerId!, parsed.data));
    } catch (error) {
      if (error instanceof HoodWalkCommandError || error instanceof WorldActionCommandError) {
        return response.status(error.status).json({ error:error.code });
      }
      throw error;
    }
  });

  return router;
}
