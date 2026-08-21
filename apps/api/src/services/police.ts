import type { Database } from '../db.js';
import type {
  PoliceState,
  PoliceCareerStatus
} from '@sol-dorado/contracts/police';

export class PoliceCommandError extends Error {
  constructor(public readonly code: string, public readonly status = 400) { super(code); }
}

export type PursuitAction = 'aggressive' | 'maintain_visual' | 'predict_route' | 'request_backup' | 'containment' | 'back_off' | 'lose_visual' | 'refresh_search' | 'contain' | 'end';

export function evaluateFieldAction(input: { action: string; legalGround: string; detained: boolean; searched: boolean }) {
  if (input.action === 'search') {
    const lawful = input.detained && ['probable_cause', 'warrant'].includes(input.legalGround);
    return { lawful, violation: lawful ? null : 'unlawful_search' };
  }
  if (input.action === 'arrest') {
    const lawful = ['probable_cause', 'warrant'].includes(input.legalGround);
    return { lawful, violation: lawful ? null : 'unlawful_arrest' };
  }
  return { lawful: true, violation: null };
}

export function resolvePursuitAction(current: { distanceIndex: number; risk: number; searchConfidence: number; visualContact: boolean }, action: PursuitAction) {
  let distanceIndex = current.distanceIndex;
  let risk = current.risk;
  let searchConfidence = current.searchConfidence;
  let visualContact = current.visualContact;
  let status: 'active' | 'contained' | 'lost' | 'ended' = 'active';
  const effects: Record<PursuitAction, [number, number, number]> = {
    aggressive: [-12, 18, 0],
    maintain_visual: [-5, 5, 4],
    predict_route: [-8, 3, 8],
    request_backup: [-4, 2, 7],
    containment: [-14, 6, 9],
    back_off: [10, -12, 3],
    lose_visual: [18, -4, -18],
    refresh_search: [0, 0, 8],
    contain: [-100, 0, 0],
    end: [0, 0, 0]
  };
  const [distanceDelta, riskDelta, confidenceDelta] = effects[action];
  distanceIndex = clamp(distanceIndex + distanceDelta);
  risk = clamp(risk + riskDelta);
  searchConfidence = clamp(searchConfidence + confidenceDelta);
  if (action === 'lose_visual') { visualContact = false; status = 'lost'; }
  if (action === 'contain') { distanceIndex = 0; status = 'contained'; }
  if (action === 'end') status = 'ended';
  if (!visualContact && action === 'refresh_search') status = 'lost';
  return { distanceIndex, risk, searchConfidence, visualContact, status };
}

function clamp(value: number) { return Math.max(0, Math.min(100, Math.round(value))); }

export function normalizePoliceUnitIdentity(value: unknown) {
  return value === true;
}

async function ensureProfile(db: Database, playerId: string) {
  await db.query(`INSERT INTO police_profiles (player_id) VALUES ($1) ON CONFLICT (player_id) DO NOTHING`, [playerId]);
}

async function requireOfficer(db: Database, playerId: string, duty = false) {
  await ensureProfile(db, playerId);
  const result = await db.query(`SELECT career_status, on_duty FROM police_profiles WHERE player_id=$1`, [playerId]);
  const profile = result.rows[0] as { career_status: PoliceCareerStatus; on_duty: boolean } | undefined;
  if (!profile || profile.career_status !== 'officer') throw new PoliceCommandError('police_officer_required', 403);
  if (duty && !profile.on_duty) throw new PoliceCommandError('police_duty_required', 403);
}

async function audit(db: Database, playerId: string | null, action: string, entityType: string, entityId: string | null, details: Record<string, unknown> = {}) {
  await db.query(`INSERT INTO police_audit_log (actor_player_id,action,entity_type,entity_id,details) VALUES ($1,$2,$3,$4,$5::jsonb)`, [playerId, action, entityType, entityId, JSON.stringify(details)]);
}

