import { z } from 'zod';

export const CrimeTypeSchema = z.enum(['theft','shoplifting','burglary','vehicle_theft']);
export const CrimeRiskSchema = z.enum(['low','medium','high']);
export const CrimeContactKindSchema = z.enum(['fence','launderer','black_market']);

export const CrimeOpportunitySchema = z.object({
  id: z.string().min(1),
  crimeType: CrimeTypeSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  segmentId: z.string().min(1),
  risk: CrimeRiskSchema,
  requiredItemKey: z.string().nullable(),
  estimatedValueCents: z.number().int().nonnegative()
});

export const CrimeContactSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: CrimeContactKindSchema,
  segmentId: z.string().min(1),
  trust: z.number().int().min(-100).max(100),
  discovered: z.boolean(),
  feePercent: z.number().int().min(0).max(100)
});

export const CrimeStolenGoodSchema = z.object({
  itemId: z.uuid(),
  itemKey: z.string().min(1),
  displayName: z.string().min(1),
  quantity: z.number().int().positive(),
  estimatedValueCents: z.number().int().nonnegative(),
  incidentId: z.uuid()
});

export const CrimeStolenVehicleSchema = z.object({
  vehicleId: z.uuid(),
  displayName: z.string().min(1),
  estimatedValueCents: z.number().int().nonnegative(),
  segmentId: z.string().min(1)
});

export const CrimeWitnessSchema = z.object({
  id: z.uuid(),
  incidentId: z.uuid(),
  witnessNpcId: z.string().nullable(),
  recognitionConfidence: z.number().int().min(0).max(100),
  reported: z.boolean(),
  descriptor: z.string().min(1)
});

export const CrimeTraceSchema = z.object({
  id: z.uuid(),
  incidentId: z.uuid(),
  traceType: z.enum(['fingerprint','camera','tool_mark','dropped_item','vehicle_description']),
  strength: z.number().int().min(0).max(100),
  discoveredByPolice: z.boolean()
});

export const CrimeIncidentSchema = z.object({
  id: z.uuid(),
  crimeType: CrimeTypeSchema,
  segmentId: z.string().min(1),
  status: z.enum(['completed','failed']),
  recognition: z.number().int().min(0).max(100),
  policeNotified: z.boolean(),
  createdAt: z.string().datetime()
});

export const CrimeStateSchema = z.object({
  profile: z.object({
    underworldTrust: z.number().int().min(0).max(100),
    dirtyCashCents: z.number().int().nonnegative(),
    recognition: z.number().int().min(0).max(100)
  }),
  currentSegmentId: z.string().min(1),
  opportunities: z.array(CrimeOpportunitySchema),
  contacts: z.array(CrimeContactSchema),
  stolenGoods: z.array(CrimeStolenGoodSchema),
  stolenVehicles: z.array(CrimeStolenVehicleSchema),
  witnesses: z.array(CrimeWitnessSchema),
  traces: z.array(CrimeTraceSchema),
  recentIncidents: z.array(CrimeIncidentSchema)
});

const BaseCommandSchema = z.object({ requestId: z.uuid() });
export const CrimeCommandSchema = z.discriminatedUnion('command', [
  BaseCommandSchema.extend({ command: z.literal('attempt'), opportunityId: z.string().min(1) }),
  BaseCommandSchema.extend({ command: z.literal('fence'), contactId: z.string().min(1), itemId: z.uuid() }),
  BaseCommandSchema.extend({ command: z.literal('launder'), contactId: z.string().min(1), amountCents: z.number().int().positive() }),
  BaseCommandSchema.extend({ command: z.literal('buy_contraband'), contactId: z.string().min(1), itemKey: z.enum(['lockpick_set','scanner_radio','burner_phone']) }),
  BaseCommandSchema.extend({ command: z.literal('dispose_vehicle'), contactId: z.string().min(1), vehicleId: z.uuid() })
]);

export const CrimeMutationResultSchema = z.object({
  state: CrimeStateSchema,
  outcome: z.object({
    kind: z.string().min(1),
    success: z.boolean(),
    messageKey: z.string().min(1),
    amountCents: z.number().int().nonnegative().optional(),
    itemKey: z.string().optional(),
    vehicleId: z.uuid().optional()
  })
});

export type CrimeOpportunity = z.infer<typeof CrimeOpportunitySchema>;
export type CrimeState = z.infer<typeof CrimeStateSchema>;
export type CrimeCommand = z.infer<typeof CrimeCommandSchema>;
export type CrimeMutationResult = z.infer<typeof CrimeMutationResultSchema>;
