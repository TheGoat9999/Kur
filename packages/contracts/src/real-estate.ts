import { z } from 'zod';

export const PropertyKindSchema = z.enum(['apartment','house','garage','commercial','warehouse','industrial']);
export type PropertyKind = z.infer<typeof PropertyKindSchema>;

export const PropertyListingSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  nameBg: z.string(), nameEn: z.string(),
  kind: PropertyKindSchema,
  district: z.string(), streetSegment: z.string(),
  priceCents: z.number().int().nonnegative(),
  listed: z.boolean(),
  bedrooms: z.number().int().nonnegative(),
  parkingSpaces: z.number().int().nonnegative(),
  storageSlots: z.number().int().nonnegative(),
  agentName: z.string(),
  descriptionBg: z.string(), descriptionEn: z.string()
});
export type PropertyListing = z.infer<typeof PropertyListingSchema>;

export const PropertyAccessSchema = z.object({ id:z.string().uuid(), name:z.string(), role:z.enum(['resident','guest','employee','manager','co_owner']) });
export const OwnedPropertySchema = z.object({
  property: PropertyListingSchema,
  isPrimaryResidence: z.boolean(), locked: z.boolean(),
  storageUsed: z.number().int().nonnegative(),
  access: z.array(PropertyAccessSchema),
  tenantName: z.string().nullable(), monthlyRentCents: z.number().int().nonnegative()
});

export const RealEstateCareerSchema = z.object({
  licenseStage: z.number().int().min(0).max(2),
  employed: z.boolean(),
  reputation: z.number().int().min(0).max(100),
  commissionEarnedCents: z.number().int().nonnegative()
});

export const RealEstateClientSchema = z.object({
  id:z.string(), name:z.string(),
  budgetMinCents:z.number().int().nonnegative(), budgetMaxCents:z.number().int().positive(),
  kind:PropertyKindSchema, district:z.string(), parkingRequired:z.number().int().nonnegative(),
  status:z.enum(['new','active','closed'])
});

export const RealEstateActivitySchema = z.object({ id:z.string().uuid(), kind:z.string(), summaryBg:z.string(), summaryEn:z.string(), createdAt:z.string() });

export const RealEstateStateSchema = z.object({
  listings:z.array(PropertyListingSchema), owned:z.array(OwnedPropertySchema),
  viewedPropertyIds:z.array(z.string().uuid()),
  career:RealEstateCareerSchema, clients:z.array(RealEstateClientSchema),
  activity:z.array(RealEstateActivitySchema)
});
export type RealEstateState = z.infer<typeof RealEstateStateSchema>;

export const PropertyIdRequestSchema = z.object({ propertyId:z.string().uuid() });
export const PropertyOfferRequestSchema = z.object({ propertyId:z.string().uuid(), amountCents:z.number().int().positive() });
export const PropertyAccessRequestSchema = z.object({ propertyId:z.string().uuid(), name:z.string().trim().min(1).max(80), role:z.enum(['resident','guest','employee','manager','co_owner']) });
export const PropertyAccessRemoveRequestSchema = z.object({ propertyId:z.string().uuid(), accessId:z.string().uuid() });
export const PropertyLeaseRequestSchema = z.object({ propertyId:z.string().uuid(), tenantName:z.string().trim().min(1).max(80), monthlyRentCents:z.number().int().positive() });
export const RealEstateClientMatchRequestSchema = z.object({ clientId:z.string(), propertyId:z.string().uuid() });

export const RealEstateMutationResultSchema = z.object({ state:RealEstateStateSchema, cashCents:z.number().int().nonnegative(), message:z.string() });
export type RealEstateMutationResult = z.infer<typeof RealEstateMutationResultSchema>;
