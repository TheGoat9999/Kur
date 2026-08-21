import { Router } from 'express';
import {
  PoliceBoloActionRequestSchema,
  PoliceBoloCreateRequestSchema,
  PoliceCareerActionRequestSchema,
  PoliceDispatchActionRequestSchema,
  PoliceDispatchCreateRequestSchema,
  PoliceDutyRequestSchema,
  PoliceEncounterActionRequestSchema,
  PoliceEncounterStartRequestSchema,
  PoliceEvidenceActionRequestSchema,
  PoliceEvidenceCreateRequestSchema,
  PoliceIntelCreateRequestSchema,
  PolicePursuitActionRequestSchema,
  PolicePursuitStartRequestSchema,
  PoliceReportCreateRequestSchema,
  PoliceWarrantActionRequestSchema,
  PoliceWarrantCreateRequestSchema
} from '@sol-dorado/contracts/police';
import type { AppServices } from '../types.js';
import {
  PoliceCommandError,
  addIntel,
  boloAction,
  careerAction,
  createBolo,
  createDispatchCall,
  createEvidence,
  createReport,
  createWarrant,
  dispatchAction,
  encounterAction,
  evidenceAction,
  getPoliceState,
  pursuitAction,
  setDuty,
  startEncounter,
  startPursuit,
  warrantAction
} from '../services/police.js';

export function policeRoutes(services: AppServices) {
  const router = Router();
  const handle = (response: any, error: unknown) => {
    if (error instanceof PoliceCommandError) return response.status(error.status).json({ error: error.code });
    throw error;
  };

  router.get('/v1/police', async (request, response) => response.json(await getPoliceState(services.db, request.playerId!)));

  router.post('/v1/police/career', async (request, response) => {
    const parsed = PoliceCareerActionRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_police_career_action', issues: parsed.error.issues });
    try { response.json(await careerAction(services.db, request.playerId!, parsed.data.action)); } catch (error) { handle(response, error); }
  });

  router.post('/v1/police/duty', async (request, response) => {
    const parsed = PoliceDutyRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_police_duty_action', issues: parsed.error.issues });
    try { response.json(await setDuty(services.db, request.playerId!, parsed.data.onDuty, parsed.data.callsign)); } catch (error) { handle(response, error); }
  });

  router.post('/v1/police/dispatch', async (request, response) => {
    const parsed = PoliceDispatchCreateRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_police_dispatch', issues: parsed.error.issues });
    try { response.json(await createDispatchCall(services.db, request.playerId!, parsed.data)); } catch (error) { handle(response, error); }
  });

  router.post('/v1/police/dispatch/action', async (request, response) => {
    const parsed = PoliceDispatchActionRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_police_dispatch_action', issues: parsed.error.issues });
    try { response.json(await dispatchAction(services.db, request.playerId!, parsed.data.callId, parsed.data.action)); } catch (error) { handle(response, error); }
  });

  router.post('/v1/police/intel', async (request, response) => {
    const parsed = PoliceIntelCreateRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_police_intel', issues: parsed.error.issues });
    try { response.json(await addIntel(services.db, request.playerId!, parsed.data)); } catch (error) { handle(response, error); }
  });

  router.post('/v1/police/encounters', async (request, response) => {
    const parsed = PoliceEncounterStartRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_police_encounter', issues: parsed.error.issues });
    try { response.json(await startEncounter(services.db, request.playerId!, parsed.data)); } catch (error) { handle(response, error); }
  });

  router.post('/v1/police/encounters/action', async (request, response) => {
    const parsed = PoliceEncounterActionRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_police_encounter_action', issues: parsed.error.issues });
    try { response.json(await encounterAction(services.db, request.playerId!, parsed.data.encounterId, parsed.data.action)); } catch (error) { handle(response, error); }
  });

  router.post('/v1/police/reports', async (request, response) => {
    const parsed = PoliceReportCreateRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_police_report', issues: parsed.error.issues });
    try { response.json(await createReport(services.db, request.playerId!, parsed.data)); } catch (error) { handle(response, error); }
  });

  router.post('/v1/police/warrants', async (request, response) => {
    const parsed = PoliceWarrantCreateRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_police_warrant', issues: parsed.error.issues });
    try { response.json(await createWarrant(services.db, request.playerId!, parsed.data)); } catch (error) { handle(response, error); }
  });

  router.post('/v1/police/warrants/action', async (request, response) => {
    const parsed = PoliceWarrantActionRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_police_warrant_action', issues: parsed.error.issues });
    try { response.json(await warrantAction(services.db, request.playerId!, parsed.data.warrantId, parsed.data.action)); } catch (error) { handle(response, error); }
  });

  router.post('/v1/police/bolos', async (request, response) => {
    const parsed = PoliceBoloCreateRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_police_bolo', issues: parsed.error.issues });
    try { response.json(await createBolo(services.db, request.playerId!, parsed.data)); } catch (error) { handle(response, error); }
  });

  router.post('/v1/police/bolos/action', async (request, response) => {
    const parsed = PoliceBoloActionRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_police_bolo_action', issues: parsed.error.issues });
    try { response.json(await boloAction(services.db, request.playerId!, parsed.data.boloId, parsed.data.action)); } catch (error) { handle(response, error); }
  });

  router.post('/v1/police/evidence', async (request, response) => {
    const parsed = PoliceEvidenceCreateRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_police_evidence', issues: parsed.error.issues });
    try { response.json(await createEvidence(services.db, request.playerId!, parsed.data)); } catch (error) { handle(response, error); }
  });

  router.post('/v1/police/evidence/action', async (request, response) => {
    const parsed = PoliceEvidenceActionRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_police_evidence_action', issues: parsed.error.issues });
    try { response.json(await evidenceAction(services.db, request.playerId!, parsed.data.evidenceId, parsed.data.action, parsed.data.note)); } catch (error) { handle(response, error); }
  });

  router.post('/v1/police/pursuits', async (request, response) => {
    const parsed = PolicePursuitStartRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_police_pursuit', issues: parsed.error.issues });
    try { response.json(await startPursuit(services.db, request.playerId!, parsed.data)); } catch (error) { handle(response, error); }
  });

  router.post('/v1/police/pursuits/action', async (request, response) => {
    const parsed = PolicePursuitActionRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_police_pursuit_action', issues: parsed.error.issues });
    try { response.json(await pursuitAction(services.db, request.playerId!, parsed.data.pursuitId, parsed.data.action)); } catch (error) { handle(response, error); }
  });

  return router;
}
