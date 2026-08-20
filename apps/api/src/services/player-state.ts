import type { Pool, PoolClient } from 'pg';
import { BootstrapStateSchema, type BootstrapState } from '@sol-dorado/contracts';

type Queryable = Pool | PoolClient;

export async function getBootstrapState(db: Queryable, playerId: string): Promise<BootstrapState | null> {
  const result = await db.query({
    text: `
      SELECT
        p.id AS player_id,
        ps.version,
        ps.health,
        ps.energy,
        ps.satiety,
        ps.hydration,
        ps.stress,
        ps.police_heat,
        ps.cash_cents,
        ps.settlement,
        ps.zone,
        ps.district,
        ps.street_segment,
        c.id AS character_id,
        c.display_name,
        c.recipe,
        c.updated_at AS character_updated_at
      FROM players p
      JOIN player_state ps ON ps.player_id = p.id
      LEFT JOIN characters c ON c.player_id = p.id AND c.is_active = true
      WHERE p.id = $1
      LIMIT 1
    `,
    values: [playerId]
  });
  const row = result.rows[0];
  if (!row) return null;

  return BootstrapStateSchema.parse({
    playerId: row.player_id,
    version: Number(row.version),
    serverTime: new Date().toISOString(),
    character: row.character_id
      ? {
          id: row.character_id,
          displayName: row.display_name,
          recipe: row.recipe,
          updatedAt: new Date(row.character_updated_at).toISOString()
        }
      : null,
    hud: {
      health: row.health,
      energy: row.energy,
      satiety: row.satiety,
      hydration: row.hydration,
      stress: row.stress,
      policeHeat: row.police_heat,
      cashCents: Number(row.cash_cents)
    },
    location: {
      settlement: row.settlement,
      zone: row.zone,
      district: row.district,
      streetSegment: row.street_segment
    }
  });
}
