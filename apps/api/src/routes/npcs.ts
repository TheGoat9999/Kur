import { Router } from 'express';
import { NpcIdSchema, NpcInteractRequestSchema } from '@sol-dorado/contracts/npcs';
import type { AppServices } from '../types.js';
import { getNearbyNpcs, interactWithNpc, NpcCommandError } from '../services/npcs.js';

export function npcRoutes(services: AppServices) {
  const router = Router();

  router.get('/v1/npcs/nearby', async (request, response) => {
    response.json(await getNearbyNpcs(services.db, request.playerId!));
  });

  router.post('/v1/npcs/:npcId/interact', async (request, response) => {
    const parsedId = NpcIdSchema.safeParse(request.params.npcId);
    const parsedBody = NpcInteractRequestSchema.safeParse(request.body);
    if (!parsedId.success || !parsedBody.success) {
      return response.status(400).json({ error: 'invalid_npc_interaction' });
    }

    try {
      response.json(await interactWithNpc(services.db, request.playerId!, parsedId.data, parsedBody.data.action));
    } catch (error) {
      if (error instanceof NpcCommandError) return response.status(error.status).json({ error: error.code });
      throw error;
    }
  });

  return router;
}
