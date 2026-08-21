import type { Database } from '../db.js';
import type { JusticeBookRequest, JusticeState } from '@sol-dorado/contracts/justice';
import { JUSTICE_CHARGE_CATALOG, calculateBail, calculateSentence, justiceChargeRule, npcCourtOutcome, npcProsecutionDecision } from '../domain/justice.js';

export class JusticeCommandError extends Error {
  constructor(public readonly code: string, public readonly status = 400) { super(code); }
}

async function requireOfficer(db: Database, playerId: string) {
  const q = await db.query(`SELECT career_status FROM police_profiles WHERE player_id=$1`, [playerId]);
  if (q.rows[0]?.career_status !== 'officer') throw new JusticeCommandError('justice_officer_access_required', 403);
}

async function ensureArrestIntake(db: Database) {
  await db.query(`
    INSERT INTO justice_cases (source_encounter_id,defendant_player_id,defendant_name,status,custody_status)
    SELECT e.id,e.subject_player_id,COALESCE(NULLIF(e.subject_name,''),'Unknown subject'),'arrested','in_custody'
    FROM police_encounters e
    WHERE e.status='arrested'
    ON CONFLICT (source_encounter_id) DO NOTHING
  `);
  await db.query(`
    INSERT INTO justice_case_events (case_id,event_type,actor_kind,note)
    SELECT c.id,'arrest_received','system','Arrest transferred from SDPD into Justice intake.'
    FROM justice_cases c
    WHERE c.source_encounter_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM justice_case_events ev WHERE ev.case_id=c.id AND ev.event_type='arrest_received')
  `);
}

async function syncCorrections(db: Database) {
  await db.query(`UPDATE justice_cases SET custody_status=CASE WHEN probation_until IS NOT NULL AND probation_until>now() THEN 'probation' ELSE 'released' END,updated_at=now() WHERE custody_status='jailed' AND jail_release_at IS NOT NULL AND jail_release_at<=now()`);
  await db.query(`UPDATE justice_cases SET custody_status='released',updated_at=now() WHERE custody_status='probation' AND probation_until IS NOT NULL AND probation_until<=now()`);
  await db.query(`UPDATE justice_player_status SET jailed_until=NULL,updated_at=now() WHERE jailed_until IS NOT NULL AND jailed_until<=now()`);
  await db.query(`UPDATE justice_player_status SET probation_until=NULL,updated_at=now() WHERE probation_until IS NOT NULL AND probation_until<=now()`);
}

async function priorConvictions(db: Database, playerId: string | null, defendantName: string) {
  const q = await db.query(`SELECT count(*)::int AS count FROM justice_records WHERE outcome IN ('guilty','plea') AND (($1::uuid IS NOT NULL AND defendant_player_id=$1) OR ($1::uuid IS NULL AND lower(defendant_name)=lower($2)))`, [playerId, defendantName]);
  return Number(q.rows[0]?.count ?? 0);
}

function iso(value: Date | string) { return new Date(value).toISOString(); }
function isoNullable(value: Date | string | null) { return value ? iso(value) : null; }

