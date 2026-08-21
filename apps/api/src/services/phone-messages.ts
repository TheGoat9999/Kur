import type { Pool } from 'pg';
import type { PhoneState } from '@sol-dorado/contracts/phone';
import { getPhoneState, PhoneCommandError } from './phone.js';

export async function sendPhoneMessageTransactional(
  db: Pool,
  playerId: string,
  threadId: string,
  body: string
): Promise<PhoneState> {
  const current = await getPhoneState(db, playerId);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const thread = await client.query({
      text: 'SELECT id FROM phone_threads WHERE id = $1 AND device_id = $2 FOR UPDATE',
      values: [threadId, current.device.id]
    });
    if (!thread.rowCount) throw new PhoneCommandError('phone_thread_not_found', 404);

    await client.query({
      text: `INSERT INTO phone_messages (thread_id, sender, body, read_at) VALUES ($1, 'player', $2, now())`,
      values: [threadId, body]
    });
    await client.query('UPDATE phone_threads SET updated_at = now() WHERE id = $1', [threadId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return getPhoneState(db, playerId);
}
