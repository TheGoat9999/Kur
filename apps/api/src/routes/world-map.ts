import { Router } from 'express';
import type { AppServices } from '../types.js';
import { getWorldMapState } from '../services/world-map.js';

export function worldMapRoutes(services: AppServices) {
  const router = Router();
  router.get('/v1/world/map', async (request, response) => {
    response.json(await getWorldMapState(services.db, request.playerId!));
  });
  return router;
}
