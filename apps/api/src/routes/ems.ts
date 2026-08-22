import { Router } from 'express';
import {
  EmsAssessmentRequestSchema,
  EmsCallIdRequestSchema,
  EmsDutyRequestSchema,
  EmsHandoffRequestSchema,
  EmsReportCallRequestSchema,
  EmsStatusRequestSchema,
  EmsTreatmentRequestSchema
} from '@sol-dorado/contracts/ems';
import type { AppServices } from '../types.js';
import {
  acceptEmsCall,
  applyEmsTreatment,
  EmsCommandError,
  getEmsAccess,
  getEmsState,
  handoffEmsCall,
  reportEmsCall,
  saveEmsAssessment,
  setEmsDuty,
  updateEmsCallStatus
} from '../services/ems.js';

export function emsRoutes(services: AppServices) {
  const router = Router();
  const command = async (response: any, run: () => Promise<unknown>) => {
    try { response.json(await run()); }
    catch (error) {
      if (error instanceof EmsCommandError) return response.status(error.status).json({ error: error.code });
      throw error;
    }
  };

  router.get('/v1/ems/access', async (request, response) => {
    response.json(await getEmsAccess(services.db, request.playerId!));
  });

  router.get('/v1/ems', async (request, response) => {
    return command(response, () => getEmsState(services.db, request.playerId!));
  });

  router.post('/v1/ems/duty', async (request, response) => {
    const parsed = EmsDutyRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_ems_duty', issues: parsed.error.issues });
    return command(response, () => setEmsDuty(services.db, request.playerId!, parsed.data.onDuty));
  });

  router.post('/v1/ems/calls', async (request, response) => {
    const parsed = EmsReportCallRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_ems_call', issues: parsed.error.issues });
    return command(response, () => reportEmsCall(services.db, request.playerId!, parsed.data.priority, parsed.data.incidentType, parsed.data.summary));
  });

  router.post('/v1/ems/calls/accept', async (request, response) => {
    const parsed = EmsCallIdRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_ems_call_id', issues: parsed.error.issues });
    return command(response, () => acceptEmsCall(services.db, request.playerId!, parsed.data.callId));
  });

  router.post('/v1/ems/calls/status', async (request, response) => {
    const parsed = EmsStatusRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_ems_status', issues: parsed.error.issues });
    if (parsed.data.status === 'on_scene') {
      const proximity = await services.db.query(`
        SELECT c.street_segment_id, c.position_x AS call_x, c.position_y AS call_y,
          s.current_segment_id, s.position_x AS responder_x, s.position_y AS responder_y
        FROM ems_calls c
        JOIN player_street_state s ON s.player_id = $2
        WHERE c.id = $1
      `, [parsed.data.callId, request.playerId!]);
      const row = proximity.rows[0];
      if (!row) return response.status(409).json({ error: 'ems_not_close_enough' });
      const dx = Number(row.call_x) - Number(row.responder_x);
      const dy = Number(row.call_y) - Number(row.responder_y);
      if (row.street_segment_id !== row.current_segment_id || Math.hypot(dx, dy) > 18) {
        return response.status(409).json({ error: 'ems_not_close_enough' });
      }
    }
    return command(response, () => updateEmsCallStatus(services.db, request.playerId!, parsed.data.callId, parsed.data.status));
  });

  router.post('/v1/ems/assessment', async (request, response) => {
    const parsed = EmsAssessmentRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_ems_assessment', issues: parsed.error.issues });
    return command(response, () => saveEmsAssessment(services.db, request.playerId!, parsed.data));
  });

  router.post('/v1/ems/treatment', async (request, response) => {
    const parsed = EmsTreatmentRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_ems_treatment', issues: parsed.error.issues });
    return command(response, () => applyEmsTreatment(services.db, request.playerId!, parsed.data.callId, parsed.data.treatment));
  });

  router.post('/v1/ems/handoff', async (request, response) => {
    const parsed = EmsHandoffRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_ems_handoff', issues: parsed.error.issues });
    return command(response, () => handoffEmsCall(services.db, request.playerId!, parsed.data.callId, parsed.data.outcome, parsed.data.notes));
  });

  return router;
}