export async function getJusticeState(db: Database, _playerId: string): Promise<JusticeState> {
  await ensureArrestIntake(db);
  await syncCorrections(db);
  const [casesQ, recordsQ, dashboardQ] = await Promise.all([
    db.query(`SELECT c.*,
      COALESCE((SELECT json_agg(json_build_object('id',ch.id,'code',ch.code,'label',ch.label,'severity',ch.severity,'count',ch.count,'baseFineCents',ch.base_fine_cents,'baseJailMinutes',ch.base_jail_minutes,'baseBailCents',ch.base_bail_cents,'evidenceStrength',ch.evidence_strength,'status',ch.status) ORDER BY ch.created_at) FROM justice_charges ch WHERE ch.case_id=c.id),'[]'::json) AS charges,
      COALESCE((SELECT json_agg(json_build_object('id',ev.id,'eventType',ev.event_type,'actorKind',ev.actor_kind,'note',ev.note,'details',ev.details,'createdAt',ev.created_at) ORDER BY ev.created_at) FROM justice_case_events ev WHERE ev.case_id=c.id),'[]'::json) AS events
      FROM justice_cases c ORDER BY c.updated_at DESC LIMIT 80`),
    db.query(`SELECT r.*,c.case_number FROM justice_records r JOIN justice_cases c ON c.id=r.case_id ORDER BY r.created_at DESC LIMIT 80`),
    db.query(`SELECT
      (SELECT count(*)::int FROM justice_cases WHERE status='arrested') intake,
      (SELECT count(*)::int FROM justice_cases WHERE status IN ('booked','pretrial')) pretrial,
      (SELECT count(*)::int FROM justice_cases WHERE status='court_pending') awaiting_court,
      (SELECT count(*)::int FROM justice_cases WHERE custody_status='jailed') jailed,
      (SELECT count(*)::int FROM justice_cases WHERE custody_status='probation') probation,
      (SELECT count(*)::int FROM justice_records) total_records`)
  ]);
  const d = dashboardQ.rows[0];
  return {
    serverTime: new Date().toISOString(),
    dashboard: { intake: d.intake, pretrial: d.pretrial, awaitingCourt: d.awaiting_court, jailed: d.jailed, probation: d.probation, totalRecords: d.total_records },
    cases: casesQ.rows.map(r => ({
      id: r.id, caseNumber: Number(r.case_number), sourceEncounterId: r.source_encounter_id, policeReportId: r.police_report_id,
      defendantPlayerId: r.defendant_player_id, defendantName: r.defendant_name, status: r.status, custodyStatus: r.custody_status,
      bailStatus: r.bail_status, bailAmountCents: r.bail_amount_cents, prosecutionDecision: r.prosecution_decision, courtOutcome: r.court_outcome,
      fineBalanceCents: r.fine_balance_cents, jailReleaseAt: isoNullable(r.jail_release_at), probationUntil: isoNullable(r.probation_until),
      bookedAt: isoNullable(r.booked_at), createdAt: iso(r.created_at), updatedAt: iso(r.updated_at),
      charges: (r.charges ?? []).map((ch: any) => ch),
      events: (r.events ?? []).map((ev: any) => ({ ...ev, createdAt: iso(ev.createdAt) }))
    })),
    records: recordsQ.rows.map(r => ({ id: r.id, recordNumber: Number(r.record_number), caseNumber: Number(r.case_number), defendantPlayerId: r.defendant_player_id, defendantName: r.defendant_name, outcome: r.outcome, convictions: r.convictions ?? [], fineCents: r.fine_cents, jailMinutes: r.jail_minutes, probationUntil: isoNullable(r.probation_until), createdAt: iso(r.created_at) })),
    chargeCatalog: JUSTICE_CHARGE_CATALOG.map(rule => ({ ...rule }))
  };
}

