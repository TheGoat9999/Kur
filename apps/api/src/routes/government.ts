import { Router } from 'express';
import {
  GovernmentBusinessLicenseRequestSchema,
  GovernmentFinePaymentRequestSchema,
  GovernmentIdentityUpdateRequestSchema
} from '@sol-dorado/contracts/government';
import type { AppServices } from '../types.js';
import {
  GovernmentCommandError,
  applyBusinessLicense,
  getGovernmentState,
  issueDrivingLicense,
  issueIdCard,
  updateCitizenProfile
} from '../services/government.js';
import { payCanonicalGovernmentFine } from '../services/government-fines.js';

export function governmentRoutes(services: AppServices) {
  const router = Router();
  const handle = (response: any, error: unknown) => {
    if (error instanceof GovernmentCommandError) return response.status(error.status).json({ error: error.code });
    throw error;
  };

  router.get('/v1/government', async (request, response) => {
    try { response.json(await getGovernmentState(services.db, request.playerId!)); }
    catch (error) { handle(response, error); }
  });

  router.put('/v1/government/identity', async (request, response) => {
    const parsed = GovernmentIdentityUpdateRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_citizen_identity', issues: parsed.error.issues });
    try { response.json(await updateCitizenProfile(services.db, request.playerId!, parsed.data.dateOfBirth, parsed.data.nationalityCode)); }
    catch (error) { handle(response, error); }
  });

  router.post('/v1/government/id-card', async (request, response) => {
    try { response.json(await issueIdCard(services.db, request.playerId!)); }
    catch (error) { handle(response, error); }
  });

  router.post('/v1/government/driving-license', async (request, response) => {
    try { response.json(await issueDrivingLicense(services.db, request.playerId!)); }
    catch (error) { handle(response, error); }
  });

  router.post('/v1/government/business-license', async (request, response) => {
    const parsed = GovernmentBusinessLicenseRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_business_license_application', issues: parsed.error.issues });
    try { response.json(await applyBusinessLicense(services.db, request.playerId!, parsed.data.businessName)); }
    catch (error) { handle(response, error); }
  });

  router.post('/v1/government/fines/pay', async (request, response) => {
    const parsed = GovernmentFinePaymentRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_fine_payment', issues: parsed.error.issues });
    try { response.json(await payCanonicalGovernmentFine(services.db, request.playerId!, parsed.data.fineId, parsed.data.amountCents)); }
    catch (error) { handle(response, error); }
  });

  return router;
}
