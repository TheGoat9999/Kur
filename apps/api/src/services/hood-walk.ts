import { randomInt } from 'node:crypto';
import type { PoolClient } from 'pg';
import {
  HoodWalkMutationResultSchema,
  HoodWalkStateSchema,
  HOOD_WALK_MAX_STEPS,
  type HoodWalkCommand,
  type HoodWalkEventId,
  type HoodWalkMutationResult,
  type HoodWalkState,
  type HoodWalkStreetMemory
} from '@sol-dorado/contracts/hood-walk';
import type { Database } from '../db.js';
import { buildHoodWalkEncounter, buildHoodWalkLeads, resolveHoodWalkChoice, summarizeHoodWalk } from '../domain/hood-walk.js';
import { addStreetReward, lockStreetProgress, WorldActionCommandError } from './street-world.js';
import { getBootstrapState } from './player-state.js';

export class HoodWalkCommandError extends Error {
  constructor(public readonly code: string, public readonly status: number) { super(code); }
}

type RunRow = Record<string, any>;

export async function getHoodWalkState(db: Database, playerId: string): Promise<HoodWalkState> {
  const client = await db.connect();
  try {
    const progress = await lockStreetProgress(client, playerId);
    const memory = await ensureMemory(client, playerId, progress.currentSegmentId);
    const result = await client.query(
      `SELECT * FROM hood_walk_runs WHERE player_id=$1 ORDER BY (status='active') DESC, started_at DESC LIMIT 1`,
      [playerId]
    );
    const run = result.rows[0];
    if (!run || (run.status !== 'active' && run.segment_id !== progress.currentSegmentId)) return idleState(progress.currentSegmentId, memory);
    return mapRun(run, memory);
  } finally { client.release(); }
}

export async function runHoodWalkCommand(db: Database, playerId: string, command: HoodWalkCommand): Promise<HoodWalkMutationResult> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const duplicate = await client.query('SELECT result FROM hood_walk_command_log WHERE player_id=$1 AND request_id=$2', [playerId, command.requestId]);
    if (duplicate.rows[0]) {
      await client.query('COMMIT');
      return HoodWalkMutationResultSchema.parse(duplicate.rows[0].result);
    }
    let result: HoodWalkMutationResult;
    if (command.command === 'start') result = await startRun(client, playerId, command.expectedVersion);
    else if (command.command === 'pick_lead') result = await pickLead(client, playerId, command.runId, command.leadId);
    else if (command.command === 'choose') result = await chooseEncounter(client, playerId, command.runId, command.encounterId, command.choiceId, command.expectedVersion);
    else result = await endRun(client, playerId, command.runId);
    await client.query('INSERT INTO hood_walk_command_log (player_id,request_id,command,result) VALUES ($1,$2,$3,$4)', [playerId, command.requestId, command.command, result]);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof HoodWalkCommandError || error instanceof WorldActionCommandError) throw error;
    throw error;
  } finally { client.release(); }
}

async function startRun(client: PoolClient, playerId: string, expectedVersion: number): Promise<HoodWalkMutationResult> {
  const stateRow = await lockPlayerState(client, playerId, expectedVersion);
  if (Number(stateRow.energy) < 8) throw new HoodWalkCommandError('hood_walk_not_enough_energy', 409);
  const progress = await lockStreetProgress(client, playerId);
  const active = await client.query(`SELECT * FROM hood_walk_runs WHERE player_id=$1 AND status='active' FOR UPDATE`, [playerId]);
  if (active.rows[0]) {
    const memory = await ensureMemory(client, playerId, active.rows[0].segment_id);
    return HoodWalkMutationResultSchema.parse({ hood:mapRun(active.rows[0], memory), state:null, noticeId:'started' });
  }
  const memory = await ensureMemory(client, playerId, progress.currentSegmentId);
  const seed = randomInt(1, 2_147_483_000);
  const leads = buildHoodWalkLeads({ seed, step:0, segmentId:progress.currentSegmentId, clues:0, memory, seenEventIds:[] });
  const inserted = await client.query({
    text:`INSERT INTO hood_walk_runs (player_id,segment_id,seed,current_leads) VALUES ($1,$2,$3,$4::jsonb) RETURNING *`,
    values:[playerId, progress.currentSegmentId, seed, JSON.stringify(leads)]
  });
  return HoodWalkMutationResultSchema.parse({ hood:mapRun(inserted.rows[0], memory), state:null, noticeId:'started' });
}

