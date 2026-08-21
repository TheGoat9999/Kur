import { Router } from 'express';
import { VehicleActionRequestSchema, VehiclePurchaseRequestSchema, VehicleTravelRequestSchema } from '@sol-dorado/contracts/vehicles';
import type { AppServices } from '../types.js';
import { getVehicleState, purchaseVehicle, travelWithVehicle, vehicleAction, VehicleCommandError } from '../services/vehicles.js';

export function vehicleRoutes(services: AppServices) {
  const router = Router();

  router.get('/v1/vehicles', async (request, response) => {
    response.json(await getVehicleState(services.db, request.playerId!));
  });

  router.post('/v1/vehicles/purchase', async (request, response) => {
    const parsed = VehiclePurchaseRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_vehicle_purchase', issues: parsed.error.issues });
    try {
      response.json(await purchaseVehicle(services.db, request.playerId!, parsed.data.stockKey));
    } catch (error) {
      if (error instanceof VehicleCommandError) return response.status(error.status).json({ error: error.code });
      throw error;
    }
  });

  router.post('/v1/vehicles/action', async (request, response) => {
    const parsed = VehicleActionRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_vehicle_action', issues: parsed.error.issues });
    try {
      response.json(await vehicleAction(services.db, request.playerId!, parsed.data.vehicleId, parsed.data.action));
    } catch (error) {
      if (error instanceof VehicleCommandError) return response.status(error.status).json({ error: error.code });
      throw error;
    }
  });

  router.post('/v1/vehicles/travel', async (request, response) => {
    const parsed = VehicleTravelRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: 'invalid_vehicle_travel', issues: parsed.error.issues });
    try {
      response.json(await travelWithVehicle(services.db, request.playerId!, parsed.data.vehicleId, parsed.data.segmentId));
    } catch (error) {
      if (error instanceof VehicleCommandError) return response.status(error.status).json({ error: error.code });
      throw error;
    }
  });

  return router;
}