export async function bookJusticeCase(db: Database, actorPlayerId: string, input: JusticeBookRequest) {
  await requireOfficer(db, actorPlayerId);
  const resolved = input.charges.map(charge => {
    const rule = justiceChargeRule(charge.code);
    if (!rule) throw new JusticeCommandError('justice_charge_not_found', 400);
    return { ...charge, rule };
  });
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const caseQ = await client.query(`SELECT status FROM justice_cases WHERE id=$1 FOR UPDATE`, [input.caseId]);
    if (!caseQ.rows[0]) throw new JusticeCommandError('justice_case_not_found', 404);
    if (caseQ.rows[0].status !== 'arrested') throw new JusticeCommandError('justice_case_not_in_intake', 409);
    await client.query(`UPDATE justice_cases SET status='booked',police_report_id=$2,booked_at=now(),updated_at=now() WHERE id=$1`, [input.caseId, input.policeReportId ?? null]);
    for (const charge of resolved) {
      await client.query(`INSERT INTO justice_charges (case_id,code,label,severity,count,base_fine_cents,base_jail_minutes,base_bail_cents,evidence_strength) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [input.caseId, charge.rule.code, charge.rule.label, charge.rule.severity, charge.count, charge.rule.baseFineCents, charge.rule.baseJailMinutes, charge.rule.baseBailCents, charge.evidenceStrength]);
    }
    await client.query(`INSERT INTO justice_case_events (case_id,event_type,actor_player_id,actor_kind,note,details) VALUES ($1,'booked',$2,'officer','Defendant booked and charges entered.',$3::jsonb)`, [input.caseId, actorPlayerId, JSON.stringify({ charges: resolved.map(charge => charge.rule.code) })]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  return { justice: await getJusticeState(db, actorPlayerId), noticeBg: 'Booking-ът е завършен и обвиненията са регистрирани.', noticeEn: 'Booking completed and charges were registered.' };
}

export async function justiceBailAction(db: Database, actorPlayerId: string, caseId: string, action: 'calculate' | 'post') {
  await requireOfficer(db, actorPlayerId);
  const caseQ = await db.query(`SELECT * FROM justice_cases WHERE id=$1`, [caseId]);
  const c = caseQ.rows[0];
  if (!c) throw new JusticeCommandError('justice_case_not_found', 404);
  if (action === 'calculate') {
    if (c.status !== 'booked') throw new JusticeCommandError('justice_bail_not_ready', 409);
    const chargesQ = await db.query(`SELECT severity,count,base_bail_cents FROM justice_charges WHERE case_id=$1`, [caseId]);
    const prior = await priorConvictions(db, c.defendant_player_id, c.defendant_name);
    const decision = calculateBail(chargesQ.rows.map(r => ({ severity: r.severity, count: r.count, baseBailCents: r.base_bail_cents })), prior);
    await db.query(`UPDATE justice_cases SET status='pretrial',bail_status=$2,bail_amount_cents=$3,updated_at=now() WHERE id=$1`, [caseId, decision.denied ? 'denied' : 'offered', decision.amountCents]);
    await db.query(`INSERT INTO justice_case_events (case_id,event_type,actor_kind,note,details) VALUES ($1,'bail_decision','npc_magistrate',$2,$3::jsonb)`, [caseId, decision.denied ? 'Bail denied by NPC magistrate.' : 'Bail offered by NPC magistrate.', JSON.stringify({ amountCents: decision.amountCents, priorConvictions: prior })]);
    return { justice: await getJusticeState(db, actorPlayerId), noticeBg: decision.denied ? 'NPC магистратът отказа гаранция.' : 'NPC магистратът определи гаранция.', noticeEn: decision.denied ? 'NPC magistrate denied bail.' : 'NPC magistrate set bail.' };
  }
  if (c.status !== 'pretrial' || c.bail_status !== 'offered') throw new JusticeCommandError('justice_bail_not_postable', 409);
  if (c.defendant_player_id) {
    const paid = await db.query(`UPDATE player_state SET cash_cents=cash_cents-$2,version=version+1,updated_at=now() WHERE player_id=$1 AND cash_cents >= $2 RETURNING player_id`, [c.defendant_player_id, c.bail_amount_cents]);
    if (!paid.rows[0]) throw new JusticeCommandError('justice_insufficient_cash_for_bail', 409);
  }
  await db.query(`UPDATE justice_cases SET bail_status='posted',custody_status='released_bail',updated_at=now() WHERE id=$1`, [caseId]);
  await db.query(`INSERT INTO justice_case_events (case_id,event_type,actor_kind,note,details) VALUES ($1,'bail_posted','system','Bail posted; defendant released pending prosecution.',$2::jsonb)`, [caseId, JSON.stringify({ amountCents: c.bail_amount_cents })]);
  return { justice: await getJusticeState(db, actorPlayerId), noticeBg: 'Гаранцията е платена. Делото остава активно.', noticeEn: 'Bail posted. The case remains active.' };
}

async function persistRecord(db: Database, caseId: string, outcome: 'guilty' | 'plea' | 'not_guilty' | 'dismissed', fineCents: number, jailMinutes: number, probationUntil: Date | null) {
  const cQ = await db.query(`SELECT defendant_player_id,defendant_name FROM justice_cases WHERE id=$1`, [caseId]);
  const chargesQ = await db.query(`SELECT code,label,count FROM justice_charges WHERE case_id=$1 AND status='convicted' ORDER BY created_at`, [caseId]);
  const c = cQ.rows[0];
  await db.query(`INSERT INTO justice_records (case_id,defendant_player_id,defendant_name,outcome,convictions,fine_cents,jail_minutes,probation_until) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8) ON CONFLICT (case_id) DO UPDATE SET outcome=EXCLUDED.outcome,convictions=EXCLUDED.convictions,fine_cents=EXCLUDED.fine_cents,jail_minutes=EXCLUDED.jail_minutes,probation_until=EXCLUDED.probation_until`, [caseId, c.defendant_player_id, c.defendant_name, outcome, JSON.stringify(chargesQ.rows), fineCents, jailMinutes, probationUntil]);
}

export async function justiceProsecution(db: Database, actorPlayerId: string, caseId: string) {
  await requireOfficer(db, actorPlayerId);
  const caseQ = await db.query(`SELECT * FROM justice_cases WHERE id=$1`, [caseId]);
  const c = caseQ.rows[0];
  if (!c) throw new JusticeCommandError('justice_case_not_found', 404);
  if (c.status !== 'pretrial') throw new JusticeCommandError('justice_prosecution_not_ready', 409);
  const chargesQ = await db.query(`SELECT id,evidence_strength,count FROM justice_charges WHERE case_id=$1`, [caseId]);
  const decision = npcProsecutionDecision(chargesQ.rows.map(r => ({ evidenceStrength: r.evidence_strength, count: r.count })));
  if (decision === 'declined') {
    await db.query(`UPDATE justice_charges SET status='dropped' WHERE case_id=$1`, [caseId]);
    await db.query(`UPDATE justice_cases SET status='dismissed',custody_status='released',prosecution_decision='declined',court_outcome='dismissed',bail_status=CASE WHEN bail_status='pending' THEN 'not_applicable' ELSE bail_status END,updated_at=now() WHERE id=$1`, [caseId]);
    await db.query(`INSERT INTO justice_case_events (case_id,event_type,actor_kind,note) VALUES ($1,'prosecution_declined','npc_prosecutor','NPC prosecutor declined to file charges.')`, [caseId]);
    await persistRecord(db, caseId, 'dismissed', 0, 0, null);
  } else {
    await db.query(`UPDATE justice_charges SET status='filed' WHERE case_id=$1`, [caseId]);
    await db.query(`UPDATE justice_cases SET status='court_pending',prosecution_decision='filed',updated_at=now() WHERE id=$1`, [caseId]);
    await db.query(`INSERT INTO justice_case_events (case_id,event_type,actor_kind,note) VALUES ($1,'charges_filed','npc_prosecutor','NPC prosecutor filed the case for court.')`, [caseId]);
  }
  return { justice: await getJusticeState(db, actorPlayerId), noticeBg: decision === 'filed' ? 'NPC прокуратурата внесе обвиненията в съда.' : 'NPC прокуратурата прекрати делото.', noticeEn: decision === 'filed' ? 'NPC prosecutor filed the case with the court.' : 'NPC prosecutor declined the case.' };
}

export async function justiceCourt(db: Database, actorPlayerId: string, caseId: string) {
  await requireOfficer(db, actorPlayerId);
  const caseQ = await db.query(`SELECT * FROM justice_cases WHERE id=$1`, [caseId]);
  const c = caseQ.rows[0];
  if (!c) throw new JusticeCommandError('justice_case_not_found', 404);
  if (c.status !== 'court_pending' || c.prosecution_decision !== 'filed') throw new JusticeCommandError('justice_court_not_ready', 409);
  const chargesQ = await db.query(`SELECT * FROM justice_charges WHERE case_id=$1 AND status='filed'`, [caseId]);
  const outcome = npcCourtOutcome(chargesQ.rows.map(r => ({ evidenceStrength: r.evidence_strength, count: r.count })));
  if (outcome === 'not_guilty') {
    await db.query(`UPDATE justice_charges SET status='acquitted' WHERE case_id=$1`, [caseId]);
    await db.query(`UPDATE justice_cases SET status='dismissed',custody_status='released',court_outcome='not_guilty',fine_balance_cents=0,updated_at=now() WHERE id=$1`, [caseId]);
    await db.query(`INSERT INTO justice_case_events (case_id,event_type,actor_kind,note) VALUES ($1,'court_acquittal','npc_court','NPC court returned a not-guilty outcome.')`, [caseId]);
    await persistRecord(db, caseId, 'not_guilty', 0, 0, null);
    return { justice: await getJusticeState(db, actorPlayerId), noticeBg: 'NPC съдът постанови: невинен.', noticeEn: 'NPC court returned: not guilty.' };
  }
  const prior = await priorConvictions(db, c.defendant_player_id, c.defendant_name);
  const sentence = calculateSentence(chargesQ.rows.map(r => ({ severity: r.severity, count: r.count, baseFineCents: r.base_fine_cents, baseJailMinutes: r.base_jail_minutes })), outcome, prior);
  const jailReleaseAt = sentence.jailMinutes > 0 ? new Date(Date.now() + sentence.jailMinutes * 60_000) : null;
  const probationUntil = sentence.probationDays > 0 ? new Date(Date.now() + sentence.probationDays * 86_400_000) : null;
  const custody = sentence.jailMinutes > 0 ? 'jailed' : probationUntil ? 'probation' : 'released';
  await db.query(`UPDATE justice_charges SET status='convicted' WHERE case_id=$1`, [caseId]);
  await db.query(`UPDATE justice_cases SET status='sentenced',custody_status=$2,court_outcome=$3,fine_balance_cents=$4,jail_release_at=$5,probation_until=$6,updated_at=now() WHERE id=$1`, [caseId, custody, outcome, sentence.fineCents, jailReleaseAt, probationUntil]);
  await db.query(`INSERT INTO justice_case_events (case_id,event_type,actor_kind,note,details) VALUES ($1,'sentence_imposed','npc_court','NPC court imposed sentence.',$2::jsonb)`, [caseId, JSON.stringify({ outcome, fineCents: sentence.fineCents, jailMinutes: sentence.jailMinutes, probationDays: sentence.probationDays })]);
  await persistRecord(db, caseId, outcome, sentence.fineCents, sentence.jailMinutes, probationUntil);
  if (c.defendant_player_id) {
    await db.query(`INSERT INTO justice_player_status (player_id,outstanding_fines_cents,jailed_until,probation_until) VALUES ($1,$2,$3,$4) ON CONFLICT (player_id) DO UPDATE SET outstanding_fines_cents=justice_player_status.outstanding_fines_cents+EXCLUDED.outstanding_fines_cents,jailed_until=CASE WHEN justice_player_status.jailed_until IS NULL OR EXCLUDED.jailed_until>justice_player_status.jailed_until THEN EXCLUDED.jailed_until ELSE justice_player_status.jailed_until END,probation_until=CASE WHEN justice_player_status.probation_until IS NULL OR EXCLUDED.probation_until>justice_player_status.probation_until THEN EXCLUDED.probation_until ELSE justice_player_status.probation_until END,updated_at=now()`, [c.defendant_player_id, sentence.fineCents, jailReleaseAt, probationUntil]);
  }
  return { justice: await getJusticeState(db, actorPlayerId), noticeBg: `NPC съдът приключи делото: ${outcome}.`, noticeEn: `NPC court resolved the case: ${outcome}.` };
}
