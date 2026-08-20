import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { AppServices } from './types.js';
import { requireSession } from './middleware/session.js';
import { healthRoutes } from './routes/health.js';
import { sessionRoutes } from './routes/session.js';
import { bootstrapRoutes } from './routes/bootstrap.js';
import { worldActionRoutes } from './routes/world-actions.js';
import { inventoryRoutes } from './routes/inventory.js';
import { financeRoutes } from './routes/finance.js';
import { itemRoutes } from './routes/items.js';

export function createApp(services: AppServices) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: services.config.WEB_ORIGIN }));
  app.use(express.json({ limit: '256kb' }));
  app.use(healthRoutes(services));
  app.use(sessionRoutes(services));
  app.use(requireSession(services.redis));
  app.use(bootstrapRoutes(services));
  app.use(worldActionRoutes(services));
  app.use(inventoryRoutes(services));
  app.use(itemRoutes());
  app.use(financeRoutes(services));
  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    console.error(error);
    response.status(500).json({ error: 'internal_server_error' });
  });
  return app;
}
