import { z } from 'zod';

export const PoliceCareerStatusSchema = z.enum(['applicant', 'cadet', 'officer']);
export const PoliceDutyStatusSchema = z.enum(['available', 'patrol', 'assigned', 'responding', 'on_scene', 'pursuit', 'search', 'unavailable']);
export const PoliceDispatchStatusSchema = z.enum(['open', 'assigned', 'on_scene', 'cleared']);
export const PoliceLegalGroundSchema = z.enum(['none', 'reasonable_suspicion', 'traffic_violation', 'probable_cause', 'warrant']);
export const PoliceEncounterStatusSchema = z.enum(['active', 'released', 'arrested']);
export const PoliceWarrantStatusSchema = z.enum(['active', 'served', 'expired', 'cancelled']);
export const PoliceBoloStatusSchema = z.enum(['active', 'resolved', 'cancelled']);
export const PolicePriorityLabelSchema = z.enum(['low', 'medium', 'high', 'critical']);

export const PoliceProfileSchema = z.object({
  careerStatus: PoliceCareerStatusSchema,
  academyStage: z.number().int().min(0).max(2),
  badgeNumber: z.string().nullable(),
  rankCode: z.string(),
  callsign: z.string().nullable(),
  onDuty: z.boolean(),
  complaints: z.number().int().nonnegative(),
  citations: z.number().int().nonnegative(),
  arrests: z.number().int().nonnegative()
});

export const PoliceUnitSchema = z.object({
  id: z.uuid(),
  callsign: z.string(),
  unitType: z.string(),
  status: PoliceDutyStatusSchema,
  district: z.string(),
  streetSegment: z.string().nullable(),
  isNpc: z.boolean(),
  isSelf: z.boolean()
});

export const PoliceDispatchCallSchema = z.object({
  id: z.uuid(),
  callCode: z.string(),
  title: z.string(),
  description: z.string(),
  priority: z.number().int().min(1).max(3),
  status: PoliceDispatchStatusSchema,
  district: z.string(),
  streetSegment: z.string(),
  sourceKind: z.string(),
  knowledge: z.record(z.string(), z.unknown()),
  assignedUnitCallsigns: z.array(z.string()),
  createdAt: z.iso.datetime()
});

export const PoliceIntelSchema = z.object({
  id: z.uuid(),
  callId: z.uuid().nullable(),
  sourceType: z.string(),
  label: z.string(),
  summary: z.string(),
  reliability: z.number().int().min(0).max(100),
  fields: z.record(z.string(), z.unknown()),
  createdAt: z.iso.datetime()
});

export const PoliceEncounterSchema = z.object({
  id: z.uuid(),
  encounterType: z.enum(['traffic', 'pedestrian', 'scene']),
  status: PoliceEncounterStatusSchema,
  subjectName: z.string().nullable(),
  vehicleId: z.uuid().nullable(),
  legalGround: PoliceLegalGroundSchema,
  detained: z.boolean(),
  searched: z.boolean(),
  metadata: z.record(z.string(), z.unknown()),
  startedAt: z.iso.datetime()
});

