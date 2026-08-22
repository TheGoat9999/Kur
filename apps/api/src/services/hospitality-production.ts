import type { PoolClient } from 'pg';
import type { Database } from '../db.js';
import { calculatePreparedQuality, PRODUCTION_RECIPES } from '../domain/hospitality-production.js';

export class HospitalityCommandError extends Error {
  constructor(public readonly code: string, public readonly status: number) { super(code); }
}

const PRODUCTION_JOB_KEYS = new Set(['kitchen','barista']);

type ActorAccess = { role: string | null; jobKey: string | null };

async function productionAccess(db: Database | PoolClient, businessId: string, playerId: string): Promise<ActorAccess> {
  const result = await db.query({ text: `SELECT b.owner_player_id,
    (SELECT role FROM business_members WHERE business_id=b.id AND player_id=$2 AND active=true LIMIT 1) member_role,
    (SELECT job_key FROM business_members WHERE business_id=b.id AND player_id=$2 AND active=true LIMIT 1) job_key
    FROM businesses b WHERE b.id=$1`, values: [businessId, playerId] });
  const row = result.rows[0];
  if (!row) throw new HospitalityCommandError('hospitality_business_not_found', 404);
  const role = row.owner_player_id === playerId ? 'owner' : row.member_role ? String(row.member_role) : null;
  const jobKey = row.job_key ? String(row.job_key) : null;
  if (role !== 'owner' && role !== 'manager' && !(role === 'employee' && jobKey && PRODUCTION_JOB_KEYS.has(jobKey))) {
    throw new HospitalityCommandError('hospitality_production_forbidden', 403);
  }
  return { role, jobKey };
}

