import { Router } from 'express';
import { AdminMutationSchema } from '@sol-dorado/contracts/admin';
import type { AppServices } from '../types.js';
import { AdminCommandError, getAdminState, runAdminMutation } from '../services/admin.js';
import { getCoreRegistry } from '../services/core-registry.js';

export function adminRoutes(services: AppServices) {
  const router = Router();

  router.get('/v1/core', async (_request, response, next) => {
    try {
      response.json(await getCoreRegistry(services.db));
    } catch (error) { next(error); }
  });

  router.get('/v1/admin', async (request, response, next) => {
    if (services.config.NODE_ENV === 'production') return response.status(404).end();
    try {
      response.json(await getAdminState(services.db, request.playerId!));
    } catch (error) { handleAdminError(error, response, next); }
  });

  router.post('/v1/admin/mutate', async (request, response, next) => {
    if (services.config.NODE_ENV === 'production') return response.status(404).end();
    const parsed = AdminMutationSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_admin_mutation' });
    try {
      response.json(await runAdminMutation(services.db, request.playerId!, parsed.data));
    } catch (error) { handleAdminError(error, response, next); }
  });

  return router;
}

function handleAdminError(error: unknown, response: import('express').Response, next: import('express').NextFunction) {
  if (error instanceof AdminCommandError) return response.status(error.status).json({ error: error.code });
  next(error);
}