export async function getPoliceState(db: Database, playerId: string): Promise<PoliceState> {
  await ensureProfile(db, playerId);
  await expireWarrants(db);
  const [profileQ, unitsQ, callsQ, intelQ, encounterQ, reportsQ, warrantsQ, bolosQ, evidenceQ, pursuitQ, auditQ, dashQ] = await Promise.all([
    db.query(`SELECT career_status,academy_stage,badge_number,rank_code,callsign,on_duty,complaints,citations,arrests FROM police_profiles WHERE player_id=$1`, [playerId]),
    db.query(`SELECT id,callsign,unit_type,status,district,street_segment,is_npc,COALESCE(player_id=$1, false) AS is_self FROM police_units ORDER BY is_npc ASC,callsign`, [playerId]),
    db.query(`SELECT c.*,COALESCE(array_agg(u.callsign) FILTER (WHERE u.callsign IS NOT NULL),'{}') assigned_callsigns FROM police_dispatch_calls c LEFT JOIN police_dispatch_assignments a ON a.call_id=c.id LEFT JOIN police_units u ON u.id=a.unit_id WHERE c.status <> 'cleared' GROUP BY c.id ORDER BY c.priority DESC,c.created_at DESC LIMIT 30`),
    db.query(`SELECT id,call_id,source_type,label,summary,reliability,fields,created_at FROM police_intel ORDER BY created_at DESC LIMIT 60`),
    db.query(`SELECT id,encounter_type,status,subject_name,vehicle_id,legal_ground,detained,searched,metadata,started_at FROM police_encounters WHERE officer_player_id=$1 AND status='active' ORDER BY started_at DESC LIMIT 1`, [playerId]),
    db.query(`SELECT id,report_number,title,report_type,status,narrative,involved_people,charges,linked_call_id,created_at,updated_at FROM police_reports ORDER BY updated_at DESC LIMIT 50`),
    db.query(`SELECT id,subject_name,reason,priority,status,report_id,expires_at,created_at FROM police_warrants ORDER BY created_at DESC LIMIT 50`),
    db.query(`SELECT id,target_type,target_label,description,priority,status,expires_at,created_at FROM police_bolos ORDER BY created_at DESC LIMIT 50`),
    db.query(`SELECT e.id,e.evidence_number,e.evidence_type,e.label,e.description,e.status,e.location,e.report_id,e.metadata,e.created_at,COALESCE(json_agg(json_build_object('id',ev.id,'eventType',ev.event_type,'note',ev.note,'createdAt',ev.created_at)) FILTER (WHERE ev.id IS NOT NULL),'[]') events FROM police_evidence e LEFT JOIN police_evidence_events ev ON ev.evidence_id=e.id GROUP BY e.id ORDER BY e.created_at DESC LIMIT 50`),
    db.query(`SELECT id,status,visual_contact,district,street_segment,direction,distance_index,risk,search_confidence,last_known,last_seen_at,round FROM police_pursuits WHERE status IN ('active','lost') ORDER BY updated_at DESC LIMIT 1`),
    db.query(`SELECT id,action,entity_type,details,created_at FROM police_audit_log ORDER BY created_at DESC LIMIT 40`),
    db.query(`SELECT (SELECT count(*)::int FROM police_dispatch_calls WHERE status<>'cleared') active_calls,(SELECT count(*)::int FROM police_warrants WHERE status='active' AND expires_at>now()) active_warrants,(SELECT count(*)::int FROM police_bolos WHERE status='active' AND (expires_at IS NULL OR expires_at>now())) active_bolos,(SELECT count(*)::int FROM police_profiles WHERE on_duty=true) officers_on_duty,(SELECT count(*)::int FROM police_reports WHERE status IN ('draft','open')) open_reports`)
  ]);
  const p = profileQ.rows[0];
  const d = dashQ.rows[0];
  return {
    serverTime: new Date().toISOString(),
    profile: { careerStatus: p.career_status, academyStage: p.academy_stage, badgeNumber: p.badge_number, rankCode: p.rank_code, callsign: p.callsign, onDuty: p.on_duty, complaints: p.complaints, citations: p.citations, arrests: p.arrests },
    dashboard: { activeCalls: d.active_calls, activeWarrants: d.active_warrants, activeBolos: d.active_bolos, officersOnDuty: d.officers_on_duty, openReports: d.open_reports },
    units: unitsQ.rows.map(r => ({ id: r.id, callsign: r.callsign, unitType: r.unit_type, status: r.status, district: r.district, streetSegment: r.street_segment, isNpc: r.is_npc, isSelf: normalizePoliceUnitIdentity(r.is_self) })),
    calls: callsQ.rows.map(r => ({ id: r.id, callCode: r.call_code, title: r.title, description: r.description, priority: r.priority, status: r.status, district: r.district, streetSegment: r.street_segment, sourceKind: r.source_kind, knowledge: r.knowledge ?? {}, assignedUnitCallsigns: r.assigned_callsigns ?? [], createdAt: iso(r.created_at) })),
    intel: intelQ.rows.map(r => ({ id: r.id, callId: r.call_id, sourceType: r.source_type, label: r.label, summary: r.summary, reliability: r.reliability, fields: r.fields ?? {}, createdAt: iso(r.created_at) })),
    activeEncounter: encounterQ.rows[0] ? mapEncounter(encounterQ.rows[0]) : null,
    reports: reportsQ.rows.map(r => ({ id: r.id, reportNumber: Number(r.report_number), title: r.title, reportType: r.report_type, status: r.status, narrative: r.narrative, involvedPeople: r.involved_people ?? [], charges: r.charges ?? [], linkedCallId: r.linked_call_id, createdAt: iso(r.created_at), updatedAt: iso(r.updated_at) })),
    warrants: warrantsQ.rows.map(r => ({ id: r.id, subjectName: r.subject_name, reason: r.reason, priority: r.priority, status: r.status, reportId: r.report_id, expiresAt: iso(r.expires_at), createdAt: iso(r.created_at) })),
    bolos: bolosQ.rows.map(r => ({ id: r.id, targetType: r.target_type, targetLabel: r.target_label, description: r.description, priority: r.priority, status: r.status, expiresAt: r.expires_at ? iso(r.expires_at) : null, createdAt: iso(r.created_at) })),
    evidence: evidenceQ.rows.map(r => ({ id: r.id, evidenceNumber: Number(r.evidence_number), evidenceType: r.evidence_type, label: r.label, description: r.description, status: r.status, location: r.location, reportId: r.report_id, metadata: r.metadata ?? {}, createdAt: iso(r.created_at), events: (r.events ?? []).map((e: any) => ({ ...e, createdAt: iso(e.createdAt) })) })),
    pursuit: pursuitQ.rows[0] ? mapPursuit(pursuitQ.rows[0]) : null,
    audit: auditQ.rows.map(r => ({ id: r.id, action: r.action, entityType: r.entity_type, details: r.details ?? {}, createdAt: iso(r.created_at) }))
  };
}

