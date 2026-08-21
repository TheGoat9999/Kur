import { Router, type Response } from 'express';
import {
  PhoneReadNotificationRequestSchema,
  PhoneSaveNoteRequestSchema,
  PhoneSendMessageRequestSchema,
  PhoneSettingsPatchSchema,
  PhoneToggleTaskRequestSchema
} from '@sol-dorado/contracts/phone';
import type { AppServices } from '../types.js';
import {
  getPhoneState,
  markPhoneNotificationRead,
  PhoneCommandError,
  savePhoneNote,
  sendPhoneMessage,
  togglePhoneTask,
  updatePhoneSettings
} from '../services/phone.js';

export function phoneRoutes(services: AppServices) {
  const router = Router();

  router.get('/v1/phone', async (request, response) => {
    try { response.json(await getPhoneState(services.db, request.playerId!)); }
    catch (error) { handlePhoneError(error, response); }
  });

  router.patch('/v1/phone/settings', async (request, response) => {
    const body = parse(PhoneSettingsPatchSchema, request.body, response);
    if (!body) return;
    try { response.json(await updatePhoneSettings(services.db, request.playerId!, body)); }
    catch (error) { handlePhoneError(error, response); }
  });

  router.post('/v1/phone/messages', async (request, response) => {
    const body = parse(PhoneSendMessageRequestSchema, request.body, response);
    if (!body) return;
    try { response.json(await sendPhoneMessage(services.db, request.playerId!, body.threadId, body.body)); }
    catch (error) { handlePhoneError(error, response); }
  });

  router.post('/v1/phone/notifications/read', async (request, response) => {
    const body = parse(PhoneReadNotificationRequestSchema, request.body, response);
    if (!body) return;
    try { response.json(await markPhoneNotificationRead(services.db, request.playerId!, body.notificationId, body.all === true)); }
    catch (error) { handlePhoneError(error, response); }
  });

  router.patch('/v1/phone/tasks', async (request, response) => {
    const body = parse(PhoneToggleTaskRequestSchema, request.body, response);
    if (!body) return;
    try { response.json(await togglePhoneTask(services.db, request.playerId!, body.taskId, body.completed)); }
    catch (error) { handlePhoneError(error, response); }
  });

  router.post('/v1/phone/notes', async (request, response) => {
    const body = parse(PhoneSaveNoteRequestSchema, request.body, response);
    if (!body) return;
    try { response.json(await savePhoneNote(services.db, request.playerId!, body)); }
    catch (error) { handlePhoneError(error, response); }
  });

  return router;
}

function parse<T>(
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: { issues: unknown[] } } },
  value: unknown,
  response: Response
): T | null {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  response.status(400).json({ error: 'invalid_phone_request', issues: parsed.error.issues });
  return null;
}

function handlePhoneError(error: unknown, response: Response) {
  if (error instanceof PhoneCommandError) {
    response.status(error.status).json({ error: error.code });
    return;
  }
  throw error;
}
