import { z } from 'zod';

export const HospitalityConceptSchema = z.enum(['restaurant','cafe','bar','nightclub','bakery']);
export const ProductionBatchStatusSchema = z.enum(['queued','preparing','ready','cancelled']);
export const ShipmentStatusSchema = z.enum(['planned','in_transit','delayed','delivered','cancelled']);
export const ShortageSeveritySchema = z.enum(['none','watch','shortage']);

export const HospitalityBusinessSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  concept: HospitalityConceptSchema,
  status: z.enum(['open','closed','suspended']),
  reputation: z.number().int().min(0).max(100),
  canManage: z.boolean(),
  role: z.enum(['owner','manager','employee']).nullable(),
  propertyId: z.string().uuid().nullable(),
  propertyName: z.string().nullable(),
  district: z.string().min(1),
  streetSegment: z.string().min(1),
  operatingBalanceCents: z.number().int().nonnegative(),
  capacity: z.number().int().positive()
});

export const HospitalityRecipeLineSchema = z.object({ itemKey: z.string().min(1), quantity: z.number().int().positive() });
export const HospitalityRecipeSchema = z.object({
  key: z.string().min(1), nameBg: z.string().min(1), nameEn: z.string().min(1), outputItemKey: z.string().min(1),
  outputQuantity: z.number().int().positive(), preparationMinutes: z.number().int().positive(), lines: z.array(HospitalityRecipeLineSchema).min(1)
});

export const HospitalityProductionBatchSchema = z.object({
  id: z.string().uuid(), businessId: z.string().uuid(), recipeKey: z.string().min(1), batches: z.number().int().positive(),
  status: ProductionBatchStatusSchema, quality: z.number().int().min(0).max(100).nullable(),
  startedAt: z.string().datetime(), readyAt: z.string().datetime(), completedAt: z.string().datetime().nullable()
});

export const SupplyPurchaseOrderLineSchema = z.object({
  itemKey: z.string().min(1), quantity: z.number().int().positive(), unitCostCents: z.number().int().nonnegative(), totalCents: z.number().int().nonnegative()
});

export const SupplyShipmentSchema = z.object({
  id: z.string().uuid(), businessId: z.string().uuid(), supplierId: z.string().uuid(), purchaseOrderId: z.string().uuid(), status: ShipmentStatusSchema,
  originLabel: z.string().min(1), destinationPropertyId: z.string().uuid().nullable(), routeKey: z.string().min(1),
  vehicleClass: z.enum(['van','box_truck','truck']), dispatchedAt: z.string().datetime().nullable(), etaAt: z.string().datetime().nullable(),
  deliveredAt: z.string().datetime().nullable(), delayMinutes: z.number().int().nonnegative(), delayReasonBg: z.string().nullable(), delayReasonEn: z.string().nullable(),
  lines: z.array(SupplyPurchaseOrderLineSchema).min(1)
});

export const BusinessShortageSchema = z.object({
  itemKey: z.string().min(1), quantity: z.number().int().nonnegative(), incomingQuantity: z.number().int().nonnegative(),
  reorderPoint: z.number().int().nonnegative(), severity: ShortageSeveritySchema
});

export const HospitalityStockItemSchema = z.object({
  itemKey: z.string().min(1), displayName: z.string().min(1), quantity: z.number().int().nonnegative(), reorderPoint: z.number().int().nonnegative(),
  incomingQuantity: z.number().int().nonnegative(), averageUnitCostCents: z.number().int().nonnegative(), priceCents: z.number().int().positive().nullable(),
  averageQuality: z.number().int().min(0).max(100).nullable(), freshnessPercent: z.number().int().min(0).max(100).nullable(), severity: ShortageSeveritySchema
});

export const HospitalitySupplierSchema = z.object({
  id: z.string().uuid(), name: z.string().min(1), reliability: z.number().int().min(0).max(100), leadTimeMinutes: z.number().int().nonnegative(),
  priceMultiplierBasisPoints: z.number().int().positive()
});

export const HospitalityWarehouseSchema = z.object({
  id: z.string().uuid(), propertyId: z.string().uuid(), label: z.string().min(1), kind: z.enum(['premises','warehouse']),
  capacityUnits: z.number().int().positive(), usedUnits: z.number().int().nonnegative()
});

export const HospitalityDemandSnapshotSchema = z.object({
  hour: z.number().int().min(0).max(23), requestedCustomers: z.number().int().nonnegative(), servedCustomers: z.number().int().nonnegative(),
  lostCustomers: z.number().int().nonnegative(), revenueCents: z.number().int().nonnegative()
});

export const HospitalityStateSchema = z.object({
  business: HospitalityBusinessSummarySchema,
  recipes: z.array(HospitalityRecipeSchema),
  stock: z.array(HospitalityStockItemSchema),
  suppliers: z.array(HospitalitySupplierSchema),
  warehouses: z.array(HospitalityWarehouseSchema),
  production: z.array(HospitalityProductionBatchSchema),
  shipments: z.array(SupplyShipmentSchema),
  shortages: z.array(BusinessShortageSchema),
  demand: HospitalityDemandSnapshotSchema.nullable()
});

export const HospitalityStartProductionRequestSchema = z.object({ businessId: z.string().uuid(), recipeKey: z.string().min(1), batches: z.number().int().min(1).max(20) });
export const HospitalityCompleteProductionRequestSchema = z.object({ batchId: z.string().uuid() });
export const SupplyPurchaseOrderRequestSchema = z.object({
  businessId: z.string().uuid(), supplierId: z.string().uuid(), destinationPropertyId: z.string().uuid().nullable(),
  lines: z.array(z.object({ itemKey: z.string().min(1), quantity: z.number().int().min(1).max(1000) })).min(1).max(30)
});
export const SupplyReceiveShipmentRequestSchema = z.object({ shipmentId: z.string().uuid() });
export const HospitalityDemandCycleRequestSchema = z.object({ businessId: z.string().uuid() });

export type HospitalityState = z.infer<typeof HospitalityStateSchema>;
export type SupplyShipment = z.infer<typeof SupplyShipmentSchema>;