export async function careerAction(db: Database, playerId: string, action: 'apply' | 'academy_step') {
  await ensureProfile(db, playerId);
  const q = await db.query(`SELECT career_status,academy_stage FROM police_profiles WHERE player_id=$1`, [playerId]);
  const p = q.rows[0];
  if (action === 'apply') {
    if (p.career_status !== 'applicant') throw new PoliceCommandError('police_already_enrolled', 409);
    await db.query(`UPDATE police_profiles SET career_status='cadet',academy_stage=1,rank_code='cadet',updated_at=now() WHERE player_id=$1`, [playerId]);
    await audit(db, playerId, 'academy_enrolled', 'profile', null);
  } else {
    if (p.career_status !== 'cadet') throw new PoliceCommandError('police_academy_not_available', 409);
    const badge = `SD-${playerId.replace(/-/g, '').slice(0, 5).toUpperCase()}`;
    await db.query(`UPDATE police_profiles SET career_status='officer',academy_stage=2,badge_number=$2,rank_code='officer',callsign=COALESCE(callsign,'24'),updated_at=now() WHERE player_id=$1`, [playerId, badge]);
    await audit(db, playerId, 'academy_completed', 'profile', null, { badge });
  }
  return getPoliceState(db, playerId);
}

export async function setDuty(db: Database, playerId: string, onDuty: boolean, callsign?: string) {
  await requireOfficer(db, playerId);
  const effective = callsign?.trim() || (await db.query(`SELECT callsign FROM police_profiles WHERE player_id=$1`, [playerId])).rows[0]?.callsign || '24';
  if (onDuty) {
    const conflict = await db.query(`SELECT id FROM police_units WHERE callsign=$1 AND player_id IS DISTINCT FROM $2`, [effective, playerId]);
    if (conflict.rowCount) throw new PoliceCommandError('police_callsign_in_use', 409);
    await db.query(`UPDATE police_profiles SET on_duty=true,callsign=$2,updated_at=now() WHERE player_id=$1`, [playerId, effective]);
    await db.query(`INSERT INTO police_units (callsign,player_id,unit_type,status,district,street_segment,is_npc) SELECT $2,$1,'patrol','patrol',district,street_segment,false FROM player_state WHERE player_id=$1 ON CONFLICT (callsign) DO UPDATE SET player_id=EXCLUDED.player_id,status='patrol',district=EXCLUDED.district,street_segment=EXCLUDED.street_segment,is_npc=false,updated_at=now()`, [playerId, effective]);
  } else {
    await db.query(`UPDATE police_profiles SET on_duty=false,updated_at=now() WHERE player_id=$1`, [playerId]);
    await db.query(`DELETE FROM police_units WHERE player_id=$1 AND is_npc=false`, [playerId]);
  }
  await audit(db, playerId, onDuty ? 'duty_started' : 'duty_ended', 'profile', null, { callsign: effective });
  return getPoliceState(db, playerId);
}

