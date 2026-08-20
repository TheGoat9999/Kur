import { Router } from 'express';
import { WorldMapTravelRequestSchema } from '@sol-dorado/contracts/world-map';
import type { AppServices } from '../types.js';
import { getWorldMapState, travelFromWorldMap, WorldMapTravelError } from '../services/world-map.js';

export function worldMapRoutes(services: AppServices) {
  const router = Router();

  router.get('/v1/world/map', async (request, response) => {
    response.json(await getWorldMapState(services.db, request.playerId!));
  });

  router.post('/v1/world/map/travel', async (request, response) => {
    const parsed = WorldMapTravelRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_world_map_travel', issues: parsed.error.issues });
    try {
      response.json(await travelFromWorldMap(services.db, request.playerId!, parsed.data.segmentId));
    } catch (error) {
      if (error instanceof WorldMapTravelError) return response.status(error.status).json({ error: error.code });
      throw error;
    }
  });

  return router;
}