export const PoliceReportSchema = z.object({
  id: z.uuid(),
  reportNumber: z.number().int().positive(),
  title: z.string(),
  reportType: z.string(),
  status: z.enum(['draft', 'open', 'finalized', 'closed']),
  narrative: z.string(),
  involvedPeople: z.array(z.unknown()),
  charges: z.array(z.unknown()),
  linkedCallId: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

export const PoliceWarrantSchema = z.object({
  id: z.uuid(),
  subjectName: z.string(),
  reason: z.string(),
  priority: PolicePriorityLabelSchema,
  status: PoliceWarrantStatusSchema,
  reportId: z.uuid().nullable(),
  expiresAt: z.iso.datetime(),
  createdAt: z.iso.datetime()
});

export const PoliceBoloSchema = z.object({
  id: z.uuid(),
  targetType: z.enum(['person', 'vehicle']),
  targetLabel: z.string(),
  description: z.string(),
  priority: PolicePriorityLabelSchema,
  status: PoliceBoloStatusSchema,
  expiresAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime()
});

export const PoliceEvidenceEventSchema = z.object({
  id: z.uuid(),
  eventType: z.string(),
  note: z.string(),
  createdAt: z.iso.datetime()
});

export const PoliceEvidenceSchema = z.object({
  id: z.uuid(),
  evidenceNumber: z.number().int().positive(),
  evidenceType: z.string(),
  label: z.string(),
  description: z.string(),
  status: z.enum(['collected', 'locker', 'checked_out', 'released', 'destroyed']),
  location: z.string(),
  reportId: z.uuid().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.iso.datetime(),
  events: z.array(PoliceEvidenceEventSchema)
});

export const PolicePursuitSchema = z.object({
  id: z.uuid(),
  status: z.enum(['active', 'contained', 'lost', 'ended']),
  visualContact: z.boolean(),
  district: z.string(),
  streetSegment: z.string(),
  direction: z.string(),
  distanceIndex: z.number().int().min(0).max(100),
  risk: z.number().int().min(0).max(100),
  searchConfidence: z.number().int().min(0).max(100),
  lastKnown: z.record(z.string(), z.unknown()).nullable(),
  lastSeenAt: z.iso.datetime().nullable(),
  round: z.number().int().nonnegative()
});

export const PoliceAuditEntrySchema = z.object({
  id: z.uuid(),
  action: z.string(),
  entityType: z.string(),
  details: z.record(z.string(), z.unknown()),
  createdAt: z.iso.datetime()
});

export const PoliceDashboardSchema = z.object({
  activeCalls: z.number().int().nonnegative(),
  activeWarrants: z.number().int().nonnegative(),
  activeBolos: z.number().int().nonnegative(),
  officersOnDuty: z.number().int().nonnegative(),
  openReports: z.number().int().nonnegative()
});

export const PoliceStateSchema = z.object({
  serverTime: z.iso.datetime(),
  profile: PoliceProfileSchema,
  dashboard: PoliceDashboardSchema,
  units: z.array(PoliceUnitSchema),
  calls: z.array(PoliceDispatchCallSchema),
  intel: z.array(PoliceIntelSchema),
  activeEncounter: PoliceEncounterSchema.nullable(),
  reports: z.array(PoliceReportSchema),
  warrants: z.array(PoliceWarrantSchema),
  bolos: z.array(PoliceBoloSchema),
  evidence: z.array(PoliceEvidenceSchema),
  pursuit: PolicePursuitSchema.nullable(),
  audit: z.array(PoliceAuditEntrySchema)
});

export const PoliceCareerActionRequestSchema = z.object({ action: z.enum(['apply', 'academy_step']) });
export const PoliceDutyRequestSchema = z.object({ onDuty: z.boolean(), callsign: z.string().trim().min(1).max(8).optional() });
export const PoliceDispatchCreateRequestSchema = z.object({
  callCode: z.string().trim().min(2).max(20),
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().max(500).default(''),
  priority: z.number().int().min(1).max(3),
  district: z.string().trim().min(1).max(80),
  streetSegment: z.string().trim().min(1).max(80),
  sourceKind: z.enum(['system', 'alarm', 'caller', 'officer', 'camera']).default('officer'),
  knowledge: z.record(z.string(), z.unknown()).default({})
});
export const PoliceDispatchActionRequestSchema = z.object({ callId: z.uuid(), action: z.enum(['accept', 'arrive', 'clear']) });
export const PoliceIntelCreateRequestSchema = z.object({
  callId: z.uuid().nullable().optional(),
  sourceType: z.enum(['alarm', 'caller', 'witness', 'camera', 'officer', 'evidence', 'records']),
  label: z.string().trim().min(2).max(80),
  summary: z.string().trim().min(2).max(600),
  reliability: z.number().int().min(0).max(100),
  fields: z.record(z.string(), z.unknown()).default({})
});
export const PoliceEncounterStartRequestSchema = z.object({
  encounterType: z.enum(['traffic', 'pedestrian', 'scene']),
  subjectName: z.string().trim().min(1).max(80).optional(),
  vehicleId: z.uuid().optional(),
  legalGround: PoliceLegalGroundSchema.default('none')
});
export const PoliceEncounterActionRequestSchema = z.object({
  encounterId: z.uuid(),
  action: z.enum(['identify', 'question', 'detain', 'search', 'citation', 'arrest', 'release', 'set_probable_cause'])
});
export const PoliceReportCreateRequestSchema = z.object({
  title: z.string().trim().min(3).max(120),
  reportType: z.string().trim().min(2).max(40).default('incident'),
  narrative: z.string().trim().max(8000).default(''),
  involvedPeople: z.array(z.unknown()).default([]),
  charges: z.array(z.unknown()).default([]),
  linkedCallId: z.uuid().nullable().optional(),
  finalize: z.boolean().default(false)
});
export const PoliceWarrantCreateRequestSchema = z.object({
  subjectName: z.string().trim().min(2).max(80),
  reason: z.string().trim().min(3).max(1200),
  priority: PolicePriorityLabelSchema.default('medium'),
  reportId: z.uuid().nullable().optional(),
  expiresInDays: z.number().int().min(1).max(30).default(7)
});
export const PoliceWarrantActionRequestSchema = z.object({ warrantId: z.uuid(), action: z.enum(['serve', 'cancel']) });
export const PoliceBoloCreateRequestSchema = z.object({
  targetType: z.enum(['person', 'vehicle']),
  targetLabel: z.string().trim().min(2).max(100),
  description: z.string().trim().min(3).max(1000),
  priority: PolicePriorityLabelSchema.default('medium'),
  expiresInHours: z.number().int().min(1).max(168).optional()
});
export const PoliceBoloActionRequestSchema = z.object({ boloId: z.uuid(), action: z.enum(['resolve', 'cancel']) });
export const PoliceEvidenceCreateRequestSchema = z.object({
  evidenceType: z.string().trim().min(2).max(40),
  label: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).default(''),
  location: z.string().trim().min(2).max(120).default('Field collection'),
  reportId: z.uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({})
});
export const PoliceEvidenceActionRequestSchema = z.object({ evidenceId: z.uuid(), action: z.enum(['store', 'check_out', 'release']), note: z.string().trim().max(500).default('') });
export const PolicePursuitStartRequestSchema = z.object({ callId: z.uuid().nullable().optional(), district: z.string().min(1).max(80), streetSegment: z.string().min(1).max(80), direction: z.string().min(1).max(80).default('unknown') });
export const PolicePursuitActionRequestSchema = z.object({ pursuitId: z.uuid(), action: z.enum(['aggressive', 'maintain_visual', 'predict_route', 'request_backup', 'containment', 'back_off', 'lose_visual', 'refresh_search', 'contain', 'end']) });

export type PoliceCareerStatus = z.infer<typeof PoliceCareerStatusSchema>;
export type PoliceProfile = z.infer<typeof PoliceProfileSchema>;
export type PoliceUnit = z.infer<typeof PoliceUnitSchema>;
export type PoliceDispatchCall = z.infer<typeof PoliceDispatchCallSchema>;
export type PoliceEncounter = z.infer<typeof PoliceEncounterSchema>;
export type PoliceReport = z.infer<typeof PoliceReportSchema>;
export type PoliceWarrant = z.infer<typeof PoliceWarrantSchema>;
export type PoliceBolo = z.infer<typeof PoliceBoloSchema>;
export type PoliceEvidence = z.infer<typeof PoliceEvidenceSchema>;
export type PolicePursuit = z.infer<typeof PolicePursuitSchema>;
export type PoliceState = z.infer<typeof PoliceStateSchema>;
