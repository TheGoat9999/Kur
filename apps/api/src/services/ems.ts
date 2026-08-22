import type { PoolClient } from 'pg';
import {
  EmsAccessSchema,
  EmsMutationResultSchema,
  EmsReportResultSchema,
  EmsStateSchema,
  type EmsCall,
  type EmsOutcome,
  type EmsPriority,
  type EmsState,
  type EmsTreatment
} from '@sol-dorado/contracts/ems';
import type { Database } from '../db.js';
import { emsCallPayout, nextEmsReputation, treatmentEffect } from '../domain/ems.js';

type Queryable = Database | PoolClient;

export class EmsCommandError extends Error {
  constructor(public readonly code: string, public readonly status: number) { super(code); }
}

export async function getEmsAccess(db: Queryable, playerId: string) {
  const result = await db.query(`SELECT employed FROM ems_profiles WHERE player_id = $1`, [playerId]);
  return EmsAccessSchema.parse({ staffAccess: Boolean(result.rows[0]?.employed) });
}

async function requireEmsEmployment(db: Queryable, playerId: string) {
  const access = await getEmsAccess(db, playerId);
  if (!access.staffAccess) throw new EmsCommandError('ems_employment_required', 403);
}

function callFromRow(row: any, playerId: string): EmsCall {
  return {
    id: row.id,
    callNumber: Number(row.call_number),
    patientName: row.patient_name ?? 'Гражданин',
    reporterName: row.reporter_name ?? 'Гражданин',
    priority: row.priority,
    incidentType: row.incident_type,
    summary: row.summary,
    status: row.status,
    assignedResponderName: row.responder_name ?? null,
    assignedToMe: row.assigned_ems_player_id === playerId,
    location: {
      streetSegmentId: row.street_segment_id,
      streetLabel: row.street_label ?? row.street_segment_id,
      positionX: Number(row.position_x),
      positionY: Number(row.position_y)
    },
    assessment: row.consciousness ? {
      consciousness: row.consciousness,
      breathing: row.breathing,
      bleeding: row.bleeding,
      pain: Number(row.pain),
      notes: row.assessment_notes ?? '',
      updatedAt: new Date(row.assessment_updated_at).toISOString()
    } : null,
    treatments: Array.isArray(row.treatments) ? row.treatments.map((entry: any) => ({
      id: entry.id,
      treatment: entry.treatment,
      effect: Number(entry.effect),
      createdAt: new Date(entry.createdAt).toISOString()
    })) : [],
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

async function loadCalls(db: Queryable, playerId: string) {
  const result = await db.query(`
    SELECT c.*,
      COALESCE(pc.display_name, 'Гражданин') AS patient_name,
      COALESCE(rc.display_name, 'Гражданин') AS reporter_name,
      ec.display_name AS responder_name,
      ps.street_segment AS street_label,
      a.consciousness, a.breathing, a.bleeding, a.pain, a.notes AS assessment_notes, a.updated_at AS assessment_updated_at,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'treatment', t.treatment, 'effect', t.effect, 'createdAt', t.created_at) ORDER BY t.created_at) FROM ems_treatments t WHERE t.call_id = c.id), '[]'::jsonb) AS treatments
    FROM ems_calls c
    LEFT JOIN characters pc ON pc.player_id = c.patient_player_id AND pc.is_active = true
    LEFT JOIN characters rc ON rc.player_id = c.reporter_player_id AND rc.is_active = true
    LEFT JOIN characters ec ON ec.player_id = c.assigned_ems_player_id AND ec.is_active = true
    LEFT JOIN player_state ps ON ps.player_id = c.patient_player_id
    LEFT JOIN ems_assessments a ON a.call_id = c.id
    WHERE c.status NOT IN ('closed','cancelled')
    ORDER BY CASE c.priority WHEN 'p1' THEN 1 WHEN 'p2' THEN 2 WHEN 'p3' THEN 3 ELSE 4 END, c.created_at
    LIMIT 40
  `);
  return result.rows.map(row => callFromRow(row, playerId));
}

export async function getEmsState(db: Queryable, playerId: string): Promise<EmsState> {
  await requireEmsEmployment(db, playerId);
  const [profileResult, calls, recordsResult] = await Promise.all([
    db.query(`SELECT employed, rank, on_duty, calls_completed, reputation, shift_earnings_cents, active_call_id FROM ems_profiles WHERE player_id = $1`, [playerId]),
    loadCalls(db, playerId),
    db.query(`
      SELECT r.id, r.call_id, c.call_number, COALESCE(pc.display_name, 'Гражданин') AS patient_name,
        r.outcome, c.priority, c.incident_type, COALESCE(ec.display_name, 'EMS') AS responder_name,
        r.notes, r.procedures, r.created_at
      FROM ems_patient_records r
      JOIN ems_calls c ON c.id = r.call_id
      LEFT JOIN characters pc ON pc.player_id = r.patient_player_id AND pc.is_active = true
      LEFT JOIN characters ec ON ec.player_id = r.responder_player_id AND ec.is_active = true
      ORDER BY r.created_at DESC LIMIT 30
    `)
  ]);
  const profileRow = profileResult.rows[0];
  const activeCall = profileRow.active_call_id ? calls.find(call => call.id === profileRow.active_call_id) ?? null : null;
  return EmsStateSchema.parse({
    profile: {
      employed: Boolean(profileRow.employed),
      rank: profileRow.rank,
      onDuty: profileRow.on_duty,
      callsCompleted: Number(profileRow.calls_completed),
      reputation: Number(profileRow.reputation),
      shiftEarningsCents: Number(profileRow.shift_earnings_cents),
      activeCallId: profileRow.active_call_id
    },
    dispatch: calls.filter(call => call.status === 'pending'),
    activeCall,
    records: recordsResult.rows.map(row => ({
      id: row.id,
      callId: row.call_id,
      callNumber: Number(row.call_number),
      patientName: row.patient_name,
      outcome: row.outcome,
      priority: row.priority,
      incidentType: row.incident_type,
      responderName: row.responder_name,
      notes: row.notes,
      procedures: Array.isArray(row.procedures) ? row.procedures : [],
      createdAt: new Date(row.created_at).toISOString()
    }))
  });
}

async function result(db: Queryable, playerId: string, noticeBg: string, noticeEn: string) {
  return EmsMutationResultSchema.parse({ ems: await getEmsState(db, playerId), noticeBg, noticeEn });
}

export async function setEmsDuty(db: Database, playerId: string, onDuty: boolean) {
  await requireEmsEmployment(db, playerId);
  if (!onDuty) {
    const current = await db.query(`SELECT active_call_id FROM ems_profiles WHERE player_id = $1`, [playerId]);
    if (current.rows[0]?.active_call_id) throw new EmsCommandError('ems_active_call_blocks_off_duty', 409);
  }
  await db.query(`UPDATE ems_profiles SET on_duty = $2, shift_earnings_cents = CASE WHEN $2 THEN shift_earnings_cents ELSE 0 END, updated_at = now() WHERE player_id = $1`, [playerId, onDuty]);
  return result(db, playerId, onDuty ? 'Влезе на EMS дежурство.' : 'Приключи EMS дежурството.', onDuty ? 'You are now on EMS duty.' : 'EMS duty ended.');
}

export async function reportEmsCall(db: Database, playerId: string, priority: EmsPriority, incidentType: string, summary: string) {
  const location = await db.query(`
    SELECT s.current_segment_id, s.position_x, s.position_y, p.street_segment
    FROM player_street_state s JOIN player_state p ON p.player_id = s.player_id WHERE s.player_id = $1
  `, [playerId]);
  const row = location.rows[0];
  if (!row) throw new EmsCommandError('ems_location_unavailable', 409);
  await db.query(`INSERT INTO ems_calls (reporter_player_id, patient_player_id, priority, incident_type, summary, street_segment_id, position_x, position_y) VALUES ($1,$1,$2,$3,$4,$5,$6,$7)`, [playerId, priority, incidentType, summary, row.current_segment_id, row.position_x, row.position_y]);
  return EmsReportResultSchema.parse({ noticeBg: 'Сигналът е изпратен към 112.', noticeEn: 'The emergency call was sent to dispatch.' });
}

export async function acceptEmsCall(db: Database, playerId: string, callId: string) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await requireEmsEmployment(client, playerId);
    const profile = await client.query(`SELECT on_duty, active_call_id FROM ems_profiles WHERE player_id = $1 FOR UPDATE`, [playerId]);
    if (!profile.rows[0]?.on_duty) throw new EmsCommandError('ems_not_on_duty', 409);
    if (profile.rows[0].active_call_id) throw new EmsCommandError('ems_responder_already_assigned', 409);
    const call = await client.query(`SELECT status FROM ems_calls WHERE id = $1 FOR UPDATE`, [callId]);
    if (!call.rows[0]) throw new EmsCommandError('ems_call_not_found', 404);
    if (call.rows[0].status !== 'pending') throw new EmsCommandError('ems_call_not_available', 409);
    await client.query(`UPDATE ems_calls SET assigned_ems_player_id = $2, status = 'assigned', updated_at = now() WHERE id = $1`, [callId, playerId]);
    await client.query(`UPDATE ems_profiles SET active_call_id = $2, updated_at = now() WHERE player_id = $1`, [playerId, callId]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  return result(db, playerId, 'Прие повикването. Потвърди тръгване към адреса.', 'Call accepted. Confirm when you are en route.');
}

export async function updateEmsCallStatus(db: Database, playerId: string, callId: string, status: 'en_route'|'on_scene'|'transporting') {
  await requireEmsEmployment(db, playerId);
  const call = await db.query(`SELECT status, assigned_ems_player_id FROM ems_calls WHERE id = $1`, [callId]);
  const row = call.rows[0];
  if (!row) throw new EmsCommandError('ems_call_not_found', 404);
  if (row.assigned_ems_player_id !== playerId) throw new EmsCommandError('ems_call_not_assigned_to_you', 403);
  const allowed: Record<string, string[]> = { assigned: ['en_route'], en_route: ['on_scene'], on_scene: ['transporting'], transporting: [] };
  if (!allowed[row.status]?.includes(status)) throw new EmsCommandError('ems_invalid_status_transition', 409);
  await db.query(`UPDATE ems_calls SET status = $2, updated_at = now() WHERE id = $1`, [callId, status]);
  const copy = status === 'en_route' ? ['Екипът е на път.', 'Unit is en route.'] : status === 'on_scene' ? ['Пристигна на място. Започни оценка на пациента.', 'On scene. Begin patient assessment.'] : ['Транспортът към болница е започнат.', 'Transport to hospital started.'];
  return result(db, playerId, copy[0]!, copy[1]!);
}

async function requireClinicalAccess(db: Queryable, playerId: string, callId: string) {
  await requireEmsEmployment(db, playerId);
  const call = await db.query(`SELECT assigned_ems_player_id, status, patient_player_id FROM ems_calls WHERE id = $1`, [callId]);
  const row = call.rows[0];
  if (!row) throw new EmsCommandError('ems_call_not_found', 404);
  if (row.assigned_ems_player_id !== playerId) throw new EmsCommandError('ems_call_not_assigned_to_you', 403);
  if (!['on_scene','transporting'].includes(row.status)) throw new EmsCommandError('ems_not_at_patient', 409);
  return row;
}

export async function saveEmsAssessment(db: Database, playerId: string, input: { callId: string; consciousness: string; breathing: string; bleeding: string; pain: number; notes: string }) {
  await requireClinicalAccess(db, playerId, input.callId);
  await db.query(`
    INSERT INTO ems_assessments (call_id, responder_player_id, consciousness, breathing, bleeding, pain, notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT (call_id) DO UPDATE SET responder_player_id = EXCLUDED.responder_player_id, consciousness = EXCLUDED.consciousness, breathing = EXCLUDED.breathing, bleeding = EXCLUDED.bleeding, pain = EXCLUDED.pain, notes = EXCLUDED.notes, updated_at = now()
  `, [input.callId, playerId, input.consciousness, input.breathing, input.bleeding, input.pain, input.notes]);
  return result(db, playerId, 'Оценката е записана в EMS MDT.', 'Assessment saved to the EMS MDT.');
}

export async function applyEmsTreatment(db: Database, playerId: string, callId: string, treatment: EmsTreatment) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const call = await requireClinicalAccess(client, playerId, callId);
    const assessment = await client.query(`SELECT 1 FROM ems_assessments WHERE call_id = $1`, [callId]);
    if (!assessment.rowCount) throw new EmsCommandError('ems_assessment_required', 409);
    const effect = treatmentEffect(treatment);
    await client.query(`INSERT INTO ems_treatments (call_id, responder_player_id, treatment, effect) VALUES ($1,$2,$3,$4)`, [callId, playerId, treatment, effect]);
    await client.query(`UPDATE player_state SET health = LEAST(100, health + $2), version = version + 1, updated_at = now() WHERE player_id = $1`, [call.patient_player_id, effect]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  return result(db, playerId, 'Лечението е приложено и състоянието е записано.', 'Treatment applied and state persisted.');
}

export async function handoffEmsCall(db: Database, playerId: string, callId: string, outcome: EmsOutcome, notes: string) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await requireEmsEmployment(client, playerId);
    const callResult = await client.query(`SELECT * FROM ems_calls WHERE id = $1 FOR UPDATE`, [callId]);
    const call = callResult.rows[0];
    if (!call) throw new EmsCommandError('ems_call_not_found', 404);
    if (call.assigned_ems_player_id !== playerId) throw new EmsCommandError('ems_call_not_assigned_to_you', 403);
    if (!['on_scene','transporting'].includes(call.status)) throw new EmsCommandError('ems_handoff_not_available', 409);
    const assessment = await client.query(`SELECT 1 FROM ems_assessments WHERE call_id = $1`, [callId]);
    if (!assessment.rowCount && outcome !== 'refused') throw new EmsCommandError('ems_assessment_required', 409);
    const treatments = await client.query(`SELECT treatment FROM ems_treatments WHERE call_id = $1 ORDER BY created_at`, [callId]);
    const procedures = treatments.rows.map(row => row.treatment as EmsTreatment);
    const profile = await client.query(`SELECT reputation FROM ems_profiles WHERE player_id = $1 FOR UPDATE`, [playerId]);
    const payout = emsCallPayout(call.priority, procedures.length);
    const reputation = nextEmsReputation(Number(profile.rows[0]?.reputation ?? 50), call.priority, Boolean(assessment.rowCount), procedures.length);
    await client.query(`INSERT INTO ems_patient_records (call_id, patient_player_id, responder_player_id, outcome, notes, procedures) VALUES ($1,$2,$3,$4,$5,$6::jsonb)`, [callId, call.patient_player_id, playerId, outcome, notes, JSON.stringify(procedures)]);
    await client.query(`UPDATE ems_calls SET status = 'closed', closed_at = now(), updated_at = now() WHERE id = $1`, [callId]);
    await client.query(`UPDATE ems_profiles SET active_call_id = NULL, calls_completed = calls_completed + 1, reputation = $2, shift_earnings_cents = shift_earnings_cents + $3, updated_at = now() WHERE player_id = $1`, [playerId, reputation, payout]);
    await client.query(`UPDATE player_state SET cash_cents = cash_cents + $2, version = version + 1, updated_at = now() WHERE player_id = $1`, [playerId, payout]);
    await client.query('COMMIT');
    return result(db, playerId, `Случаят е приключен. Заплащане: $${(payout / 100).toFixed(2)}.`, `Case closed. Payout: $${(payout / 100).toFixed(2)}.`);
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
