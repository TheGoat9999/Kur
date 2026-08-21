import { Router } from 'express';
import { RestRequestSchema } from '@sol-dorado/contracts/needs';
import type { AppServices } from '../types.js';
import { getNeedsState, NeedsCommandError, restPlayer } from '../services/needs.js';

export function needsRoutes(services: AppServices) {
  const router = Router();
  router.get('/v1/needs', async (request, response) => {
    try { response.json(await getNeedsState(services.db, request.playerId!)); }
    catch (error) { if (error instanceof NeedsCommandError) return response.status(error.status).json({ error:error.code }); throw error; }
  });
  router.post('/v1/needs/rest', async (request, response) => {
    const parsed = RestRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error:'invalid_rest_request', issues:parsed.error.issues });
    try { response.json(await restPlayer(services.db, request.playerId!, parsed.data.kind)); }
    catch (error) { if (error instanceof NeedsCommandError) return response.status(error.status).json({ error:error.code }); throw error; }
  });
  return router;
}
