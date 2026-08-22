import { Router } from 'express';
import {
  HospitalityCompleteProductionRequestSchema,
  HospitalityDemandCycleRequestSchema,
  HospitalityStartProductionRequestSchema,
  SupplyPurchaseOrderRequestSchema,
  SupplyReceiveShipmentRequestSchema
} from '@sol-dorado/contracts/hospitality';
import type { AppServices } from '../types.js';
import { getHospitalityState } from '../services/hospitality-state.js';
import { completeProduction, HospitalityCommandError, startProduction } from '../services/hospitality-production.js';
import { runHospitalityDemandCycle } from '../services/hospitality-demand.js';
import { placePurchaseOrder, receiveShipment, SupplyChainCommandError } from '../services/supply-chain.js';

export function hospitalityRoutes(services: AppServices) {
  const router = Router();

  router.get('/v1/hospitality/:businessId', async (req, res) => {
    try {
      res.json(await getHospitalityState(services.db, req.playerId!, req.params.businessId));
    } catch (error) {
      if (error instanceof HospitalityCommandError) return res.status(error.status).json({ error: error.code });
      throw error;
    }
  });

  const handle = (fn: (body: unknown, playerId: string) => Promise<unknown>) => async (req: any, res: any) => {
    try {
      res.json(await fn(req.body, req.playerId!));
    } catch (error) {
      if (error instanceof HospitalityCommandError || error instanceof SupplyChainCommandError) {
        return res.status(error.status).json({ error: error.code });
      }
      throw error;
    }
  };

  router.post('/v1/hospitality/production/start', handle(async (body, playerId) => {
    const input = HospitalityStartProductionRequestSchema.parse(body);
    const result = await startProduction(services.db, playerId, input.businessId, input.recipeKey, input.batches);
    return { result, state: await getHospitalityState(services.db, playerId, input.businessId) };
  }));

  router.post('/v1/hospitality/production/complete', handle(async (body, playerId) => {
    const input = HospitalityCompleteProductionRequestSchema.parse(body);
    const result = await completeProduction(services.db, playerId, input.batchId);
    return { result };
  }));

  router.post('/v1/hospitality/purchase-orders', handle(async (body, playerId) => {
    const input = SupplyPurchaseOrderRequestSchema.parse(body);
    const result = await placePurchaseOrder(
      services.db,
      playerId,
      input.businessId,
      input.supplierId,
      input.destinationPropertyId,
      input.lines
    );
    return { result, state: await getHospitalityState(services.db, playerId, input.businessId) };
  }));

  router.post('/v1/hospitality/shipments/receive', handle(async (body, playerId) => {
    const input = SupplyReceiveShipmentRequestSchema.parse(body);
    const result = await receiveShipment(services.db, playerId, input.shipmentId);
    return { result };
  }));

  router.post('/v1/hospitality/demand-cycle', handle(async (body, playerId) => {
    const input = HospitalityDemandCycleRequestSchema.parse(body);
    const demand = await runHospitalityDemandCycle(services.db, playerId, input.businessId);
    return { demand, state: await getHospitalityState(services.db, playerId, input.businessId) };
  }));

  return router;
}
