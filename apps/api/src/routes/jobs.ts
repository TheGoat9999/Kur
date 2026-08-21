import { Router } from 'express';
import { JobChoiceRequestSchema, JobFinishRequestSchema, JobStartRequestSchema, JobTaskRequestSchema } from '@sol-dorado/contracts/jobs';
import type { AppServices } from '../types.js';
import { chooseJobEvent, completeJobTask, finishJobShift, getJobsState, JobCommandError, startJobShift } from '../services/jobs.js';

export function jobRoutes(services: AppServices) {
  const router = Router();

  router.get('/v1/jobs', async (request, response) => {
    response.json(await getJobsState(services.db, request.playerId!));
  });

  router.post('/v1/jobs/start', async (request, response) => {
    const parsed = JobStartRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_job_start', issues: parsed.error.issues });
    try { response.json(await startJobShift(services.db, request.playerId!, parsed.data.jobId)); }
    catch (error) { if (error instanceof JobCommandError) return response.status(error.status).json({ error: error.code }); throw error; }
  });

  router.post('/v1/jobs/task', async (request, response) => {
    const parsed = JobTaskRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_job_task', issues: parsed.error.issues });
    try { response.json(await completeJobTask(services.db, request.playerId!, parsed.data.shiftId, parsed.data.taskId)); }
    catch (error) { if (error instanceof JobCommandError) return response.status(error.status).json({ error: error.code }); throw error; }
  });

  router.post('/v1/jobs/choice', async (request, response) => {
    const parsed = JobChoiceRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_job_choice', issues: parsed.error.issues });
    try { response.json(await chooseJobEvent(services.db, request.playerId!, parsed.data.shiftId, parsed.data.eventId, parsed.data.choiceId)); }
    catch (error) { if (error instanceof JobCommandError) return response.status(error.status).json({ error: error.code }); throw error; }
  });

  router.post('/v1/jobs/finish', async (request, response) => {
    const parsed = JobFinishRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_job_finish', issues: parsed.error.issues });
    try { response.json(await finishJobShift(services.db, request.playerId!, parsed.data.shiftId)); }
    catch (error) { if (error instanceof JobCommandError) return response.status(error.status).json({ error: error.code }); throw error; }
  });

  return router;
}
