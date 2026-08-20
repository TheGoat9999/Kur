import { Router } from 'express';
import { WorldActionRequestSchema, WorldActionResultSchema } from '@sol-dorado/contracts';
import type { AppServices } from '../types.js';
import { applyWorldAction } from '../domain/actions.js';
import { getBootstrapState } from '../services/player-state.js';

export function worldActionRoutes(services: AppServices) {
  const router = Router();
  router.post('/v1/world/actions', async (request, response) => {
    const parsed = WorldActionRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_action', issues: parsed.error.issues });
    const input = parsed.data;
    const playerId = request.playerId!;
    const client = await services.db.connect();

    try {
      await client.query('BEGIN');
      const duplicate = await client.query('SELECT result FROM world_action_log WHERE player_id = $1 AND request_id = $2', [playerId, input.requestId]);
      if (duplicate.rows[0]) {
        await client.query('COMMIT');
        return response.json(WorldActionResultSchema.parse(duplicate.rows[0].result));
      }

      const stateResult = await client.query('SELECT * FROM player_state WHERE player_id = $1 FOR UPDATE', [playerId]);
      const row = stateResult.rows[0];
      if (!row) { await client.query('ROLLBACK'); return response.status(404).json({ error: 'player_not_found' }); }
      if (Number(row.version) !== input.expectedVersion) {
        await client.query('ROLLBACK');
        return response.status(409).json({ error: 'state_version_conflict', currentVersion: Number(row.version) });
      }

      const outcome = applyWorldAction({
        health: row.health,
        energy: row.energy,
        satiety: row.satiety,
        hydration: row.hydration,
        stress: row.stress,
        policeHeat: row.police_heat,
        cashCents: Number(row.cash_cents),
        streetSegment: row.street_segment
      }, input.actionId);

      await client.query({
        text: `UPDATE player_state SET version = version + 1, health = $2, energy = $3, satiety = $4, hydration = $5, stress = $6, police_heat = $7, cash_cents = $8, street_segment = $9, updated_at = now() WHERE player_id = $1`,
        values: [playerId, outcome.next.health, outcome.next.energy, outcome.next.satiety, outcome.next.hydration, outcome.next.stress, outcome.next.policeHeat, outcome.next.cashCents, outcome.next.streetSegment]
      });

      const state = await getBootstrapState(client, playerId);
      if (!state) throw new Error('State disappeared during action transaction');
      const result = WorldActionResultSchema.parse({ requestId: input.requestId, actionId: input.actionId, title: outcome.title, feedback: outcome.feedback, state });
      await client.query('INSERT INTO world_action_log (player_id, request_id, action_id, result) VALUES ($1, $2, $3, $4)', [playerId, input.requestId, input.actionId, result]);
      await client.query('COMMIT');
      response.json(result);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });
  return router;
}
