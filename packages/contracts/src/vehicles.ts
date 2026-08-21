import { z } from 'zod';

export const VehicleClassSchema = z.enum(['compact', 'sedan', 'suv', 'pickup', 'sports', 'utility']);
export const VehicleParkingKindSchema = z.enum(['dealership', 'street', 'home', 'parking']);

export const VehicleWorldPositionSchema = z.object({
  x: z.number().finite().min(0).max(100),
  y: z.number().finite().min(0).max(100)
});

export const VehicleWorldLocationSchema = z.object({
  region: z.string().min(1),
  settlement: z.string().min(1),
  zone: z.string().min(1),
  district: z.string().min(1),
  street: z.string().min(1),
  segment: z.string().min(1)
});

export const VehicleModelSchema = z.object({
  id: z.string().min(1),
  brand: z.string().min(1),
  model: z.string().min(1),
  displayName: z.string().min(1),
  year: z.number().int().min(1950).max(2100),
  vehicleClass: VehicleClassSchema,
  reliability: z.number().int().min(0).max(100),
  performance: z.number().int().min(0).max(100),
  comfort: z.number().int().min(0).max(100),
  economy: z.number().int().min(0).max(100),
  cargoKg: z.number().int().nonnegative(),
  tankLiters: z.number().positive()
});

export const PlayerVehicleSchema = z.object({
  id: z.uuid(),
  model: VehicleModelSchema,
  active: z.boolean(),
  fuelPercent: z.number().min(0).max(100),
  engineCondition: z.number().min(0).max(100),
  bodyCondition: z.number().min(0).max(100),
  tireCondition: z.number().min(0).max(100),
  mileageKm: z.number().int().nonnegative(),
  parkedSegmentId: z.string().min(1),
  parkedDisplayName: z.string().min(1),
  parkedLocation: VehicleWorldLocationSchema,
  parkedPosition: VehicleWorldPositionSchema,
  atPlayerLocation: z.boolean(),
  withinInteractionRange: z.boolean(),
  locked: z.boolean(),
  occupied: z.boolean(),
  parkingKind: VehicleParkingKindSchema
});

export const DealershipVehicleSchema = z.object({
  stockKey: z.string().min(1),
  model: VehicleModelSchema,
  priceCents: z.number().int().positive(),
  mileageKm: z.number().int().nonnegative(),
  engineCondition: z.number().min(0).max(100),
  bodyCondition: z.number().min(0).max(100),
  tireCondition: z.number().min(0).max(100)
});

export const VehicleDealershipSchema = z.object({
  key: z.literal('dorado_motors'),
  name: z.string().min(1),
  segmentId: z.string().min(1),
  segmentDisplayName: z.string().min(1),
  location: VehicleWorldLocationSchema,
  accessible: z.boolean(),
  stock: z.array(DealershipVehicleSchema)
});

export const VehicleStateSchema = z.object({
  activeVehicleId: z.uuid().nullable(),
  playerLocation: VehicleWorldLocationSchema.nullable(),
  ownedVehicles: z.array(PlayerVehicleSchema),
  dealership: VehicleDealershipSchema
});

export const VehiclePurchaseRequestSchema = z.object({ stockKey: z.string().min(1).max(80) });
export const VehicleActionRequestSchema = z.object({
  vehicleId: z.uuid(),
  action: z.enum(['select', 'enter', 'exit', 'lock', 'unlock'])
});

export const VehicleTravelRequestSchema = z.object({
  vehicleId: z.uuid(),
  segmentId: z.string().min(1).max(100)
});

export const VehicleTravelResultSchema = z.object({
  segmentId: z.string().min(1),
  distanceMeters: z.number().int().nonnegative(),
  fuelCostPercent: z.number().nonnegative(),
  mileageAddedKm: z.number().nonnegative(),
  state: VehicleStateSchema
});

export type VehicleClass = z.infer<typeof VehicleClassSchema>;
export type VehicleParkingKind = z.infer<typeof VehicleParkingKindSchema>;
export type VehicleWorldPosition = z.infer<typeof VehicleWorldPositionSchema>;
export type VehicleWorldLocation = z.infer<typeof VehicleWorldLocationSchema>;
export type VehicleModel = z.infer<typeof VehicleModelSchema>;
export type PlayerVehicle = z.infer<typeof PlayerVehicleSchema>;
export type DealershipVehicle = z.infer<typeof DealershipVehicleSchema>;
export type VehicleDealership = z.infer<typeof VehicleDealershipSchema>;
export type VehicleState = z.infer<typeof VehicleStateSchema>;
export type VehiclePurchaseRequest = z.infer<typeof VehiclePurchaseRequestSchema>;
export type VehicleActionRequest = z.infer<typeof VehicleActionRequestSchema>;
export type VehicleTravelRequest = z.infer<typeof VehicleTravelRequestSchema>;
export type VehicleTravelResult = z.infer<typeof VehicleTravelResultSchema>;
