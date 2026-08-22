import { z } from 'zod';

export const BusinessKindSchema = z.enum(['convenience_store','restaurant','cafe','bar','bakery','mechanic_shop','dealership','logistics','nightclub']);
export const BusinessRoleSchema = z.enum(['owner','manager','employee']);
export const BusinessStatusSchema = z.enum(['open','closed','suspended']);

export const BusinessMemberSchema = z.object({
  id: z.string().uuid(), playerId: z.string().uuid().nullable(), displayName: z.string(), role: BusinessRoleSchema,
  jobKey: z.string().nullable(), wageCents: z.number().int().nonnegative(), active: z.boolean()
});
export const BusinessAccountSchema = z.object({ accountKey: z.enum(['operating','reserve']), balanceCents: z.number().int().nonnegative() });
export const BusinessStockSchema = z.object({ itemKey: z.string(), displayName: z.string(), quantity: z.number().int().nonnegative(), reorderPoint: z.number().int().nonnegative(), averageUnitCostCents: z.number().int().nonnegative(), priceCents: z.number().int().positive().nullable() });
export const BusinessSupplierSchema = z.object({ id: z.string().uuid(), supplierKey: z.string(), name: z.string(), reliability: z.number().int().min(0).max(100), leadTimeMinutes: z.number().int().nonnegative(), priceMultiplierBasisPoints: z.number().int().positive() });
export const BusinessLicenseSchema = z.object({ id: z.string().uuid(), licenseKey: z.string(), name: z.string(), required: z.boolean(), status: z.enum(['active','expired','suspended']), feeCents: z.number().int().nonnegative(), expiresAt: z.string().datetime().nullable() });
export const BusinessHourSchema = z.object({ dayOfWeek: z.number().int().min(0).max(6), opensAt: z.string().nullable(), closesAt: z.string().nullable(), closed: z.boolean() });
export const BusinessLedgerEntrySchema = z.object({ id: z.string().uuid(), entryType: z.string(), direction: z.enum(['in','out']), amountCents: z.number().int().nonnegative(), memo: z.string(), createdAt: z.string().datetime() });

export const BusinessSchema = z.object({
  id: z.string().uuid(), businessKey: z.string(), name: z.string(), kind: BusinessKindSchema,
  ownerPlayerId: z.string().uuid().nullable(), propertyId: z.string().uuid().nullable(), propertyName: z.string().nullable(),
  district: z.string(), streetSegment: z.string(), status: BusinessStatusSchema, reputation: z.number().int().min(0).max(100),
  salesTaxBasisPoints: z.number().int().nonnegative(), serviceFeeBasisPoints: z.number().int().nonnegative(),
  canManage: z.boolean(), role: BusinessRoleSchema.nullable(), dueTaxesCents: z.number().int().nonnegative(),
  accounts: z.array(BusinessAccountSchema), members: z.array(BusinessMemberSchema), stock: z.array(BusinessStockSchema),
  suppliers: z.array(BusinessSupplierSchema), licenses: z.array(BusinessLicenseSchema), hours: z.array(BusinessHourSchema),
  ledger: z.array(BusinessLedgerEntrySchema)
});

export const BusinessesStateSchema = z.object({ businesses: z.array(BusinessSchema) });
export const BusinessIdRequestSchema = z.object({ businessId: z.string().uuid() });
export const BusinessStaffRequestSchema = z.object({ businessId: z.string().uuid(), displayName: z.string().trim().min(2).max(80), role: z.enum(['manager','employee']), jobKey: z.string().trim().min(1).max(80).nullable().optional(), wageCents: z.number().int().min(0).max(1_000_000) });
export const BusinessPriceRequestSchema = z.object({ businessId: z.string().uuid(), itemKey: z.string().min(1), priceCents: z.number().int().min(1).max(10_000_000) });
export const BusinessSupplierOrderRequestSchema = z.object({ businessId: z.string().uuid(), supplierId: z.string().uuid(), itemKey: z.string().min(1), quantity: z.number().int().min(1).max(1000) });
export const BusinessSaleRequestSchema = z.object({ businessId: z.string().uuid(), itemKey: z.string().min(1), quantity: z.number().int().min(1).max(100) });
export const BusinessHoursRequestSchema = z.object({ businessId: z.string().uuid(), dayOfWeek: z.number().int().min(0).max(6), opensAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(), closesAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(), closed: z.boolean() });
export const BusinessLicenseRequestSchema = z.object({ businessId: z.string().uuid(), licenseId: z.string().uuid() });

export type BusinessKind = z.infer<typeof BusinessKindSchema>;
export type BusinessRole = z.infer<typeof BusinessRoleSchema>;
export type Business = z.infer<typeof BusinessSchema>;
export type BusinessesState = z.infer<typeof BusinessesStateSchema>;
