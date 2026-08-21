import { randomInt } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import {
  PhoneStateSchema,
  type PhoneSettings,
  type PhoneState
} from '@sol-dorado/contracts/phone';

interface DeviceRow {
  id: string;
  inventory_item_id: string;
  owner_player_id: string;
  phone_number: string;
  device_name: string;
  battery_percent: number;
  charging: boolean;
  signal_bars: number;
  network: string;
  settings: PhoneSettings;
}

export class PhoneCommandError extends Error {
  constructor(public readonly code: string, public readonly status = 409) {
    super(code);
  }
}

export async function getPhoneState(db: Pool, playerId: string): Promise<PhoneState> {
  const device = await ensurePhoneDevice(db, playerId);
  return readPhoneState(db, device);
}

export async function updatePhoneSettings(db: Pool, playerId: string, patch: Partial<PhoneSettings>): Promise<PhoneState> {
  const device = await ensurePhoneDevice(db, playerId);
  await db.query({
    text: `UPDATE phone_devices SET settings = settings || $2::jsonb, updated_at = now() WHERE id = $1`,
    values: [device.id, JSON.stringify(patch)]
  });
  return readPhoneState(db, device.id);
}

export async function sendPhoneMessage(db: Pool, playerId: string, threadId: string, body: string): Promise<PhoneState> {
  const device = await ensurePhoneDevice(db, playerId);
  const thread = await db.query({
    text: 'SELECT id FROM phone_threads WHERE id = $1 AND device_id = $2',
    values: [threadId, device.id]
  });
  if (!thread.rowCount) throw new PhoneCommandError('phone_thread_not_found', 404);

  await db.query('BEGIN');
  try {
    await db.query({
      text: `INSERT INTO phone_messages (thread_id, sender, body, read_at) VALUES ($1, 'player', $2, now())`,
      values: [threadId, body]
    });
    await db.query('UPDATE phone_threads SET updated_at = now() WHERE id = $1', [threadId]);
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
  return readPhoneState(db, device.id);
}

export async function markPhoneNotificationRead(
  db: Pool,
  playerId: string,
  notificationId?: string,
  all = false
): Promise<PhoneState> {
  const device = await ensurePhoneDevice(db, playerId);
  if (all) {
    await db.query('UPDATE phone_notifications SET read_at = COALESCE(read_at, now()) WHERE device_id = $1', [device.id]);
  } else if (notificationId) {
    const result = await db.query({
      text: `UPDATE phone_notifications SET read_at = COALESCE(read_at, now()) WHERE id = $1 AND device_id = $2`,
      values: [notificationId, device.id]
    });
    if (!result.rowCount) throw new PhoneCommandError('phone_notification_not_found', 404);
  }
  return readPhoneState(db, device.id);
}

export async function togglePhoneTask(db: Pool, playerId: string, taskId: string, completed: boolean): Promise<PhoneState> {
  const device = await ensurePhoneDevice(db, playerId);
  const result = await db.query({
    text: `UPDATE phone_tasks SET completed = $3, updated_at = now() WHERE id = $1 AND device_id = $2`,
    values: [taskId, device.id, completed]
  });
  if (!result.rowCount) throw new PhoneCommandError('phone_task_not_found', 404);
  return readPhoneState(db, device.id);
}

export async function savePhoneNote(
  db: Pool,
  playerId: string,
  input: { noteId?: string; title: string; body: string; pinned: boolean }
): Promise<PhoneState> {
  const device = await ensurePhoneDevice(db, playerId);
  if (input.noteId) {
    const result = await db.query({
      text: `UPDATE phone_notes SET title = $3, body = $4, pinned = $5, updated_at = now() WHERE id = $1 AND device_id = $2`,
      values: [input.noteId, device.id, input.title, input.body, input.pinned]
    });
    if (!result.rowCount) throw new PhoneCommandError('phone_note_not_found', 404);
  } else {
    await db.query({
      text: `INSERT INTO phone_notes (device_id, title, body, pinned) VALUES ($1, $2, $3, $4)`,
      values: [device.id, input.title, input.body, input.pinned]
    });
  }
  return readPhoneState(db, device.id);
}

async function ensurePhoneDevice(db: Pool, playerId: string): Promise<DeviceRow> {
  const carried = await db.query({
    text: `
      SELECT ii.id
      FROM inventory_items ii
      JOIN inventory_containers ic ON ic.id = ii.container_id
      WHERE ii.player_id = $1
        AND ic.container_key = 'player'
        AND ii.item_key IN ('phone', 'smartphone', 'mobile_phone')
      ORDER BY ii.slot_index
      LIMIT 1
    `,
    values: [playerId]
  });
  if (!carried.rowCount) throw new PhoneCommandError('phone_not_carried', 404);
  const inventoryItemId = String(carried.rows[0].id);

  const existing = await db.query({
    text: `
      UPDATE phone_devices
      SET owner_player_id = $2, updated_at = CASE WHEN owner_player_id <> $2 THEN now() ELSE updated_at END
      WHERE inventory_item_id = $1
      RETURNING *
    `,
    values: [inventoryItemId, playerId]
  });
  if (existing.rowCount) return existing.rows[0] as DeviceRow;

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const device = await createDevice(client, inventoryItemId, playerId);
    await seedDevice(client, device.id);
    await client.query('COMMIT');
    return device;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function createDevice(client: PoolClient, inventoryItemId: string, playerId: string): Promise<DeviceRow> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const number = `+1 555 ${String(randomInt(100, 1000))} ${String(randomInt(1000, 10000))}`;
    try {
      const result = await client.query({
        text: `
          INSERT INTO phone_devices (inventory_item_id, owner_player_id, phone_number)
          VALUES ($1, $2, $3)
          RETURNING *
        `,
        values: [inventoryItemId, playerId, number]
      });
      return result.rows[0] as DeviceRow;
    } catch (error) {
      if (isUniqueViolation(error)) continue;
      throw error;
    }
  }
  throw new PhoneCommandError('phone_number_allocation_failed', 503);
}

