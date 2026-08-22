import { z } from 'zod';

export const EmsPrioritySchema = z.enum(['p1', 'p2', 'p3', 'p4']);
export const EmsCallStatusSchema = z.enum(['pending', 'assigned', 'en_route', 'on_scene', 'transporting', 'closed', 'cancelled']);
export const EmsRankSchema = z.enum(['emt', 'paramedic', 'senior_paramedic', 'supervisor']);
export const EmsConsciousnessSchema = z.enum(['alert', 'confused', 'unresponsive']);
export const EmsBreathingSchema = z.enum(['normal', 'labored', 'absent']);
export const EmsBleedingSchema = z.enum(['none', 'minor', 'major']);
export const EmsTreatmentSchema = z.enum(['bandage', 'trauma_dressing', 'tourniquet', 'splint', 'oxygen', 'saline', 'cpr']);
export const EmsOutcomeSchema = z.enum(['treated_scene', 'transported', 'refused', 'deceased']);

export const EmsAccessSchema = z.object({ staffAccess: z.boolean() });

export const EmsLocationSchema = z.object({
  streetSegmentId: z.string().min(1),
  streetLabel: z.string().min(1),
  positionX: z.number().min(0).max(100),
  positionY: z.number().min(0).max(100)
});

export const EmsAssessmentSchema = z.object({
  consciousness: EmsConsciousnessSchema,
  breathing: EmsBreathingSchema,
  bleeding: EmsBleedingSchema,
  pain: z.number().int().min(0).max(10),
  notes: z.string().max(500),
  updatedAt: z.iso.datetime()
});

export const EmsTreatmentEntrySchema = z.object({
  id: z.uuid(),
  treatment: EmsTreatmentSchema,
  effect: z.number().int().min(0).max(100),
  createdAt: z.iso.datetime()
});

export const EmsCallSchema = z.object({
  id: z.uuid(),
  callNumber: z.number().int().positive(),
  patientName: z.string().min(1),
  reporterName: z.string().min(1),
  priority: EmsPrioritySchema,
  incidentType: z.string().min(1).max(80),
  summary: z.string().min(1).max(300),
  status: EmsCallStatusSchema,
  assignedResponderName: z.string().nullable(),
  assignedToMe: z.boolean(),
  location: EmsLocationSchema,
  assessment: EmsAssessmentSchema.nullable(),
  treatments: z.array(EmsTreatmentEntrySchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

export const EmsProfileSchema = z.object({
  employed: z.boolean(),
  rank: EmsRankSchema,
  onDuty: z.boolean(),
  callsCompleted: z.number().int().nonnegative(),
  reputation: z.number().int().min(0).max(100),
  shiftEarningsCents: z.number().int().nonnegative(),
  activeCallId: z.uuid().nullable()
});

export const EmsPatientRecordSchema = z.object({
  id: z.uuid(),
  callId: z.uuid(),
  callNumber: z.number().int().positive(),
  patientName: z.string().min(1),
  outcome: EmsOutcomeSchema,
  priority: EmsPrioritySchema,
  incidentType: z.string(),
  responderName: z.string(),
  notes: z.string(),
  procedures: z.array(EmsTreatmentSchema),
  createdAt: z.iso.datetime()
});

export const EmsStateSchema = z.object({
  profile: EmsProfileSchema,
  dispatch: z.array(EmsCallSchema),
  activeCall: EmsCallSchema.nullable(),
  records: z.array(EmsPatientRecordSchema)
});

export const EmsDutyRequestSchema = z.object({ onDuty: z.boolean() });
export const EmsReportCallRequestSchema = z.object({
  priority: EmsPrioritySchema.default('p3'),
  incidentType: z.string().trim().min(2).max(80),
  summary: z.string().trim().min(2).max(300)
});
export const EmsCallIdRequestSchema = z.object({ callId: z.uuid() });
export const EmsStatusRequestSchema = z.object({
  callId: z.uuid(),
  status: z.enum(['en_route', 'on_scene', 'transporting'])
});
export const EmsAssessmentRequestSchema = z.object({
  callId: z.uuid(),
  consciousness: EmsConsciousnessSchema,
  breathing: EmsBreathingSchema,
  bleeding: EmsBleedingSchema,
  pain: z.number().int().min(0).max(10),
  notes: z.string().trim().max(500).default('')
});
export const EmsTreatmentRequestSchema = z.object({ callId: z.uuid(), treatment: EmsTreatmentSchema });
export const EmsHandoffRequestSchema = z.object({
  callId: z.uuid(),
  outcome: EmsOutcomeSchema,
  notes: z.string().trim().max(800).default('')
});

export const EmsReportResultSchema = z.object({
  noticeBg: z.string(),
  noticeEn: z.string()
});

export const EmsMutationResultSchema = z.object({
  ems: EmsStateSchema,
  noticeBg: z.string(),
  noticeEn: z.string()
});

export type EmsPriority = z.infer<typeof EmsPrioritySchema>;
export type EmsCallStatus = z.infer<typeof EmsCallStatusSchema>;
export type EmsTreatment = z.infer<typeof EmsTreatmentSchema>;
export type EmsOutcome = z.infer<typeof EmsOutcomeSchema>;
export type EmsAccess = z.infer<typeof EmsAccessSchema>;
export type EmsReportResult = z.infer<typeof EmsReportResultSchema>;
export type EmsCall = z.infer<typeof EmsCallSchema>;
export type EmsState = z.infer<typeof EmsStateSchema>;
export type EmsMutationResult = z.infer<typeof EmsMutationResultSchema>;
