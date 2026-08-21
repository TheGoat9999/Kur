import { Router } from 'express';
import { CrimeCommandSchema } from '@sol-dorado/contracts/crime';
import type { AppServices } from '../types.js';
import { CrimeCommandError, getCrimeState, runCrimeCommand } from '../services/crime.js';

export function crimeRoutes(services: AppServices) {
  const router = Router();
  router.get('/v1/crime', async (request, response) => {
    response.json(await getCrimeState(services.db, request.playerId!));
  });
  router.post('/v1/crime', async (request, response) => {
    const parsed = CrimeCommandSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error:'invalid_crime_command', issues:parsed.error.issues });
    try { response.json(await runCrimeCommand(services.db, request.playerId!, parsed.data)); }
    catch (error) {
      if (error instanceof CrimeCommandError) return response.status(error.status).json({ error:error.code });
      throw error;
    }
  });
  return router;
}
