import { Router } from 'express';
import {
  InventoryMoveRequestSchema,
  InventoryMutationResultSchema,
  InventoryUseRequestSchema
} from '@sol-dorado/contracts';
import { InventorySplitRequestSchema } from '@sol-dorado/contracts/inventory';
import type { AppServices } from '../types.js';
import { getBootstrapState } from '../services/player-state.js';
import {
  getInventoryState,
  InventoryCommandError,
  moveInventoryItem,
  splitInventoryItem,
  useInventoryItem
} from '../services/inventory.js';

export function inventoryRoutes(services: AppServices) {
  const router = Router();

  router.get('/v1/inventory', async (request, response) => {
    response.json(await getInventoryState(services.db, request.playerId!));
  });

  router.post('/v1/inventory/move', async (request, response) => {
    const parsed = InventoryMoveRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_inventory_move', issues: parsed.error.issues });
    try {
      response.json(await moveInventoryItem(
        services.db,
        request.playerId!,
        parsed.data.itemId,
        parsed.data.toContainerKey,
        parsed.data.toSlotIndex
      ));
    } catch (error) {
      if (error instanceof InventoryCommandError) return response.status(error.status).json({ error: error.code });
      throw error;
    }
  });

  router.post('/v1/inventory/split', async (request, response) => {
    const parsed = InventorySplitRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_inventory_split', issues: parsed.error.issues });
    try {
      response.json(await splitInventoryItem(
        services.db,
        request.playerId!,
        parsed.data.itemId,
        parsed.data.quantity,
        parsed.data.toSlotIndex
      ));
    } catch (error) {
      if (error instanceof InventoryCommandError) return response.status(error.status).json({ error: error.code });
      throw error;
    }
  });

  router.post('/v1/inventory/use', async (request, response) => {
    const parsed = InventoryUseRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_inventory_use', issues: parsed.error.issues });
    try {
      await useInventoryItem(services.db, request.playerId!, parsed.data.itemId);
      const [inventory, state] = await Promise.all([
        getInventoryState(services.db, request.playerId!),
        getBootstrapState(services.db, request.playerId!)
      ]);
      if (!state) return response.status(404).json({ error: 'player_not_found' });
      response.json(InventoryMutationResultSchema.parse({ inventory, state }));
    } catch (error) {
      if (error instanceof InventoryCommandError) return response.status(error.status).json({ error: error.code });
      throw error;
    }
  });

  return router;
}