async function pickLead(client: PoolClient, playerId: string, runId: string, leadId: string): Promise<HoodWalkMutationResult> {
  const run = await lockActiveRun(client, playerId, runId);
  const memory = await ensureMemory(client, playerId, run.segment_id);
  const hood = mapRun(run, memory);
  if (hood.phase !== 'leads') throw new HoodWalkCommandError('hood_walk_not_waiting_for_lead', 409);
  const lead = hood.leads.find(item => item.id === leadId);
  if (!lead) throw new HoodWalkCommandError('hood_walk_lead_expired', 409);
  const encounter = buildHoodWalkEncounter(runId, hood.step, lead);
  const updated = await client.query({
    text:`UPDATE hood_walk_runs SET current_leads='[]'::jsonb,current_encounter=$2::jsonb,last_outcome=NULL,updated_at=now() WHERE id=$1 RETURNING *`,
    values:[runId, JSON.stringify(encounter)]
  });
  return HoodWalkMutationResultSchema.parse({ hood:mapRun(updated.rows[0], memory), state:null, noticeId:'lead_picked' });
}

async function chooseEncounter(client: PoolClient, playerId: string, runId: string, encounterId: string, choiceId: string, expectedVersion: number): Promise<HoodWalkMutationResult> {
  const run = await lockActiveRun(client, playerId, runId);
  const memory = await ensureMemory(client, playerId, run.segment_id, true);
  const hood = mapRun(run, memory);
  if (!hood.encounter || hood.encounter.id !== encounterId) throw new HoodWalkCommandError('hood_walk_encounter_expired', 409);
  const row = await lockPlayerState(client, playerId, expectedVersion);
  const outcome = resolveHoodWalkChoice({ seed:hood.seed, step:hood.step, eventId:hood.encounter.eventId, choiceId, danger:hood.danger });
  if (!outcome) throw new HoodWalkCommandError('hood_walk_choice_invalid', 400);

  let energy = Number(row.energy), stress = Number(row.stress), policeHeat = Number(row.police_heat), cashCents = Number(row.cash_cents);
  let momentum = hood.momentum, danger = hood.danger, clues = hood.clues, familiarity = memory.familiarity;
  let helpfulActs = memory.helpfulActs;
  for (const item of outcome.effects) {
    const amount = item.amount ?? 0;
    if (item.kind === 'energy') energy = clamp(energy + amount);
    else if (item.kind === 'stress') stress = clamp(stress + amount);
    else if (item.kind === 'police_heat') policeHeat = clamp(policeHeat + amount);
    else if (item.kind === 'cash') cashCents = Math.max(0, cashCents + amount);
    else if (item.kind === 'momentum') momentum = clamp10(momentum + amount);
    else if (item.kind === 'danger') danger = clamp10(danger + amount);
    else if (item.kind === 'clue') clues = clamp10(clues + amount);
    else if (item.kind === 'familiarity') familiarity = clamp(familiarity + amount);
    else if (item.kind === 'item' && item.itemKey) {
      const definitionName = item.itemKey === 'water_bottle' ? 'Water Bottle' : item.itemKey === 'duct_tape' ? 'Duct Tape' : item.itemKey;
      await addStreetReward(client, playerId, { itemKey:item.itemKey, displayName:definitionName, quantity:Math.max(1,amount || 1) });
    }
  }
  if (outcome.effects.some(item => item.kind === 'familiarity' && (item.amount ?? 0) >= 2)) helpfulActs += 1;

  const seenEventIds = uniqueEvents([...hood.seenEventIds, hood.encounter.eventId], 12);
  const recentEventIds = uniqueEvents([...memory.recentEventIds, hood.encounter.eventId], 8);
  const step = hood.step + 1;
  const nextMemory: HoodWalkStreetMemory = { ...memory, familiarity, helpfulActs, recentEventIds };
  const completed = step >= HOOD_WALK_MAX_STEPS || energy <= 3;
  const reason = energy <= 3 ? 'exhausted' : 'route_complete';
  const summary = completed ? summarizeHoodWalk({ reason, step, momentum, danger, clues, memory:nextMemory }) : null;
  if (completed) nextMemory.completedRuns += 1;
  const leads = completed ? [] : buildHoodWalkLeads({ seed:hood.seed, step, segmentId:run.segment_id, clues, memory:nextMemory, seenEventIds });

  await client.query({
    text:`UPDATE player_state SET version=version+1,energy=$2,stress=$3,police_heat=$4,cash_cents=$5,updated_at=now() WHERE player_id=$1`,
    values:[playerId,energy,stress,policeHeat,cashCents]
  });
  await saveMemory(client, playerId, nextMemory);
  const updated = await client.query({
    text:`UPDATE hood_walk_runs SET status=$2,step=$3,momentum=$4,danger=$5,clues=$6,seen_event_ids=$7,current_leads=$8::jsonb,current_encounter=NULL,last_outcome=$9::jsonb,summary=$10::jsonb,updated_at=now(),completed_at=$11 WHERE id=$1 RETURNING *`,
    values:[runId,completed?'completed':'active',step,momentum,danger,clues,seenEventIds,JSON.stringify(leads),JSON.stringify(outcome),summary?JSON.stringify(summary):null,completed?new Date():null]
  });
  const state = await getBootstrapState(client, playerId);
  if (!state) throw new HoodWalkCommandError('player_not_found', 404);
  return HoodWalkMutationResultSchema.parse({ hood:mapRun(updated.rows[0], nextMemory), state, noticeId:completed?'completed':'choice_resolved' });
}

