import { Router } from 'express';
import {
  CraftingRequestSchema,
  CraftingResultSchema,
  WeaponActionRequestSchema,
  WeaponActionResultSchema
} from '@sol-dorado/contracts/weapons-crafting';
import type { AppServices } from '../types.js';
import { craftInventoryRecipe, getCraftingState, runWeaponAction } from '../services/weapons-crafting.js';
import { InventoryCommandError } from '../services/inventory.js';

export function weaponsCraftingRoutes(services: AppServices) {
  const router = Router();

  router.get('/v1/inventory/crafting', async (request, response) => {
    response.json(await getCraftingState(services.db, request.playerId!));
  });

  router.post('/v1/inventory/crafting', async (request, response) => {
    const parsed = CraftingRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_crafting_request', issues: parsed.error.issues });
    try {
      response.json(CraftingResultSchema.parse(await craftInventoryRecipe(services.db, request.playerId!, parsed.data.recipeKey)));
    } catch (error) {
      if (error instanceof InventoryCommandError) return response.status(error.status).json({ error: error.code });
      throw error;
    }
  });

  router.post('/v1/inventory/weapon', async (request, response) => {
    const parsed = WeaponActionRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_weapon_action', issues: parsed.error.issues });
    try {
      response.json(WeaponActionResultSchema.parse(await runWeaponAction(
        services.db,
        request.playerId!,
        parsed.data.itemId,
        parsed.data.action
      )));
    } catch (error) {
      if (error instanceof InventoryCommandError) return response.status(error.status).json({ error: error.code });
      throw error;
    }
  });

  return router;
}
