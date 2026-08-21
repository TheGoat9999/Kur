import { Router } from 'express';
import type { AppServices } from '../types.js';
import { getBootstrapState } from '../services/player-state.js';
import { simulateNeeds } from '../services/needs.js';

export function bootstrapRoutes(services: AppServices) {
  const router = Router();
  router.get('/v1/bootstrap', async (request, response) => {
    await simulateNeeds(services.db, request.playerId!);
    const state = await getBootstrapState(services.db, request.playerId!);
    if (!state) return response.status(404).json({ error: 'player_not_found' });
    response.json(state);
  });
  return router;
}