async function endRun(client: PoolClient, playerId: string, runId: string): Promise<HoodWalkMutationResult> {
  const run = await lockActiveRun(client, playerId, runId);
  const memory = await ensureMemory(client, playerId, run.segment_id);
  const hood = mapRun(run, memory);
  const summary = summarizeHoodWalk({ reason:'left_early', step:hood.step, momentum:hood.momentum, danger:hood.danger, clues:hood.clues, memory });
  const updated = await client.query({
    text:`UPDATE hood_walk_runs SET status='ended',current_leads='[]'::jsonb,current_encounter=NULL,summary=$2::jsonb,updated_at=now(),completed_at=now() WHERE id=$1 RETURNING *`,
    values:[runId,JSON.stringify(summary)]
  });
  return HoodWalkMutationResultSchema.parse({ hood:mapRun(updated.rows[0], memory), state:null, noticeId:'ended' });
}

async function lockPlayerState(client: PoolClient, playerId: string, expectedVersion: number) {
  const result = await client.query('SELECT * FROM player_state WHERE player_id=$1 FOR UPDATE',[playerId]);
  const row = result.rows[0];
  if (!row) throw new HoodWalkCommandError('player_not_found',404);
  if (Number(row.version) !== expectedVersion) throw new HoodWalkCommandError('state_version_conflict',409);
  return row;
}
async function lockActiveRun(client: PoolClient, playerId: string, runId: string): Promise<RunRow> {
  const result = await client.query(`SELECT * FROM hood_walk_runs WHERE id=$1 AND player_id=$2 AND status='active' FOR UPDATE`,[runId,playerId]);
  if (!result.rows[0]) throw new HoodWalkCommandError('hood_walk_run_not_active',409);
  return result.rows[0];
}
async function ensureMemory(client: PoolClient, playerId: string, segmentId: string, lock=false): Promise<HoodWalkStreetMemory> {
  await client.query(`INSERT INTO hood_walk_street_memory (player_id,segment_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,[playerId,segmentId]);
  const result = await client.query(`SELECT * FROM hood_walk_street_memory WHERE player_id=$1 AND segment_id=$2 ${lock?'FOR UPDATE':''}`,[playerId,segmentId]);
  const row = result.rows[0];
  return { segmentId:row.segment_id, familiarity:Number(row.familiarity), completedRuns:Number(row.completed_runs), helpfulActs:Number(row.helpful_acts), recentEventIds:(row.recent_event_ids ?? []) as HoodWalkEventId[] };
}
async function saveMemory(client: PoolClient, playerId: string, memory: HoodWalkStreetMemory) {
  await client.query(`UPDATE hood_walk_street_memory SET familiarity=$3,completed_runs=$4,helpful_acts=$5,recent_event_ids=$6,updated_at=now() WHERE player_id=$1 AND segment_id=$2`,[playerId,memory.segmentId,memory.familiarity,memory.completedRuns,memory.helpfulActs,memory.recentEventIds]);
}
function idleState(segmentId:string, memory:HoodWalkStreetMemory): HoodWalkState {
  return HoodWalkStateSchema.parse({ phase:'idle',runId:null,segmentId,seed:0,step:0,maxSteps:HOOD_WALK_MAX_STEPS,momentum:0,danger:0,clues:0,leads:[],encounter:null,lastOutcome:null,seenEventIds:[],summary:null,memory });
}
function mapRun(row:RunRow, memory:HoodWalkStreetMemory): HoodWalkState {
  const complete = row.status !== 'active';
  const encounter = row.current_encounter ?? null;
  const phase = complete ? 'complete' : encounter ? 'encounter' : 'leads';
  return HoodWalkStateSchema.parse({ phase,runId:row.id,segmentId:row.segment_id,seed:Number(row.seed),step:Number(row.step),maxSteps:HOOD_WALK_MAX_STEPS,momentum:Number(row.momentum),danger:Number(row.danger),clues:Number(row.clues),leads:row.current_leads ?? [],encounter,lastOutcome:row.last_outcome ?? null,seenEventIds:row.seen_event_ids ?? [],summary:row.summary ?? null,memory });
}
function uniqueEvents(values:HoodWalkEventId[], limit:number) { return [...new Set(values)].slice(-limit); }
function clamp(value:number) { return Math.max(0,Math.min(100,Math.round(value))); }
function clamp10(value:number) { return Math.max(0,Math.min(10,Math.round(value))); }
