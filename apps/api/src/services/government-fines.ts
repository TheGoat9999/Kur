import type { Database } from '../db.js';
import { GovernmentCommandError, getGovernmentState, nextFineState } from './government.js';

export async function payCanonicalGovernmentFine(db: Database, playerId: string, fineId: string, requestedCents: number) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const identityQ = await client.query('SELECT ensure_citizen_identity_db($1::uuid) AS id', [playerId]);
    const identityId = identityQ.rows[0]?.id;
    if (!identityId) throw new GovernmentCommandError('player_not_found', 404);

    const fine = (await client.query(`SELECT * FROM government_fines WHERE id=$1 AND citizen_identity_id=$2 FOR UPDATE`, [fineId, identityId])).rows[0];
    if (!fine) throw new GovernmentCommandError('fine_not_found', 404);
    if (!['outstanding','partial'].includes(fine.status) || Number(fine.balance_cents) <= 0) throw new GovernmentCommandError('fine_not_payable', 409);

    const next = nextFineState(Number(fine.balance_cents), requestedCents);
    const player = (await client.query(`SELECT cash_cents FROM player_state WHERE player_id=$1 FOR UPDATE`, [playerId])).rows[0];
    if (!player || Number(player.cash_cents) < next.appliedCents) throw new GovernmentCommandError('insufficient_cash', 409);

    await client.query(`UPDATE government_fines SET balance_cents=$2,status=$3,paid_at=CASE WHEN $3='paid' THEN now() ELSE NULL END,updated_at=now() WHERE id=$1`, [fineId, next.nextBalanceCents, next.status]);

    if (fine.source_type === 'justice_case' && fine.source_ref) {
      const justice = await client.query(`UPDATE justice_cases SET fine_balance_cents=$3,updated_at=now() WHERE id=$1::uuid AND defendant_player_id=$2 RETURNING id`, [fine.source_ref, playerId, next.nextBalanceCents]);
      if (!justice.rowCount) throw new GovernmentCommandError('justice_fine_source_missing', 409);
      await client.query(`UPDATE justice_player_status SET outstanding_fines_cents=GREATEST(0,outstanding_fines_cents-$2),updated_at=now() WHERE player_id=$1`, [playerId, next.appliedCents]);
      await client.query(`INSERT INTO justice_case_events(case_id,event_type,actor_kind,note,details) VALUES($1::uuid,'fine_payment','system','Court fine payment received.',$2::jsonb)`, [fine.source_ref, JSON.stringify({ amountCents: next.appliedCents, remainingCents: next.nextBalanceCents })]);
    }

    await client.query(`UPDATE player_state SET cash_cents=cash_cents-$2,version=version+1,updated_at=now() WHERE player_id=$1`, [playerId, next.appliedCents]);
    await client.query(`INSERT INTO finance_ledger(player_id,entry_type,title,amount_cents,direction,detail) VALUES($1,'cash','Government fine payment',$2,'out',$3)`, [playerId, next.appliedCents, fine.fine_number]);
    await client.query(`INSERT INTO government_record_events(citizen_identity_id,record_type,agency,summary,entity_type,entity_ref) VALUES($1,'fine_payment',$2,$3,'government_fine',$4)`, [identityId, fine.issuing_agency, `Payment applied to ${fine.fine_number}. Remaining balance: ${next.nextBalanceCents} cents.`, fineId]);
    await client.query('COMMIT');
    return getGovernmentState(db, playerId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