export async function startProduction(db: Database, playerId: string, businessId: string, recipeKey: string, batches: number) {
  if (!Number.isInteger(batches) || batches < 1 || batches > 20) throw new HospitalityCommandError('hospitality_batch_invalid', 400);
  const recipe = PRODUCTION_RECIPES.find(candidate => candidate.key === recipeKey);
  if (!recipe) throw new HospitalityCommandError('hospitality_recipe_unknown', 400);

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await productionAccess(client, businessId, playerId);
    const profile = await client.query('SELECT skill_level FROM hospitality_profiles WHERE business_id=$1 FOR UPDATE', [businessId]);
    if (!profile.rowCount) throw new HospitalityCommandError('hospitality_profile_missing', 409);

    let totalInputCostCents = 0;
    let weightedQuality = 0;
    let weightedFreshness = 0;
    let ingredientUnits = 0;

    for (const line of recipe.lines) {
      const required = line.quantity * batches;
      const stock = (await client.query(
        `SELECT quantity,average_unit_cost_cents FROM business_stock WHERE business_id=$1 AND item_key=$2 FOR UPDATE`,
        [businessId, line.itemKey]
      )).rows[0];
      if (!stock || Number(stock.quantity) < required) throw new HospitalityCommandError('hospitality_ingredient_shortage', 409);

      totalInputCostCents += Number(stock.average_unit_cost_cents) * required;
      const lotQuality = await consumeIngredientLots(client, businessId, line.itemKey, required);
      weightedQuality += lotQuality.qualityTotal;
      weightedFreshness += lotQuality.freshnessTotal;
      ingredientUnits += required;

      await client.query(
        'UPDATE business_stock SET quantity=quantity-$3,updated_at=now() WHERE business_id=$1 AND item_key=$2',
        [businessId, line.itemKey, required]
      );
    }

    const inputQuality = Math.round(weightedQuality / Math.max(1, ingredientUnits));
    const freshness = Math.round(weightedFreshness / Math.max(1, ingredientUnits));
    const skillLevel = Number(profile.rows[0].skill_level ?? 0);
    const result = await client.query(
      `INSERT INTO hospitality_production_batches
        (business_id,recipe_key,batches,status,input_quality,freshness,skill_level,total_input_cost_cents,started_at,ready_at)
       VALUES($1,$2,$3,'preparing',$4,$5,$6,$7,now(),now()+($8::text||' minutes')::interval)
       RETURNING id,ready_at`,
      [businessId, recipe.key, batches, inputQuality, freshness, skillLevel, totalInputCostCents, recipe.preparationMinutes * batches]
    );
    await client.query('COMMIT');
    return { batchId: String(result.rows[0].id), readyAt: new Date(result.rows[0].ready_at).toISOString() };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function completeProduction(db: Database, playerId: string, batchId: string) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const batch = (await client.query('SELECT * FROM hospitality_production_batches WHERE id=$1 FOR UPDATE', [batchId])).rows[0];
    if (!batch) throw new HospitalityCommandError('hospitality_batch_not_found', 404);
    await productionAccess(client, String(batch.business_id), playerId);
    if (batch.status !== 'preparing') throw new HospitalityCommandError('hospitality_batch_not_preparing', 409);
    if (new Date(batch.ready_at).getTime() > Date.now()) throw new HospitalityCommandError('hospitality_batch_not_ready', 409);

    const recipe = PRODUCTION_RECIPES.find(candidate => candidate.key === String(batch.recipe_key));
    if (!recipe) throw new HospitalityCommandError('hospitality_recipe_unknown', 409);
    const quantity = recipe.outputQuantity * Number(batch.batches);
    const quality = calculatePreparedQuality(Number(batch.input_quality), Number(batch.freshness), Number(batch.skill_level));
    const unitCost = Math.max(0, Math.round(Number(batch.total_input_cost_cents) / Math.max(1, quantity)));

    await client.query(
      `INSERT INTO business_stock(business_id,item_key,quantity,reorder_point,average_unit_cost_cents)
       VALUES($1,$2,$3,4,$4)
       ON CONFLICT(business_id,item_key) DO UPDATE SET quantity=business_stock.quantity+EXCLUDED.quantity,
         average_unit_cost_cents=CASE WHEN business_stock.quantity+EXCLUDED.quantity=0 THEN 0
           ELSE ROUND((business_stock.average_unit_cost_cents*business_stock.quantity+EXCLUDED.average_unit_cost_cents*EXCLUDED.quantity)::numeric/(business_stock.quantity+EXCLUDED.quantity)) END,
         updated_at=now()`,
      [batch.business_id, recipe.outputItemKey, quantity, unitCost]
    );
    await client.query(
      `INSERT INTO business_stock_lots(business_id,item_key,quantity,quality,received_at,best_before_at,source_kind)
       VALUES($1,$2,$3,$4,now(),now()+interval '12 hours','production')`,
      [batch.business_id, recipe.outputItemKey, quantity, quality]
    );
    await client.query(
      `UPDATE hospitality_production_batches SET status='ready',quality=$2,completed_at=now() WHERE id=$1`,
      [batchId, quality]
    );
    await client.query('COMMIT');
    return { outputItemKey: recipe.outputItemKey, quantity, quality };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function consumeIngredientLots(client: PoolClient, businessId: string, itemKey: string, required: number) {
  const lots = await client.query(
    `SELECT id,quantity,quality,
      CASE WHEN best_before_at IS NULL THEN 100 WHEN best_before_at<=now() THEN 20
        ELSE GREATEST(25,LEAST(100,ROUND(EXTRACT(EPOCH FROM (best_before_at-now()))/NULLIF(EXTRACT(EPOCH FROM (best_before_at-received_at)),0)*100))) END freshness
     FROM business_stock_lots WHERE business_id=$1 AND item_key=$2 AND quantity>0
     ORDER BY best_before_at NULLS LAST,received_at,id FOR UPDATE`,
    [businessId, itemKey]
  );
  let remaining = required;
  let qualityTotal = 0;
  let freshnessTotal = 0;
  for (const lot of lots.rows) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, Number(lot.quantity));
    await client.query('UPDATE business_stock_lots SET quantity=quantity-$2 WHERE id=$1', [lot.id, take]);
    qualityTotal += Number(lot.quality) * take;
    freshnessTotal += Number(lot.freshness) * take;
    remaining -= take;
  }
  if (remaining > 0) {
    qualityTotal += 75 * remaining;
    freshnessTotal += 80 * remaining;
  }
  return { qualityTotal, freshnessTotal };
}
