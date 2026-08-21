import { z } from 'zod';

export const ResidencyStatusSchema = z.enum(['citizen', 'resident', 'visitor']);
export const GovernmentDocumentStatusSchema = z.enum(['active', 'replaced', 'revoked', 'expired']);
export const GovernmentLicenseKindSchema = z.enum(['driving', 'professional', 'business']);
export const GovernmentLicenseStatusSchema = z.enum(['active', 'suspended', 'expired', 'revoked', 'pending']);
export const GovernmentSubjectTypeSchema = z.enum(['citizen', 'vehicle', 'property', 'business']);
export const VehicleRegistrationStatusSchema = z.enum(['active', 'suspended', 'expired', 'cancelled']);
export const GovernmentPermitStatusSchema = z.enum(['active', 'pending', 'suspended', 'expired', 'revoked']);
export const GovernmentFineStatusSchema = z.enum(['outstanding', 'partial', 'paid', 'void']);

export const CitizenIdentitySchema = z.object({
  id: z.uuid(),
  citizenNumber: z.string().min(1),
  legalName: z.string().min(2).max(80),
  dateOfBirth: z.iso.date().nullable(),
  nationalityCode: z.string().min(2).max(3),
  residencyStatus: ResidencyStatusSchema,
  verifiedAt: z.iso.datetime().nullable()
});

export const GovernmentDocumentSchema = z.object({
  id: z.uuid(),
  kind: z.literal('id_card'),
  documentNumber: z.string().min(1),
  status: GovernmentDocumentStatusSchema,
  issuedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  metadata: z.record(z.string(), z.unknown())
});

export const GovernmentLicenseSchema = z.object({
  id: z.uuid(),
  kind: GovernmentLicenseKindSchema,
  code: z.string().min(1),
  licenseNumber: z.string().min(1),
  classCode: z.string().nullable(),
  status: GovernmentLicenseStatusSchema,
  subjectType: GovernmentSubjectTypeSchema,
  subjectRef: z.string().nullable(),
  sourceSystem: z.string().min(1),
  issuedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
  metadata: z.record(z.string(), z.unknown())
});

export const VehicleRegistrationSchema = z.object({
  id: z.uuid(),
  vehicleId: z.uuid(),
  registrationNumber: z.string().min(1),
  status: VehicleRegistrationStatusSchema,
  registeredAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
  vehicleName: z.string().min(1),
  modelId: z.string().min(1)
});

export const GovernmentPermitSchema = z.object({
  id: z.uuid(),
  kind: z.string().min(1),
  permitNumber: z.string().min(1),
  status: GovernmentPermitStatusSchema,
  subjectType: GovernmentSubjectTypeSchema,
  subjectRef: z.string().nullable(),
  issuingAgency: z.string().min(1),
  issuedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
  metadata: z.record(z.string(), z.unknown())
});

export const GovernmentFineSchema = z.object({
  id: z.uuid(),
  fineNumber: z.string().min(1),
  issuingAgency: z.string().min(1),
  reason: z.string().min(1),
  amountCents: z.number().int().positive(),
  balanceCents: z.number().int().nonnegative(),
  status: GovernmentFineStatusSchema,
  dueAt: z.iso.datetime().nullable(),
  sourceType: z.string().nullable(),
  sourceRef: z.string().nullable(),
  issuedAt: z.iso.datetime(),
  paidAt: z.iso.datetime().nullable()
});

export const GovernmentRecordEventSchema = z.object({
  id: z.uuid(),
  recordType: z.string().min(1),
  agency: z.string().min(1),
  summary: z.string().min(1),
  entityType: z.string().nullable(),
  entityRef: z.string().nullable(),
  createdAt: z.iso.datetime()
});

export const GovernmentStateSchema = z.object({
  identity: CitizenIdentitySchema,
  idCard: GovernmentDocumentSchema.nullable(),
  licenses: z.array(GovernmentLicenseSchema),
  vehicleRegistrations: z.array(VehicleRegistrationSchema),
  permits: z.array(GovernmentPermitSchema),
  fines: z.array(GovernmentFineSchema),
  records: z.array(GovernmentRecordEventSchema)
});

export const GovernmentIdentityUpdateRequestSchema = z.object({
  dateOfBirth: z.iso.date(),
  nationalityCode: z.string().trim().toUpperCase().min(2).max(3)
});

export const GovernmentBusinessLicenseRequestSchema = z.object({
  businessName: z.string().trim().min(2).max(80)
});

export const GovernmentFinePaymentRequestSchema = z.object({
  fineId: z.uuid(),
  amountCents: z.number().int().positive().max(100_000_000)
});

export type CitizenIdentity = z.infer<typeof CitizenIdentitySchema>;
export type GovernmentDocument = z.infer<typeof GovernmentDocumentSchema>;
export type GovernmentLicense = z.infer<typeof GovernmentLicenseSchema>;
export type VehicleRegistration = z.infer<typeof VehicleRegistrationSchema>;
export type GovernmentPermit = z.infer<typeof GovernmentPermitSchema>;
export type GovernmentFine = z.infer<typeof GovernmentFineSchema>;
export type GovernmentRecordEvent = z.infer<typeof GovernmentRecordEventSchema>;
export type GovernmentState = z.infer<typeof GovernmentStateSchema>;
export type GovernmentIdentityUpdateRequest = z.infer<typeof GovernmentIdentityUpdateRequestSchema>;
export type GovernmentBusinessLicenseRequest = z.infer<typeof GovernmentBusinessLicenseRequestSchema>;
export type GovernmentFinePaymentRequest = z.infer<typeof GovernmentFinePaymentRequestSchema>;