export async function createDispatchCall(db: Database, playerId: string, input: any) {
  await requireOfficer(db, playerId, true);
  const q = await db.query(`INSERT INTO police_dispatch_calls (call_code,title,description,priority,district,street_segment,source_kind,knowledge) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb) RETURNING id`, [input.callCode,input.title,input.description,input.priority,input.district,input.streetSegment,input.sourceKind,JSON.stringify(input.knowledge ?? {})]);
  await audit(db, playerId, 'dispatch_created', 'dispatch_call', q.rows[0].id, { priority: input.priority, code: input.callCode });
  return getPoliceState(db, playerId);
}

export async function dispatchAction(db: Database, playerId: string, callId: string, action: 'accept' | 'arrive' | 'clear') {
  await requireOfficer(db, playerId, true);
  const unitQ = await db.query(`SELECT id FROM police_units WHERE player_id=$1 LIMIT 1`, [playerId]);
  if (!unitQ.rows[0]) throw new PoliceCommandError('police_unit_required', 409);
  const unitId = unitQ.rows[0].id;
  const callQ = await db.query(`SELECT status FROM police_dispatch_calls WHERE id=$1`, [callId]);
  if (!callQ.rows[0]) throw new PoliceCommandError('police_call_not_found', 404);
  if (action === 'accept') {
    await db.query(`INSERT INTO police_dispatch_assignments (call_id,unit_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [callId, unitId]);
    await db.query(`UPDATE police_dispatch_calls SET status=CASE WHEN status='open' THEN 'assigned' ELSE status END WHERE id=$1`, [callId]);
    await db.query(`UPDATE police_units SET status='responding',updated_at=now() WHERE id=$1`, [unitId]);
  } else if (action === 'arrive') {
    await db.query(`INSERT INTO police_dispatch_assignments (call_id,unit_id,arrived_at) VALUES ($1,$2,now()) ON CONFLICT (call_id,unit_id) DO UPDATE SET arrived_at=now()`, [callId, unitId]);
    await db.query(`UPDATE police_dispatch_calls SET status='on_scene' WHERE id=$1 AND status<>'cleared'`, [callId]);
    await db.query(`UPDATE police_units SET status='on_scene',updated_at=now() WHERE id=$1`, [unitId]);
  } else {
    await db.query(`UPDATE police_dispatch_calls SET status='cleared',cleared_at=now() WHERE id=$1`, [callId]);
    await db.query(`UPDATE police_units SET status='patrol',updated_at=now() WHERE id IN (SELECT unit_id FROM police_dispatch_assignments WHERE call_id=$1)`, [callId]);
  }
  await audit(db, playerId, `dispatch_${action}`, 'dispatch_call', callId);
  return getPoliceState(db, playerId);
}

export async function addIntel(db: Database, playerId: string, input: any) {
  await requireOfficer(db, playerId, true);
  const q = await db.query(`INSERT INTO police_intel (call_id,source_type,label,summary,reliability,fields,created_by) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7) RETURNING id`, [input.callId ?? null,input.sourceType,input.label,input.summary,input.reliability,JSON.stringify(input.fields ?? {}),playerId]);
  await audit(db, playerId, 'intel_added', 'intel', q.rows[0].id, { sourceType: input.sourceType, reliability: input.reliability });
  return getPoliceState(db, playerId);
}

export async function startEncounter(db: Database, playerId: string, input: any) {
  await requireOfficer(db, playerId, true);
  const existing = await db.query(`SELECT id FROM police_encounters WHERE officer_player_id=$1 AND status='active'`, [playerId]);
  if (existing.rowCount) throw new PoliceCommandError('police_active_encounter_exists', 409);
  const q = await db.query(`INSERT INTO police_encounters (officer_player_id,encounter_type,subject_name,vehicle_id,legal_ground) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [playerId,input.encounterType,input.subjectName ?? null,input.vehicleId ?? null,input.legalGround]);
  await audit(db, playerId, 'encounter_started', 'encounter', q.rows[0].id, { type: input.encounterType, legalGround: input.legalGround });
  return getPoliceState(db, playerId);
}

