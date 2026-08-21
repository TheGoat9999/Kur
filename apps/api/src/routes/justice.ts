import { Router } from 'express';
import { JusticeBailActionRequestSchema, JusticeBookRequestSchema, JusticeCaseActionRequestSchema } from '@sol-dorado/contracts/justice';
import type { AppServices } from '../types.js';
import { JusticeCommandError, bookJusticeCase, getJusticeState, justiceBailAction, justiceCourt, justiceProsecution } from '../services/justice.js';

export function justiceRoutes(services: AppServices) {
  const router = Router();
  const handle = (response: any, error: unknown) => {
    if (error instanceof JusticeCommandError) return response.status(error.status).json({ error: error.code });
    throw error;
  };

  router.get('/v1/justice', async (request, response) => response.json(await getJusticeState(services.db, request.playerId!)));

  router.post('/v1/justice/book', async (request, response) => {
    const parsed = JusticeBookRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_justice_booking', issues: parsed.error.issues });
    try { response.json(await bookJusticeCase(services.db, request.playerId!, parsed.data)); } catch (error) { handle(response, error); }
  });

  router.post('/v1/justice/bail', async (request, response) => {
    const parsed = JusticeBailActionRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_justice_bail_action', issues: parsed.error.issues });
    try { response.json(await justiceBailAction(services.db, request.playerId!, parsed.data.caseId, parsed.data.action)); } catch (error) { handle(response, error); }
  });

  router.post('/v1/justice/prosecution', async (request, response) => {
    const parsed = JusticeCaseActionRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_justice_prosecution_action', issues: parsed.error.issues });
    try { response.json(await justiceProsecution(services.db, request.playerId!, parsed.data.caseId)); } catch (error) { handle(response, error); }
  });

  router.post('/v1/justice/court', async (request, response) => {
    const parsed = JusticeCaseActionRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_justice_court_action', issues: parsed.error.issues });
    try { response.json(await justiceCourt(services.db, request.playerId!, parsed.data.caseId)); } catch (error) { handle(response, error); }
  });

  return router;
}
