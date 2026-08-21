import { Router } from 'express';
import { CharacterRecipeSchema } from '@sol-dorado/contracts';
import type { AppServices } from '../types.js';
import { getBootstrapState } from '../services/player-state.js';

export function characterRoutes(services: AppServices) {
  const router = Router();

  router.put('/v1/character', async (request, response) => {
    const displayName = typeof request.body?.displayName === 'string' ? request.body.displayName.trim() : '';
    const recipe = CharacterRecipeSchema.safeParse(request.body?.recipe);

    if (!displayName || displayName.length > 80 || !recipe.success) {
      response.status(400).json({
        error: 'invalid_character',
        details: recipe.success ? undefined : recipe.error.flatten()
      });
      return;
    }

    const playerId = request.playerId!;
    const updated = await services.db.query({
      text: `
        UPDATE characters
        SET display_name = $2, recipe = $3::jsonb, updated_at = now()
        WHERE player_id = $1 AND is_active = true
        RETURNING id
      `,
      values: [playerId, displayName, JSON.stringify(recipe.data)]
    });

    if (updated.rowCount === 0) {
      await services.db.query({
        text: `
          INSERT INTO characters (player_id, display_name, recipe, is_active)
          VALUES ($1, $2, $3::jsonb, true)
        `,
        values: [playerId, displayName, JSON.stringify(recipe.data)]
      });
    }

    const state = await getBootstrapState(services.db, playerId);
    if (!state) {
      response.status(404).json({ error: 'player_not_found' });
      return;
    }
    response.json(state);
  });

  return router;
}