export async function encounterAction(db: Database, playerId: string, encounterId: string, action: string) {
  await requireOfficer(db, playerId, true);
  const q = await db.query(`SELECT * FROM police_encounters WHERE id=$1 AND officer_player_id=$2 AND status='active'`, [encounterId, playerId]);
  const encounter = q.rows[0];
  if (!encounter) throw new PoliceCommandError('police_encounter_not_found', 404);
  const evaluation = evaluateFieldAction({ action, legalGround: encounter.legal_ground, detained: encounter.detained, searched: encounter.searched });
  if (!evaluation.lawful) {
    await db.query(`UPDATE police_profiles SET complaints=complaints+1,updated_at=now() WHERE player_id=$1`, [playerId]);
    await audit(db, playerId, evaluation.violation!, 'encounter', encounterId, { legalGround: encounter.legal_ground });
  }
  if (action === 'detain') await db.query(`UPDATE police_encounters SET detained=true WHERE id=$1`, [encounterId]);
  if (action === 'search') await db.query(`UPDATE police_encounters SET searched=true WHERE id=$1`, [encounterId]);
  if (action === 'citation') { await db.query(`UPDATE police_profiles SET citations=citations+1 WHERE player_id=$1`, [playerId]); await audit(db, playerId, 'citation_issued', 'encounter', encounterId); }
  if (action === 'set_probable_cause') await db.query(`UPDATE police_encounters SET legal_ground='probable_cause',detained=true WHERE id=$1`, [encounterId]);
  if (action === 'arrest' && evaluation.lawful) { await db.query(`UPDATE police_encounters SET status='arrested',ended_at=now() WHERE id=$1`, [encounterId]); await db.query(`UPDATE police_profiles SET arrests=arrests+1 WHERE player_id=$1`, [playerId]); await audit(db, playerId, 'arrest_made', 'encounter', encounterId); }
  if (action === 'release') { await db.query(`UPDATE police_encounters SET status='released',ended_at=now() WHERE id=$1`, [encounterId]); await audit(db, playerId, 'encounter_released', 'encounter', encounterId); }
  if (['identify','question'].includes(action)) await audit(db, playerId, `encounter_${action}`, 'encounter', encounterId);
  return getPoliceState(db, playerId);
}

export async function createReport(db: Database, playerId: string, input: any) {
  await requireOfficer(db, playerId, true);
  const status = input.finalize ? 'finalized' : 'open';
  const q = await db.query(`INSERT INTO police_reports (author_player_id,title,report_type,status,narrative,involved_people,charges,linked_call_id) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8) RETURNING id`, [playerId,input.title,input.reportType,status,input.narrative,JSON.stringify(input.involvedPeople ?? []),JSON.stringify(input.charges ?? []),input.linkedCallId ?? null]);
  await audit(db, playerId, input.finalize ? 'report_finalized' : 'report_created', 'report', q.rows[0].id);
  return getPoliceState(db, playerId);
}

