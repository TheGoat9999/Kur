import { Router } from 'express';
import { WorldActionRequestSchema, WorldActionResultSchema } from '@sol-dorado/contracts';
import {
  StreetMoveRequestSchema,
  StreetPositionResultSchema,
  getStreetSpawnPosition,
  isStreetActionWithinReach,
  isStreetPositionWalkable
} from '@sol-dorado/contracts/world-position';
import type { AppServices } from '../types.js';
import { applyWorldAction, getActionAvailability, STREET_SEGMENTS } from '../domain/actions.js';
import { getBootstrapState } from '../services/player-state.js';
import {
  addStreetReward,
  getStreetPosition,
  getStreetState,
  lockStreetProgress,
  WorldActionCommandError,
  worldCooldownKey
} from '../services/street-world.js';

export function worldActionRoutes(services: AppServices) {
  const router = Router();

  router.get('/v1/world', async (request, response) => {
    response.json(await getStreetState(services.db, services.redis, request.playerId!));
  });

  router.get('/v1/world/position', async (request, response) => {
    response.json(await getStreetPosition(services.db, request.playerId!));
  });

  router.post('/v1/world/move', async (request, response) => {
    const parsed = StreetMoveRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_position', issues: parsed.error.issues });
    const playerId = request.playerId!;
    const client = await services.db.connect();
    try {
      await client.query('BEGIN');
      const progress = await lockStreetProgress(client, playerId);
      if (!isStreetPositionWalkable(progress.currentSegmentId, parsed.data)) {
        throw new WorldActionCommandError('world_position_blocked', 409);
      }
      await client.query(
        'UPDATE player_street_state SET position_x = $2, position_y = $3, updated_at = now() WHERE player_id = $1',
        [playerId, parsed.data.x, parsed.data.y]
      );
      await client.query('COMMIT');
      response.json(StreetPositionResultSchema.parse({ segmentId: progress.currentSegmentId, position: parsed.data }));
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof WorldActionCommandError) return response.status(error.status).json({ error: error.code, ...error.details });
      throw error;
    } finally {
      client.release();
    }
  });

  router.post('/v1/world/actions', async (request, response) => {
    const parsed = WorldActionRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_action', issues: parsed.error.issues });
    const input = parsed.data;
    const playerId = request.playerId!;
    const client = await services.db.connect();
    let cooldownWasSet = false;

    try {
      await client.query('BEGIN');
      const duplicate = await client.query(
        'SELECT result FROM world_action_log WHERE player_id = $1 AND request_id = $2',
        [playerId, input.requestId]
      );
      if (duplicate.rows[0]) {
        await client.query('COMMIT');
        return response.json(WorldActionResultSchema.parse(duplicate.rows[0].result));
      }

      const stateResult = await client.query('SELECT * FROM player_state WHERE player_id = $1 FOR UPDATE', [playerId]);
      const row = stateResult.rows[0];
      if (!row) throw new WorldActionCommandError('player_not_found', 404);
      if (Number(row.version) !== input.expectedVersion) {
        throw new WorldActionCommandError('state_version_conflict', 409, { currentVersion: Number(row.version) });
      }

      const progress = await lockStreetProgress(client, playerId);
      if (!isStreetActionWithinReach(progress.currentSegmentId, progress.position, input.actionId)) {
        throw new WorldActionCommandError('world_action_too_far', 409);
      }

      const cooldownKey = worldCooldownKey(playerId, input.actionId);
      const remainingCooldownMs = await services.redis.pttl(cooldownKey);
      const cooldownEndsAt = remainingCooldownMs > 0 ? Date.now() + remainingCooldownMs : null;
      const current = {
        health: row.health,
        energy: row.energy,
        satiety: row.satiety,
        hydration: row.hydration,
        stress: row.stress,
        policeHeat: row.police_heat,
        cashCents: Number(row.cash_cents),
        ...progress
      };
      const availability = getActionAvailability(current, input.actionId, cooldownEndsAt);
      if (availability !== 'available') {
        throw new WorldActionCommandError(`world_action_${availability}`, 409, {
          cooldownEndsAt: cooldownEndsAt === null ? null : new Date(cooldownEndsAt).toISOString()
        });
      }

      const outcome = applyWorldAction(current, input.actionId);
      if (outcome.reward) await addStreetReward(client, playerId, outcome.reward);

      await client.query({
        text: `
          UPDATE player_state
          SET version = version + 1,
              health = $2,
              energy = $3,
              satiety = $4,
              hydration = $5,
              stress = $6,
              police_heat = $7,
              cash_cents = $8,
              street_segment = $9,
              updated_at = now()
          WHERE player_id = $1
        `,
        values: [
          playerId,
          outcome.next.health,
          outcome.next.energy,
          outcome.next.satiety,
          outcome.next.hydration,
          outcome.next.stress,
          outcome.next.policeHeat,
          outcome.next.cashCents,
          STREET_SEGMENTS[outcome.next.currentSegmentId].displayName
        ]
      });
      const nextPosition = outcome.next.currentSegmentId === progress.currentSegmentId
        ? progress.position
        : getStreetSpawnPosition(outcome.next.currentSegmentId);
      await client.query({
        text: `
          UPDATE player_street_state
          SET current_segment_id = $2,
              visited_segment_ids = $3,
              flags = $4,
              position_x = $5,
              position_y = $6,
              updated_at = now()
          WHERE player_id = $1
        `,
        values: [
          playerId,
          outcome.next.currentSegmentId,
          outcome.next.visitedSegmentIds,
          outcome.next.flags,
          nextPosition.x,
          nextPosition.y
        ]
      });

      if (outcome.cooldownMs) {
        await services.redis.set(cooldownKey, '1', 'PX', outcome.cooldownMs);
        cooldownWasSet = true;
      }

      const state = await getBootstrapState(client, playerId);
      if (!state) throw new WorldActionCommandError('player_not_found', 404);
      const street = await getStreetState(client, services.redis, playerId);
      const result = WorldActionResultSchema.parse({
        requestId: input.requestId,
        actionId: input.actionId,
        noticeId: outcome.noticeId,
        state,
        street,
        reward: outcome.reward
      });
      await client.query(
        'INSERT INTO world_action_log (player_id, request_id, action_id, result) VALUES ($1, $2, $3, $4)',
        [playerId, input.requestId, input.actionId, result]
      );
      await client.query('COMMIT');
      response.json(result);
    } catch (error) {
      await client.query('ROLLBACK');
      if (cooldownWasSet) await services.redis.del(worldCooldownKey(playerId, input.actionId));
      if (error instanceof WorldActionCommandError) {
        return response.status(error.status).json({ error: error.code, ...error.details });
      }
      throw error;
    } finally {
      client.release();
    }
  });

  return router;
}
