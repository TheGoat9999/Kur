import type { Database } from '../db.js';
import { GovernmentCommandError, getGovernmentState } from './government.js';

export async function applyCanonicalBusinessLicense(db: Database, playerId: string, businessName: string) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const identityQ = await client.query('SELECT ensure_citizen_identity_db($1::uuid) AS id', [playerId]);
    const identityId = identityQ.rows[0]?.id;
    if (!identityId) throw new GovernmentCommandError('player_not_found', 404);

    const activeId = await client.query(`SELECT 1 FROM government_documents WHERE citizen_identity_id=$1 AND document_kind='id_card' AND status='active'`, [identityId]);
    if (!activeId.rowCount) throw new GovernmentCommandError('active_id_card_required', 409);

    const business = (await client.query(
      `SELECT id,name FROM businesses WHERE owner_player_id=$1 AND lower(name)=lower($2) LIMIT 1 FOR UPDATE`,
      [playerId, businessName]
    )).rows[0];
    if (!business) throw new GovernmentCommandError('owned_business_required', 409);

    const existing = await client.query(
      `SELECT 1 FROM government_licenses
       WHERE citizen_identity_id=$1 AND license_kind='business' AND license_code='general_business'
         AND subject_ref=$2::text AND status IN ('pending','active')`,
      [identityId, business.id]
    );
    if (existing.rowCount) throw new GovernmentCommandError('business_license_application_exists', 409);

    const created = (await client.query(
      `INSERT INTO government_licenses(
         citizen_identity_id,license_kind,license_code,status,subject_type,subject_ref,source_system,source_ref,metadata
       ) VALUES($1,'business','general_business','pending','business',$2::text,'government',$2::text,$3::jsonb)
       RETURNING id,license_number`,
      [identityId, business.id, JSON.stringify({ authority: 'Sol Dorado Business Licensing Office', businessId: business.id, businessName: business.name })]
    )).rows[0];

    await client.query(
      `INSERT INTO government_record_events(citizen_identity_id,record_type,agency,summary,entity_type,entity_ref)
       VALUES($1,'license_application','Sol Dorado Business Licensing Office',$2,'government_license',$3)`,
      [identityId, `Business license application ${created.license_number} submitted for ${business.name}.`, created.id]
    );
    await client.query('COMMIT');
    return getGovernmentState(db, playerId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