export async function createWarrant(db: Database, playerId: string, input: any) {
  await requireOfficer(db, playerId, true);
  if (input.reportId) {
    const report = await db.query(`SELECT status FROM police_reports WHERE id=$1`, [input.reportId]);
    if (!report.rows[0]) throw new PoliceCommandError('police_report_not_found', 404);
  }
  const q = await db.query(`INSERT INTO police_warrants (subject_name,reason,priority,issued_by,report_id,expires_at) VALUES ($1,$2,$3,$4,$5,now()+($6::text||' days')::interval) RETURNING id`, [input.subjectName,input.reason,input.priority,playerId,input.reportId ?? null,input.expiresInDays]);
  await audit(db, playerId, 'warrant_issued', 'warrant', q.rows[0].id, { subject: input.subjectName, priority: input.priority });
  return getPoliceState(db, playerId);
}

export async function warrantAction(db: Database, playerId: string, warrantId: string, action: 'serve' | 'cancel') {
  await requireOfficer(db, playerId, true);
  const status = action === 'serve' ? 'served' : 'cancelled';
  const q = await db.query(`UPDATE police_warrants SET status=$2,updated_at=now() WHERE id=$1 AND status='active' RETURNING id`, [warrantId, status]);
  if (!q.rows[0]) throw new PoliceCommandError('police_warrant_not_active', 409);
  await audit(db, playerId, `warrant_${status}`, 'warrant', warrantId);
  return getPoliceState(db, playerId);
}

export async function createBolo(db: Database, playerId: string, input: any) {
  await requireOfficer(db, playerId, true);
  const q = await db.query(`INSERT INTO police_bolos (target_type,target_label,description,priority,created_by,expires_at) VALUES ($1,$2,$3,$4,$5,CASE WHEN $6::int IS NULL THEN NULL ELSE now()+($6::text||' hours')::interval END) RETURNING id`, [input.targetType,input.targetLabel,input.description,input.priority,playerId,input.expiresInHours ?? null]);
  await audit(db, playerId, 'bolo_created', 'bolo', q.rows[0].id, { target: input.targetLabel });
  return getPoliceState(db, playerId);
}

export async function boloAction(db: Database, playerId: string, boloId: string, action: 'resolve' | 'cancel') {
  await requireOfficer(db, playerId, true);
  const status = action === 'resolve' ? 'resolved' : 'cancelled';
  const q = await db.query(`UPDATE police_bolos SET status=$2,updated_at=now() WHERE id=$1 AND status='active' RETURNING id`, [boloId,status]);
  if (!q.rows[0]) throw new PoliceCommandError('police_bolo_not_active', 409);
  await audit(db, playerId, `bolo_${status}`, 'bolo', boloId);
  return getPoliceState(db, playerId);
}

