import { z } from 'zod';

export const JusticeCaseStatusSchema = z.enum(['arrested','booked','pretrial','court_pending','sentenced','dismissed','closed']);
export const JusticeCustodyStatusSchema = z.enum(['in_custody','released_bail','released','jailed','probation']);
export const JusticeBailStatusSchema = z.enum(['pending','offered','posted','denied','not_applicable']);
export const JusticeProsecutionDecisionSchema = z.enum(['pending','filed','declined']);
export const JusticeCourtOutcomeSchema = z.enum(['pending','guilty','plea','not_guilty','dismissed']);
export const JusticeChargeSeveritySchema = z.enum(['infraction','misdemeanor','felony']);
export const JusticeChargeStatusSchema = z.enum(['recommended','filed','dropped','convicted','acquitted']);

export const JusticeChargeCatalogItemSchema = z.object({
  code: z.string(), label: z.string(), severity: JusticeChargeSeveritySchema,
  baseFineCents: z.number().int().nonnegative(), baseJailMinutes: z.number().int().nonnegative(), baseBailCents: z.number().int().nonnegative()
});

export const JusticeChargeSchema = z.object({
  id: z.uuid(), code: z.string(), label: z.string(), severity: JusticeChargeSeveritySchema,
  count: z.number().int().min(1).max(5), baseFineCents: z.number().int().nonnegative(),
  baseJailMinutes: z.number().int().nonnegative(), baseBailCents: z.number().int().nonnegative(),
  evidenceStrength: z.number().int().min(0).max(100), status: JusticeChargeStatusSchema
});

export const JusticeCaseEventSchema = z.object({
  id: z.uuid(), eventType: z.string(), actorKind: z.string(), note: z.string(), details: z.record(z.string(), z.unknown()), createdAt: z.iso.datetime()
});

export const JusticeCaseSchema = z.object({
  id: z.uuid(), caseNumber: z.number().int().positive(), sourceEncounterId: z.uuid().nullable(), policeReportId: z.uuid().nullable(),
  defendantPlayerId: z.uuid().nullable(), defendantName: z.string(), status: JusticeCaseStatusSchema, custodyStatus: JusticeCustodyStatusSchema,
  bailStatus: JusticeBailStatusSchema, bailAmountCents: z.number().int().nonnegative(), prosecutionDecision: JusticeProsecutionDecisionSchema,
  courtOutcome: JusticeCourtOutcomeSchema, fineBalanceCents: z.number().int().nonnegative(), jailReleaseAt: z.iso.datetime().nullable(),
  probationUntil: z.iso.datetime().nullable(), bookedAt: z.iso.datetime().nullable(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
  charges: z.array(JusticeChargeSchema), events: z.array(JusticeCaseEventSchema)
});

export const JusticeRecordSchema = z.object({
  id: z.uuid(), recordNumber: z.number().int().positive(), caseNumber: z.number().int().positive(), defendantPlayerId: z.uuid().nullable(),
  defendantName: z.string(), outcome: z.enum(['guilty','plea','not_guilty','dismissed']),
  convictions: z.array(z.object({ code: z.string(), label: z.string(), count: z.number().int().positive() })),
  fineCents: z.number().int().nonnegative(), jailMinutes: z.number().int().nonnegative(), probationUntil: z.iso.datetime().nullable(), createdAt: z.iso.datetime()
});

export const JusticeDashboardSchema = z.object({
  intake: z.number().int().nonnegative(), pretrial: z.number().int().nonnegative(), awaitingCourt: z.number().int().nonnegative(),
  jailed: z.number().int().nonnegative(), probation: z.number().int().nonnegative(), totalRecords: z.number().int().nonnegative()
});

export const JusticeStateSchema = z.object({
  serverTime: z.iso.datetime(), dashboard: JusticeDashboardSchema, cases: z.array(JusticeCaseSchema), records: z.array(JusticeRecordSchema), chargeCatalog: z.array(JusticeChargeCatalogItemSchema)
});

export const JusticeBookRequestSchema = z.object({
  caseId: z.uuid(), policeReportId: z.uuid().nullable().optional(),
  charges: z.array(z.object({ code: z.string().trim().min(2).max(20), count: z.number().int().min(1).max(5).default(1), evidenceStrength: z.number().int().min(0).max(100) })).min(1).max(6)
});
export const JusticeBailActionRequestSchema = z.object({ caseId: z.uuid(), action: z.enum(['calculate','post']) });
export const JusticeCaseActionRequestSchema = z.object({ caseId: z.uuid() });
export const JusticeMutationResultSchema = z.object({ justice: JusticeStateSchema, noticeBg: z.string(), noticeEn: z.string() });

export type JusticeCaseStatus = z.infer<typeof JusticeCaseStatusSchema>;
export type JusticeCourtOutcome = z.infer<typeof JusticeCourtOutcomeSchema>;
export type JusticeChargeSeverity = z.infer<typeof JusticeChargeSeveritySchema>;
export type JusticeState = z.infer<typeof JusticeStateSchema>;
export type JusticeCase = z.infer<typeof JusticeCaseSchema>;
export type JusticeRecord = z.infer<typeof JusticeRecordSchema>;
export type JusticeBookRequest = z.infer<typeof JusticeBookRequestSchema>;
export type JusticeMutationResult = z.infer<typeof JusticeMutationResultSchema>;
