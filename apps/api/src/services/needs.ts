import type { PoolClient } from 'pg';
import { NeedsMutationResultSchema, NeedsStateSchema, type InjuryBodyArea, type InjuryKind, type NeedsState, type RestKind } from '@sol-dorado/contracts/needs';
import type { Database } from '../db.js';
import { applyNeedsTicks, NEEDS_TICK_MINUTES, shouldBeUnconscious } from '../domain/needs.js';

type Queryable = Database | PoolClient;

export class NeedsCommandError extends Error {
  constructor(public readonly code: string, public readonly status: number) { super(code); }
}

async function ensureRuntime(db: Queryable, playerId: string) {
  await db.query(`INSERT INTO player_needs_runtime (player_id) VALUES ($1) ON CONFLICT (player_id) DO NOTHING`, [playerId]);
}

async function activeBleeding(db: Queryable, playerId: string) {
  const result = await db.query(`SELECT COALESCE(MAX(bleeding),0) AS bleeding FROM player_injuries WHERE player_id=$1 AND (recovery_until IS NULL OR recovery_until > now())`, [playerId]);
  return Number(result.rows[0]?.bleeding ?? 0);
}

export async function simulateNeeds(db: Database, playerId: string) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await ensureRuntime(client, playerId);
    await client.query(`DELETE FROM player_injuries WHERE player_id=$1 AND treated=true AND recovery_until IS NOT NULL AND recovery_until <= now()`, [playerId]);
    const runtimeResult = await client.query(`SELECT * FROM player_needs_runtime WHERE player_id=$1 FOR UPDATE`, [playerId]);
    const runtime = runtimeResult.rows[0];
    const stateResult = await client.query(`SELECT health,energy,satiety,hydration,stress FROM player_state WHERE player_id=$1 FOR UPDATE`, [playerId]);
    const state = stateResult.rows[0];
    if (!state) throw new NeedsCommandError('player_not_found', 404);
    const bleeding = await activeBleeding(client, playerId);
    const elapsedMs = Date.now() - new Date(runtime.last_simulated_at).getTime();
    const ticks = Math.floor(elapsedMs / (NEEDS_TICK_MINUTES * 60_000));
    if (ticks > 0) {
      const next = applyNeedsTicks({ health:state.health, energy:state.energy, satiety:state.satiety, hydration:state.hydration, stress:state.stress }, ticks, bleeding);
      const unconscious = shouldBeUnconscious(next, bleeding);
      await client.query(`UPDATE player_state SET health=$2,energy=$3,satiety=$4,hydration=$5,stress=$6,version=version+1,updated_at=now() WHERE player_id=$1`, [playerId,next.health,next.energy,next.satiety,next.hydration,next.stress]);
      await client.query(`UPDATE player_needs_runtime SET consciousness=CASE WHEN $2 THEN 'unconscious' ELSE consciousness END,last_simulated_at=last_simulated_at + ($3 * interval '15 minutes'),updated_at=now() WHERE player_id=$1`, [playerId,unconscious,ticks]);
    }
    await client.query(`UPDATE player_needs_runtime SET care_state='field', admitted_until=NULL, consciousness=CASE WHEN consciousness='unconscious' THEN 'conscious' ELSE consciousness END, updated_at=now() WHERE player_id=$1 AND care_state='admitted' AND admitted_until <= now()`, [playerId]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

export async function getNeedsState(db: Database, playerId: string): Promise<NeedsState> {
  await simulateNeeds(db, playerId);
  await ensureRuntime(db, playerId);
  const [runtimeResult, stateResult, injuriesResult, homeResult] = await Promise.all([
    db.query(`SELECT consciousness,care_state,pain,admitted_until,last_simulated_at FROM player_needs_runtime WHERE player_id=$1`, [playerId]),
    db.query(`SELECT health,energy,satiety,hydration,stress FROM player_state WHERE player_id=$1`, [playerId]),
    db.query(`SELECT id,kind,body_area,severity,bleeding,treated,recovery_until,created_at FROM player_injuries WHERE player_id=$1 ORDER BY severity DESC,created_at DESC`, [playerId]),
    db.query(`SELECT 1 FROM player_properties pp JOIN real_estate_properties p ON p.id=pp.property_id WHERE pp.player_id=$1 AND pp.is_primary_residence=true AND p.kind IN ('apartment','house') LIMIT 1`, [playerId])
  ]);
  const runtime = runtimeResult.rows[0];
  const hud = stateResult.rows[0];
  if (!runtime || !hud) throw new NeedsCommandError('player_not_found', 404);
  const injuries = injuriesResult.rows.map((row:any) => ({ id:row.id, kind:row.kind, bodyArea:row.body_area, severity:row.severity, bleeding:row.bleeding, treated:row.treated, recoveryUntil:row.recovery_until ? new Date(row.recovery_until).toISOString() : null, createdAt:new Date(row.created_at).toISOString() }));
  const bleeding = injuries.reduce((max:number, injury:any) => Math.max(max, injury.bleeding), 0);
  const canAct = runtime.consciousness === 'conscious' && runtime.care_state === 'field';
  return NeedsStateSchema.parse({
    status: {
      consciousness: runtime.consciousness,
      careState: runtime.care_state,
      pain: runtime.pain,
      exhausted: hud.energy <= 15,
      hungry: hud.satiety <= 20,
      dehydrated: hud.hydration <= 20,
      bleeding,
      canRest: canAct,
      canSleep: canAct && homeResult.rowCount === 1,
      primaryResidenceRequired: homeResult.rowCount !== 1,
      admittedUntil: runtime.admitted_until ? new Date(runtime.admitted_until).toISOString() : null,
      injuries,
      lastSimulatedAt: new Date(runtime.last_simulated_at).toISOString()
    },
    hud
  });
}

async function mutationResult(db: Database, playerId: string, noticeBg: string, noticeEn: string) {
  return NeedsMutationResultSchema.parse({ needs: await getNeedsState(db, playerId), noticeBg, noticeEn });
}

export async function restPlayer(db: Database, playerId: string, kind: RestKind) {
  await simulateNeeds(db, playerId);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await ensureRuntime(client, playerId);
    const runtime = (await client.query(`SELECT consciousness,care_state FROM player_needs_runtime WHERE player_id=$1 FOR UPDATE`, [playerId])).rows[0];
    if (runtime.consciousness !== 'conscious') throw new NeedsCommandError('unconscious_cannot_rest', 409);
    if (runtime.care_state !== 'field') throw new NeedsCommandError('care_state_blocks_rest', 409);
    if (kind === 'sleep') {
      const home = await client.query(`SELECT 1 FROM player_properties pp JOIN real_estate_properties p ON p.id=pp.property_id WHERE pp.player_id=$1 AND pp.is_primary_residence=true AND p.kind IN ('apartment','house') LIMIT 1`, [playerId]);
      if (!home.rowCount) throw new NeedsCommandError('primary_residence_required', 409);
    }
    const bleeding = await activeBleeding(client, playerId);
    if (kind === 'sleep' && bleeding >= 2) throw new NeedsCommandError('major_bleeding_requires_treatment', 409);
    const energy = kind === 'sleep' ? 60 : 22;
    const stress = kind === 'sleep' ? 22 : 8;
    const health = kind === 'sleep' && bleeding === 0 ? 8 : kind === 'rest' && bleeding === 0 ? 2 : 0;
    await client.query(`UPDATE player_state SET energy=LEAST(100,energy+$2),stress=GREATEST(0,stress-$3),health=LEAST(100,health+$4),satiety=GREATEST(0,satiety-$5),hydration=GREATEST(0,hydration-$6),version=version+1,updated_at=now() WHERE player_id=$1`, [playerId,energy,stress,health,kind==='sleep'?4:1,kind==='sleep'?6:2]);
    await client.query(`UPDATE player_needs_runtime SET pain=GREATEST(0,pain-$2),last_rest_at=now(),updated_at=now() WHERE player_id=$1`, [playerId,kind==='sleep'?15:5]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  return mutationResult(db, playerId, kind === 'sleep' ? 'Спал си достатъчно, но гладът и жаждата са се увеличили.' : 'Почивката върна част от енергията ти.', kind === 'sleep' ? 'You slept well, but became hungrier and thirstier.' : 'Rest restored some of your energy.');
}

export async function applyInjury(db: Queryable, playerId: string, input: { kind: InjuryKind; bodyArea?: InjuryBodyArea; severity: number; bleeding: number; pain?: number }) {
  await ensureRuntime(db, playerId);
  await db.query(`INSERT INTO player_injuries(player_id,kind,body_area,severity,bleeding) VALUES($1,$2,$3,$4,$5)`, [playerId,input.kind,input.bodyArea ?? 'general',Math.max(1,Math.min(3,input.severity)),Math.max(0,Math.min(3,input.bleeding))]);
  await db.query(`UPDATE player_needs_runtime SET pain=LEAST(100,pain+$2),updated_at=now() WHERE player_id=$1`, [playerId,input.pain ?? input.severity * 18]);
}

export async function applyMedicalItem(db: Queryable, playerId: string, itemKey: string) {
  await ensureRuntime(db, playerId);
  const map: Record<string, { bleeding?:number; pain?:number; treated?:boolean; minutes?:number }> = {
    bandage:{bleeding:1,treated:true,minutes:45}, gauze:{bleeding:1,treated:true,minutes:40}, antiseptic:{treated:true,minutes:35},
    first_aid_kit:{bleeding:1,pain:8,treated:true,minutes:35}, medkit:{bleeding:2,pain:15,treated:true,minutes:25}, painkillers:{pain:18},
    splint:{pain:10,treated:true,minutes:90}, tourniquet:{bleeding:3,pain:4,treated:true,minutes:60}, trauma_dressing:{bleeding:2,treated:true,minutes:45}, burn_dressing:{pain:8,treated:true,minutes:70}, saline_bag:{pain:4}
  };
  const effect = map[itemKey];
  if (!effect) return false;
  const runtime = (await db.query(`SELECT consciousness,care_state FROM player_needs_runtime WHERE player_id=$1`, [playerId])).rows[0];
  if (runtime?.consciousness === 'unconscious') throw new NeedsCommandError('unconscious_cannot_use_item', 409);
  if (runtime?.care_state === 'transporting') throw new NeedsCommandError('transport_blocks_item_use', 409);
  if (effect.pain) await db.query(`UPDATE player_needs_runtime SET pain=GREATEST(0,pain-$2),updated_at=now() WHERE player_id=$1`, [playerId,effect.pain]);
  if (effect.bleeding !== undefined) await db.query(`UPDATE player_injuries SET bleeding=GREATEST(0,bleeding-$2),treated=true,recovery_until=COALESCE(recovery_until,now()+($3*interval '1 minute')),updated_at=now() WHERE id=(SELECT id FROM player_injuries WHERE player_id=$1 AND bleeding>0 ORDER BY bleeding DESC,severity DESC,created_at LIMIT 1)`, [playerId,effect.bleeding,effect.minutes ?? 60]);
  else if (effect.treated) await db.query(`UPDATE player_injuries SET treated=true,recovery_until=COALESCE(recovery_until,now()+($2*interval '1 minute')),updated_at=now() WHERE id=(SELECT id FROM player_injuries WHERE player_id=$1 AND treated=false ORDER BY severity DESC,created_at LIMIT 1)`, [playerId,effect.minutes ?? 60]);
  return true;
}

export async function syncEmsAssessment(db: Queryable, patientId: string, assessment: { consciousness:string; bleeding:string; pain:number }) {
  await ensureRuntime(db, patientId);
  const consciousness = assessment.consciousness === 'unresponsive' ? 'unconscious' : 'conscious';
  await db.query(`UPDATE player_needs_runtime SET consciousness=$2,pain=GREATEST(pain,$3),updated_at=now() WHERE player_id=$1`, [patientId,consciousness,assessment.pain*10]);
  const bleeding = assessment.bleeding === 'major' ? 3 : assessment.bleeding === 'minor' ? 1 : 0;
  if (bleeding > 0) {
    const existing = await db.query(`SELECT id FROM player_injuries WHERE player_id=$1 AND bleeding>0 ORDER BY created_at DESC LIMIT 1`, [patientId]);
    if (existing.rowCount) await db.query(`UPDATE player_injuries SET bleeding=GREATEST(bleeding,$2),severity=GREATEST(severity,$3),updated_at=now() WHERE id=$1`, [existing.rows[0].id,bleeding,bleeding===3?3:1]);
    else await applyInjury(db, patientId, { kind:'other', bodyArea:'general', severity:bleeding===3?3:1, bleeding, pain:assessment.pain*5 });
  }
}

export async function setEmsTransport(db: Queryable, patientId: string) {
  await ensureRuntime(db, patientId);
  await db.query(`UPDATE player_needs_runtime SET care_state='transporting',updated_at=now() WHERE player_id=$1`, [patientId]);
}

export async function completeEmsHandoff(db: Queryable, patientId: string, transported: boolean) {
  await ensureRuntime(db, patientId);
  if (transported) {
    await db.query(`UPDATE player_needs_runtime SET care_state='admitted',consciousness='conscious',pain=GREATEST(0,pain-35),admitted_until=now()+interval '30 minutes',updated_at=now() WHERE player_id=$1`, [patientId]);
    await db.query(`UPDATE player_injuries SET bleeding=0,treated=true,recovery_until=COALESCE(recovery_until,now()+interval '60 minutes'),updated_at=now() WHERE player_id=$1`, [patientId]);
    await db.query(`UPDATE player_state SET health=GREATEST(health,45),hydration=GREATEST(hydration,40),version=version+1,updated_at=now() WHERE player_id=$1`, [patientId]);
  } else {
    await db.query(`UPDATE player_needs_runtime SET care_state='field',updated_at=now() WHERE player_id=$1`, [patientId]);
  }
}
