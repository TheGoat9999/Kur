import type { PoolClient } from 'pg';
import { GovernmentStateSchema, type GovernmentState } from '@sol-dorado/contracts/government';
import type { Database } from '../db.js';

type Queryable = Database | PoolClient;

const ID_CARD_FEE_CENTS = 2_500;
const DRIVING_LICENSE_FEE_CENTS = 12_000;

export class GovernmentCommandError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
  }
}

export function ageOnDate(dateOfBirth: string, at = new Date()): number {
  const [year, month, day] = dateOfBirth.split('-').map(Number);
  if (!year || !month || !day) return -1;
  let age = at.getUTCFullYear() - year;
  const beforeBirthday = at.getUTCMonth() + 1 < month || (at.getUTCMonth() + 1 === month && at.getUTCDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}

export function nextFineState(balanceCents: number, paymentCents: number) {
  if (!Number.isInteger(balanceCents) || balanceCents < 0 || !Number.isInteger(paymentCents) || paymentCents <= 0) {
    throw new GovernmentCommandError('invalid_fine_payment', 400);
  }
  const appliedCents = Math.min(balanceCents, paymentCents);
  const nextBalanceCents = balanceCents - appliedCents;
  return { appliedCents, nextBalanceCents, status: nextBalanceCents === 0 ? 'paid' as const : 'partial' as const };
}

async function ensureIdentity(db: Queryable, playerId: string): Promise<string> {
  const result = await db.query('SELECT ensure_citizen_identity_db($1::uuid) AS id', [playerId]);
  const id = result.rows[0]?.id;
  if (!id) throw new GovernmentCommandError('player_not_found', 404);
  return String(id);
}

async function addRecord(
  db: Queryable,
  identityId: string,
  recordType: string,
  agency: string,
  summary: string,
  entityType?: string,
  entityRef?: string
) {
  await db.query(
    `INSERT INTO government_record_events
      (citizen_identity_id,record_type,agency,summary,entity_type,entity_ref)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [identityId, recordType, agency, summary, entityType ?? null, entityRef ?? null]
  );
}

export async function getGovernmentState(db: Queryable, playerId: string): Promise<GovernmentState> {
  const identityId = await ensureIdentity(db, playerId);
  const [identityResult, documentResult, licenseResult, registrationResult, permitResult, fineResult, recordResult] = await Promise.all([
    db.query(`SELECT id,citizen_number,legal_name,date_of_birth,nationality_code,residency_status,verified_at FROM citizen_identities WHERE id=$1`, [identityId]),
    db.query(`SELECT id,document_kind,document_number,status,issued_at,expires_at,metadata FROM government_documents WHERE citizen_identity_id=$1 ORDER BY (status='active') DESC,issued_at DESC LIMIT 1`, [identityId]),
    db.query(`SELECT id,license_kind,license_code,license_number,class_code,status,subject_type,subject_ref,source_system,issued_at,expires_at,metadata FROM government_licenses WHERE citizen_identity_id=$1 ORDER BY (status='active') DESC,issued_at DESC`, [identityId]),
    db.query(`SELECT vr.id,vr.vehicle_id,vr.registration_number,vr.status,vr.registered_at,vr.expires_at,vm.display_name,vm.id AS model_id FROM vehicle_registrations vr JOIN player_vehicles pv ON pv.id=vr.vehicle_id JOIN vehicle_models vm ON vm.id=pv.model_id WHERE vr.citizen_identity_id=$1 ORDER BY vr.registered_at DESC`, [identityId]),
    db.query(`SELECT id,permit_kind,permit_number,status,subject_type,subject_ref,issuing_agency,issued_at,expires_at,metadata FROM government_permits WHERE citizen_identity_id=$1 ORDER BY issued_at DESC`, [identityId]),
    db.query(`SELECT id,fine_number,issuing_agency,reason,amount_cents,balance_cents,status,due_at,source_type,source_ref,issued_at,paid_at FROM government_fines WHERE citizen_identity_id=$1 ORDER BY (status IN ('outstanding','partial')) DESC,issued_at DESC`, [identityId]),
    db.query(`SELECT id,record_type,agency,summary,entity_type,entity_ref,created_at FROM government_record_events WHERE citizen_identity_id=$1 ORDER BY created_at DESC LIMIT 60`, [identityId])
  ]);

  const identity = identityResult.rows[0];
  if (!identity) throw new GovernmentCommandError('citizen_identity_missing', 500);
  const document = documentResult.rows[0];

  return GovernmentStateSchema.parse({
    identity: {
      id: identity.id,
      citizenNumber: identity.citizen_number,
      legalName: identity.legal_name,
      dateOfBirth: identity.date_of_birth ? new Date(identity.date_of_birth).toISOString().slice(0, 10) : null,
      nationalityCode: identity.nationality_code,
      residencyStatus: identity.residency_status,
      verifiedAt: identity.verified_at ? new Date(identity.verified_at).toISOString() : null
    },
    idCard: document ? {
      id: document.id,
      kind: document.document_kind,
      documentNumber: document.document_number,
      status: document.status,
      issuedAt: new Date(document.issued_at).toISOString(),
      expiresAt: new Date(document.expires_at).toISOString(),
      metadata: document.metadata ?? {}
    } : null,
    licenses: licenseResult.rows.map(row => ({
      id: row.id,
      kind: row.license_kind,
      code: row.license_code,
      licenseNumber: row.license_number,
      classCode: row.class_code,
      status: row.status,
      subjectType: row.subject_type,
      subjectRef: row.subject_ref,
      sourceSystem: row.source_system,
      issuedAt: new Date(row.issued_at).toISOString(),
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      metadata: row.metadata ?? {}
    })),
    vehicleRegistrations: registrationResult.rows.map(row => ({
      id: row.id,
      vehicleId: row.vehicle_id,
      registrationNumber: row.registration_number,
      status: row.status,
      registeredAt: new Date(row.registered_at).toISOString(),
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      vehicleName: row.display_name,
      modelId: row.model_id
    })),
    permits: permitResult.rows.map(row => ({
      id: row.id,
      kind: row.permit_kind,
      permitNumber: row.permit_number,
      status: row.status,
      subjectType: row.subject_type,
      subjectRef: row.subject_ref,
      issuingAgency: row.issuing_agency,
      issuedAt: new Date(row.issued_at).toISOString(),
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      metadata: row.metadata ?? {}
    })),
    fines: fineResult.rows.map(row => ({
      id: row.id,
      fineNumber: row.fine_number,
      issuingAgency: row.issuing_agency,
      reason: row.reason,
      amountCents: Number(row.amount_cents),
      balanceCents: Number(row.balance_cents),
      status: row.status,
      dueAt: row.due_at ? new Date(row.due_at).toISOString() : null,
      sourceType: row.source_type,
      sourceRef: row.source_ref,
      issuedAt: new Date(row.issued_at).toISOString(),
      paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : null
    })),
    records: recordResult.rows.map(row => ({
      id: row.id,
      recordType: row.record_type,
      agency: row.agency,
      summary: row.summary,
      entityType: row.entity_type,
      entityRef: row.entity_ref,
      createdAt: new Date(row.created_at).toISOString()
    }))
  });
}

export async function updateCitizenProfile(db: Database, playerId: string, dateOfBirth: string, nationalityCode: string) {
  const identityId = await ensureIdentity(db, playerId);
  const birthDate = new Date(`${dateOfBirth}T00:00:00.000Z`);
  if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) throw new GovernmentCommandError('invalid_date_of_birth', 400);
  const age = ageOnDate(dateOfBirth);
  if (age < 14 || age > 110) throw new GovernmentCommandError('invalid_date_of_birth', 400);
  await db.query(`UPDATE citizen_identities SET date_of_birth=$2::date,nationality_code=$3,verified_at=now(),updated_at=now() WHERE id=$1`, [identityId, dateOfBirth, nationalityCode]);
  await addRecord(db, identityId, 'identity_verified', 'Sol Dorado Civil Registry', 'Citizen identity details verified.', 'citizen_identity', identityId);
  return getGovernmentState(db, playerId);
}

export async function issueIdCard(db: Database, playerId: string) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const identityId = await ensureIdentity(client, playerId);
    const identity = (await client.query(`SELECT date_of_birth FROM citizen_identities WHERE id=$1 FOR UPDATE`, [identityId])).rows[0];
    if (!identity?.date_of_birth) throw new GovernmentCommandError('identity_verification_required', 409);
    const active = await client.query(`SELECT 1 FROM government_documents WHERE citizen_identity_id=$1 AND document_kind='id_card' AND status='active'`, [identityId]);
    if (active.rowCount) throw new GovernmentCommandError('id_card_already_active', 409);
    const player = (await client.query(`SELECT cash_cents FROM player_state WHERE player_id=$1 FOR UPDATE`, [playerId])).rows[0];
    if (!player || Number(player.cash_cents) < ID_CARD_FEE_CENTS) throw new GovernmentCommandError('insufficient_cash', 409);
    const card = (await client.query(`INSERT INTO government_documents(citizen_identity_id,document_kind) VALUES($1,'id_card') RETURNING id,document_number`, [identityId])).rows[0];
    await client.query(`UPDATE player_state SET cash_cents=cash_cents-$2,version=version+1,updated_at=now() WHERE player_id=$1`, [playerId, ID_CARD_FEE_CENTS]);
    await client.query(`INSERT INTO finance_ledger(player_id,entry_type,title,amount_cents,direction,detail) VALUES($1,'cash','Government ID card',$2,'out',$3)`, [playerId, ID_CARD_FEE_CENTS, card.document_number]);
    await addRecord(client, identityId, 'document_issued', 'Sol Dorado Civil Registry', `Identity card ${card.document_number} issued.`, 'government_document', card.id);
    await client.query('COMMIT');
    return getGovernmentState(db, playerId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function issueDrivingLicense(db: Database, playerId: string) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const identityId = await ensureIdentity(client, playerId);
    const identity = (await client.query(`SELECT date_of_birth FROM citizen_identities WHERE id=$1 FOR UPDATE`, [identityId])).rows[0];
    if (!identity?.date_of_birth) throw new GovernmentCommandError('identity_verification_required', 409);
    const dob = new Date(identity.date_of_birth).toISOString().slice(0, 10);
    if (ageOnDate(dob) < 18) throw new GovernmentCommandError('driving_license_age_required', 409);
    const card = await client.query(`SELECT 1 FROM government_documents WHERE citizen_identity_id=$1 AND document_kind='id_card' AND status='active'`, [identityId]);
    if (!card.rowCount) throw new GovernmentCommandError('active_id_card_required', 409);
    const active = await client.query(`SELECT 1 FROM government_licenses WHERE citizen_identity_id=$1 AND license_kind='driving' AND license_code='standard' AND status='active'`, [identityId]);
    if (active.rowCount) throw new GovernmentCommandError('driving_license_already_active', 409);
    const player = (await client.query(`SELECT cash_cents FROM player_state WHERE player_id=$1 FOR UPDATE`, [playerId])).rows[0];
    if (!player || Number(player.cash_cents) < DRIVING_LICENSE_FEE_CENTS) throw new GovernmentCommandError('insufficient_cash', 409);
    const license = (await client.query(`INSERT INTO government_licenses(citizen_identity_id,license_kind,license_code,class_code,source_system,expires_at,metadata) VALUES($1,'driving','standard','SD-B','government',now()+interval '5 years','{"authority":"Sol Dorado Department of Motor Vehicles"}'::jsonb) RETURNING id,license_number`, [identityId])).rows[0];
    await client.query(`UPDATE player_state SET cash_cents=cash_cents-$2,version=version+1,updated_at=now() WHERE player_id=$1`, [playerId, DRIVING_LICENSE_FEE_CENTS]);
    await client.query(`INSERT INTO finance_ledger(player_id,entry_type,title,amount_cents,direction,detail) VALUES($1,'cash','Driving license',$2,'out',$3)`, [playerId, DRIVING_LICENSE_FEE_CENTS, license.license_number]);
    await addRecord(client, identityId, 'license_issued', 'Sol Dorado DMV', `Standard driving license ${license.license_number} issued.`, 'government_license', license.id);
    await client.query('COMMIT');
    return getGovernmentState(db, playerId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function applyBusinessLicense(db: Database, playerId: string, businessName: string) {
  const identityId = await ensureIdentity(db, playerId);
  const activeId = await db.query(`SELECT 1 FROM government_documents WHERE citizen_identity_id=$1 AND document_kind='id_card' AND status='active'`, [identityId]);
  if (!activeId.rowCount) throw new GovernmentCommandError('active_id_card_required', 409);
  const existing = await db.query(`SELECT 1 FROM government_licenses WHERE citizen_identity_id=$1 AND license_kind='business' AND license_code='general_business' AND subject_ref=$2 AND status IN ('pending','active')`, [identityId, businessName]);
  if (existing.rowCount) throw new GovernmentCommandError('business_license_application_exists', 409);
  const created = (await db.query(`INSERT INTO government_licenses(citizen_identity_id,license_kind,license_code,status,subject_type,subject_ref,source_system,metadata) VALUES($1,'business','general_business','pending','business',$2,'government','{"authority":"Sol Dorado Business Licensing Office"}'::jsonb) RETURNING id,license_number`, [identityId, businessName])).rows[0];
  await addRecord(db, identityId, 'license_application', 'Sol Dorado Business Licensing Office', `Business license application ${created.license_number} submitted for ${businessName}.`, 'government_license', created.id);
  return getGovernmentState(db, playerId);
}

export async function payFine(db: Database, playerId: string, fineId: string, requestedCents: number) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const identityId = await ensureIdentity(client, playerId);
    const fine = (await client.query(`SELECT * FROM government_fines WHERE id=$1 AND citizen_identity_id=$2 FOR UPDATE`, [fineId, identityId])).rows[0];
    if (!fine) throw new GovernmentCommandError('fine_not_found', 404);
    if (!['outstanding','partial'].includes(fine.status) || Number(fine.balance_cents) <= 0) throw new GovernmentCommandError('fine_not_payable', 409);
    const next = nextFineState(Number(fine.balance_cents), requestedCents);
    const player = (await client.query(`SELECT cash_cents FROM player_state WHERE player_id=$1 FOR UPDATE`, [playerId])).rows[0];
    if (!player || Number(player.cash_cents) < next.appliedCents) throw new GovernmentCommandError('insufficient_cash', 409);
    await client.query(`UPDATE government_fines SET balance_cents=$2,status=$3,paid_at=CASE WHEN $3='paid' THEN now() ELSE NULL END,updated_at=now() WHERE id=$1`, [fineId, next.nextBalanceCents, next.status]);
    await client.query(`UPDATE player_state SET cash_cents=cash_cents-$2,version=version+1,updated_at=now() WHERE player_id=$1`, [playerId, next.appliedCents]);
    await client.query(`INSERT INTO finance_ledger(player_id,entry_type,title,amount_cents,direction,detail) VALUES($1,'cash','Government fine payment',$2,'out',$3)`, [playerId, next.appliedCents, fine.fine_number]);
    await addRecord(client, identityId, 'fine_payment', fine.issuing_agency, `Payment applied to ${fine.fine_number}. Remaining balance: ${next.nextBalanceCents} cents.`, 'government_fine', fineId);
    await client.query('COMMIT');
    return getGovernmentState(db, playerId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