export async function createEvidence(db: Database, playerId: string, input: any) {
  await requireOfficer(db, playerId, true);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const q = await client.query(`INSERT INTO police_evidence (evidence_type,label,description,location,report_id,collected_by,current_custodian,metadata) VALUES ($1,$2,$3,$4,$5,$6,$6,$7::jsonb) RETURNING id`, [input.evidenceType,input.label,input.description,input.location,input.reportId ?? null,playerId,JSON.stringify(input.metadata ?? {})]);
    await client.query(`INSERT INTO police_evidence_events (evidence_id,actor_player_id,event_type,to_custodian,note) VALUES ($1,$2,'collected',$2,'Initial collection')`, [q.rows[0].id,playerId]);
    await client.query(`INSERT INTO police_audit_log (actor_player_id,action,entity_type,entity_id,details) VALUES ($1,'evidence_collected','evidence',$2,'{}'::jsonb)`, [playerId,q.rows[0].id]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  return getPoliceState(db, playerId);
}

export async function evidenceAction(db: Database, playerId: string, evidenceId: string, action: 'store' | 'check_out' | 'release', note: string) {
  await requireOfficer(db, playerId, true);
  const q = await db.query(`SELECT current_custodian,status FROM police_evidence WHERE id=$1`, [evidenceId]);
  if (!q.rows[0]) throw new PoliceCommandError('police_evidence_not_found', 404);
  const next = action === 'store' ? { status: 'locker', location: 'SDPD Evidence Locker', custodian: null, event: 'stored' } : action === 'check_out' ? { status: 'checked_out', location: 'Officer custody', custodian: playerId, event: 'checked_out' } : { status: 'released', location: 'Released', custodian: null, event: 'released' };
  await db.query(`UPDATE police_evidence SET status=$2,location=$3,current_custodian=$4,updated_at=now() WHERE id=$1`, [evidenceId,next.status,next.location,next.custodian]);
  await db.query(`INSERT INTO police_evidence_events (evidence_id,actor_player_id,event_type,from_custodian,to_custodian,note) VALUES ($1,$2,$3,$4,$5,$6)`, [evidenceId,playerId,next.event,q.rows[0].current_custodian,next.custodian,note]);
  await audit(db, playerId, `evidence_${next.event}`, 'evidence', evidenceId, { note });
  return getPoliceState(db, playerId);
}

export async function startPursuit(db: Database, playerId: string, input: any) {
  await requireOfficer(db, playerId, true);
  const existing = await db.query(`SELECT id FROM police_pursuits WHERE status IN ('active','lost') LIMIT 1`);
  if (existing.rowCount) throw new PoliceCommandError('police_active_pursuit_exists', 409);
  const q = await db.query(`INSERT INTO police_pursuits (call_id,district,street_segment,direction,created_by) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [input.callId ?? null,input.district,input.streetSegment,input.direction,playerId]);
  await db.query(`UPDATE police_units SET status='pursuit',updated_at=now() WHERE player_id=$1`, [playerId]);
  await audit(db, playerId, 'pursuit_started', 'pursuit', q.rows[0].id);
  return getPoliceState(db, playerId);
}

export async function pursuitAction(db: Database, playerId: string, pursuitId: string, action: PursuitAction) {
  await requireOfficer(db, playerId, true);
  const q = await db.query(`SELECT * FROM police_pursuits WHERE id=$1 AND status IN ('active','lost')`, [pursuitId]);
  const p = q.rows[0];
  if (!p) throw new PoliceCommandError('police_pursuit_not_active', 404);
  const next = resolvePursuitAction({ distanceIndex: p.distance_index, risk: p.risk, searchConfidence: p.search_confidence, visualContact: p.visual_contact }, action);
  const lastKnown = action === 'lose_visual' ? { district: p.district, streetSegment: p.street_segment, direction: p.direction } : p.last_known;
  const lastSeenAt = action === 'lose_visual' ? new Date() : p.last_seen_at;
  await db.query(`UPDATE police_pursuits SET status=$2,visual_contact=$3,distance_index=$4,risk=$5,search_confidence=$6,last_known=$7::jsonb,last_seen_at=$8,round=round+1,updated_at=now() WHERE id=$1`, [pursuitId,next.status,next.visualContact,next.distanceIndex,next.risk,next.searchConfidence,lastKnown ? JSON.stringify(lastKnown) : null,lastSeenAt]);
  if (['contained','ended'].includes(next.status)) await db.query(`UPDATE police_units SET status='patrol',updated_at=now() WHERE player_id=$1`, [playerId]);
  if (next.status === 'lost') await db.query(`UPDATE police_units SET status='search',updated_at=now() WHERE player_id=$1`, [playerId]);
  await audit(db, playerId, `pursuit_${action}`, 'pursuit', pursuitId, { distanceIndex: next.distanceIndex, risk: next.risk, searchConfidence: next.searchConfidence, visualContact: next.visualContact });
  return getPoliceState(db, playerId);
}

async function expireWarrants(db: Database) {
  await db.query(`UPDATE police_warrants SET status='expired',updated_at=now() WHERE status='active' AND expires_at<=now()`);
  await db.query(`UPDATE police_bolos SET status='resolved',updated_at=now() WHERE status='active' AND expires_at IS NOT NULL AND expires_at<=now()`);
}

function mapEncounter(r: any) { return { id: r.id, encounterType: r.encounter_type, status: r.status, subjectName: r.subject_name, vehicleId: r.vehicle_id, legalGround: r.legal_ground, detained: r.detained, searched: r.searched, metadata: r.metadata ?? {}, startedAt: iso(r.started_at) }; }
function mapPursuit(r: any) { return { id: r.id, status: r.status, visualContact: r.visual_contact, district: r.district, streetSegment: r.street_segment, direction: r.direction, distanceIndex: r.distance_index, risk: r.risk, searchConfidence: r.search_confidence, lastKnown: r.last_known, lastSeenAt: r.last_seen_at ? iso(r.last_seen_at) : null, round: r.round }; }
function iso(value: Date | string) { return new Date(value).toISOString(); }
