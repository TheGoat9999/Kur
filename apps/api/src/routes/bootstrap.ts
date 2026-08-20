import { Router } from 'express';
import type { AppServices } from '../types.js';
import { getBootstrapState } from '../services/player-state.js';

export function bootstrapRoutes(services: AppServices) {
  const router = Router();
  router.get('/v1/bootstrap', async (request, response) => {
    const state = await getBootstrapState(services.db, request.playerId!);
    if (!state) return response.status(404).json({ error: 'player_not_found' });
    response.json(state);
  });
  return router;
}