async function seedDevice(client: PoolClient, deviceId: string) {
  const contacts = [
    { name: 'Мая Рохас', number: '+1 555 114 2210', favorite: true, color: '#d58b64' },
    { name: 'Лео Картър', number: '+1 555 777 4811', favorite: true, color: '#5b91be' },
    { name: 'Dorado Bank', number: '+1 555 200 0100', favorite: false, color: '#c89c4e' }
  ];

  const contactIds = new Map<string, string>();
  for (const contact of contacts) {
    const result = await client.query({
      text: `
        INSERT INTO phone_contacts (device_id, name, phone_number, favorite, color)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      values: [deviceId, contact.name, contact.number, contact.favorite, contact.color]
    });
    contactIds.set(contact.name, String(result.rows[0].id));
  }

  const mayaThread = await client.query({
    text: `INSERT INTO phone_threads (device_id, contact_id, title, phone_number) VALUES ($1, $2, 'Мая Рохас', '+1 555 114 2210') RETURNING id`,
    values: [deviceId, contactIds.get('Мая Рохас')]
  });
  await client.query({
    text: `INSERT INTO phone_messages (thread_id, sender, body) VALUES ($1, 'contact', 'Добре дошъл в квартала. Пиши ми, ако търсиш нещо конкретно.')`,
    values: [mayaThread.rows[0].id]
  });

  const bankThread = await client.query({
    text: `INSERT INTO phone_threads (device_id, contact_id, title, phone_number) VALUES ($1, $2, 'Dorado Bank', '+1 555 200 0100') RETURNING id`,
    values: [deviceId, contactIds.get('Dorado Bank')]
  });
  await client.query({
    text: `INSERT INTO phone_messages (thread_id, sender, body, read_at) VALUES ($1, 'system', 'Мобилното банкиране е активирано за това устройство.', now())`,
    values: [bankThread.rows[0].id]
  });

  await client.query({
    text: `
      INSERT INTO phone_notifications (device_id, app_id, title, body)
      VALUES
        ($1, 'settings', 'DoradoOS е готов', 'Настрой тапета, известията и мащаба на телефона.'),
        ($1, 'messages', 'Мая Рохас', 'Имаш ново съобщение.'),
        ($1, 'tasks', 'Задачи', 'Провери квартала и се ориентирай в града.')
    `,
    values: [deviceId]
  });

  await client.query({
    text: `
      INSERT INTO phone_tasks (device_id, title, source, due_at)
      VALUES
        ($1, 'Разгледай Market Street', 'Град', now() + interval '3 hours'),
        ($1, 'Провери съобщението от Мая', 'Лично', null),
        ($1, 'Настрой телефона си', 'DoradoOS', null)
    `,
    values: [deviceId]
  });

  await client.query({
    text: `INSERT INTO phone_notes (device_id, title, body, pinned) VALUES ($1, 'Първи ден', 'Номера, адреси и неща, които не искам да забравя.', true)`,
    values: [deviceId]
  });
}

async function readPhoneState(db: Pool | PoolClient, deviceOrId: DeviceRow | string): Promise<PhoneState> {
  const deviceResult = typeof deviceOrId === 'string'
    ? await db.query('SELECT * FROM phone_devices WHERE id = $1', [deviceOrId])
    : { rows: [deviceOrId], rowCount: 1 };
  const device = deviceResult.rows[0] as DeviceRow | undefined;
  if (!device) throw new PhoneCommandError('phone_device_not_found', 404);

  const [contactsResult, threadsResult, messagesResult, notificationsResult, tasksResult, notesResult] = await Promise.all([
    db.query({ text: `SELECT id, name, phone_number, favorite, color FROM phone_contacts WHERE device_id = $1 ORDER BY favorite DESC, name`, values: [device.id] }),
    db.query({ text: `SELECT id, contact_id, title, phone_number FROM phone_threads WHERE device_id = $1 ORDER BY updated_at DESC`, values: [device.id] }),
    db.query({
      text: `
        SELECT pm.id, pm.thread_id, pm.sender, pm.body, pm.created_at, pm.read_at
        FROM phone_messages pm
        JOIN phone_threads pt ON pt.id = pm.thread_id
        WHERE pt.device_id = $1
        ORDER BY pm.created_at
      `,
      values: [device.id]
    }),
    db.query({ text: `SELECT id, app_id, title, body, created_at, read_at FROM phone_notifications WHERE device_id = $1 ORDER BY created_at DESC LIMIT 40`, values: [device.id] }),
    db.query({ text: `SELECT id, title, completed, source, due_at FROM phone_tasks WHERE device_id = $1 ORDER BY completed, due_at NULLS LAST, created_at`, values: [device.id] }),
    db.query({ text: `SELECT id, title, body, pinned, updated_at FROM phone_notes WHERE device_id = $1 ORDER BY pinned DESC, updated_at DESC LIMIT 30`, values: [device.id] })
  ]);

  const messagesByThread = new Map<string, typeof messagesResult.rows>();
  for (const row of messagesResult.rows) {
    const list = messagesByThread.get(String(row.thread_id)) ?? [];
    list.push(row);
    messagesByThread.set(String(row.thread_id), list);
  }

  return PhoneStateSchema.parse({
    device: {
      id: device.id,
      inventoryItemId: device.inventory_item_id,
      phoneNumber: device.phone_number,
      deviceName: device.device_name,
      batteryPercent: Number(device.battery_percent),
      charging: Boolean(device.charging),
      signalBars: Number(device.settings?.airplaneMode ? 0 : device.signal_bars),
      network: device.settings?.airplaneMode ? 'offline' : device.network,
      settings: device.settings
    },
    contacts: contactsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      phoneNumber: row.phone_number,
      favorite: row.favorite,
      color: row.color
    })),
    threads: threadsResult.rows.map(row => {
      const messages = messagesByThread.get(String(row.id)) ?? [];
      return {
        id: row.id,
        contactId: row.contact_id,
        title: row.title,
        phoneNumber: row.phone_number,
        unreadCount: messages.filter(message => message.sender !== 'player' && !message.read_at).length,
        messages: messages.map(message => ({
          id: message.id,
          sender: message.sender,
          body: message.body,
          createdAt: new Date(message.created_at).toISOString(),
          read: Boolean(message.read_at) || message.sender === 'player'
        }))
      };
    }),
    notifications: notificationsResult.rows.map(row => ({
      id: row.id,
      appId: row.app_id,
      title: row.title,
      body: row.body,
      createdAt: new Date(row.created_at).toISOString(),
      read: Boolean(row.read_at)
    })),
    tasks: tasksResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      completed: row.completed,
      source: row.source,
      dueAt: row.due_at ? new Date(row.due_at).toISOString() : null
    })),
    notes: notesResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      body: row.body,
      pinned: row.pinned,
      updatedAt: new Date(row.updated_at).toISOString()
    }))
  });
}

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505';
}
