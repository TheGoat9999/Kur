import { z } from 'zod';
import { BootstrapStateSchema } from './index.js';

export const HOOD_WALK_MAX_STEPS = 5;

export const HoodWalkEventIdSchema = z.enum([
  'lost_courier',
  'open_garage',
  'watchful_stranger',
  'slow_patrol',
  'basement_music',
  'corner_argument',
  'quiet_cutthrough',
  'pickup_game',
  'dog_loose',
  'dumpster_glint',
  'pattern_spotted',
  'local_recognition'
]);
export type HoodWalkEventId = z.infer<typeof HoodWalkEventIdSchema>;

export const HoodWalkToneSchema = z.enum(['calm', 'social', 'opportunity', 'mystery', 'risky', 'police']);
export type HoodWalkTone = z.infer<typeof HoodWalkToneSchema>;
export const HoodWalkChoiceRiskSchema = z.enum(['safe', 'uncertain', 'risky']);
export type HoodWalkChoiceRisk = z.infer<typeof HoodWalkChoiceRiskSchema>;
export const HoodWalkClaritySchema = z.enum(['vague', 'readable', 'clear']);
export type HoodWalkClarity = z.infer<typeof HoodWalkClaritySchema>;

export const HoodWalkAnchorSchema = z.object({
  x: z.number().min(4).max(96),
  y: z.number().min(8).max(88)
});
export type HoodWalkAnchor = z.infer<typeof HoodWalkAnchorSchema>;

export const HoodWalkLeadSchema = z.object({
  id: z.string().min(1).max(120),
  eventId: HoodWalkEventIdSchema,
  tone: HoodWalkToneSchema,
  clarity: HoodWalkClaritySchema,
  anchor: HoodWalkAnchorSchema
});
export type HoodWalkLead = z.infer<typeof HoodWalkLeadSchema>;

export const HoodWalkChoiceSchema = z.object({
  id: z.string().min(1).max(80),
  risk: HoodWalkChoiceRiskSchema
});
export type HoodWalkChoice = z.infer<typeof HoodWalkChoiceSchema>;

export const HoodWalkEncounterSchema = z.object({
  id: z.string().min(1).max(160),
  eventId: HoodWalkEventIdSchema,
  tone: HoodWalkToneSchema,
  choices: z.array(HoodWalkChoiceSchema).min(2).max(4)
});
export type HoodWalkEncounter = z.infer<typeof HoodWalkEncounterSchema>;

export const HoodWalkEffectKindSchema = z.enum([
  'momentum',
  'clue',
  'danger',
  'familiarity',
  'cash',
  'item',
  'energy',
  'stress',
  'police_heat'
]);
export type HoodWalkEffectKind = z.infer<typeof HoodWalkEffectKindSchema>;

export const HoodWalkEffectSchema = z.object({
  kind: HoodWalkEffectKindSchema,
  amount: z.number().int().nullable().default(null),
  itemKey: z.string().nullable().default(null)
});
export type HoodWalkEffect = z.infer<typeof HoodWalkEffectSchema>;

export const HoodWalkOutcomeSchema = z.object({
  eventId: HoodWalkEventIdSchema,
  choiceId: z.string().min(1).max(80),
  outcomeId: z.string().min(1).max(140),
  effects: z.array(HoodWalkEffectSchema).max(10)
});
export type HoodWalkOutcome = z.infer<typeof HoodWalkOutcomeSchema>;

export const HoodWalkStreetMemorySchema = z.object({
  segmentId: z.string().min(1),
  familiarity: z.number().int().min(0).max(100),
  completedRuns: z.number().int().min(0),
  helpfulActs: z.number().int().min(0),
  recentEventIds: z.array(HoodWalkEventIdSchema).max(8)
});
export type HoodWalkStreetMemory = z.infer<typeof HoodWalkStreetMemorySchema>;

export const HoodWalkSummarySchema = z.object({
  reason: z.enum(['route_complete', 'left_early', 'exhausted']),
  grade: z.enum(['quiet', 'sharp', 'connected', 'wild']),
  score: z.number().int().min(0),
  encounters: z.number().int().min(0).max(HOOD_WALK_MAX_STEPS),
  discoveries: z.array(z.enum(['faces', 'routes', 'pressure'])).max(3)
});
export type HoodWalkSummary = z.infer<typeof HoodWalkSummarySchema>;

export const HoodWalkPhaseSchema = z.enum(['idle', 'leads', 'encounter', 'complete']);
export type HoodWalkPhase = z.infer<typeof HoodWalkPhaseSchema>;

export const HoodWalkStateSchema = z.object({
  phase: HoodWalkPhaseSchema,
  runId: z.string().uuid().nullable(),
  segmentId: z.string().min(1),
  seed: z.number().int(),
  step: z.number().int().min(0).max(HOOD_WALK_MAX_STEPS),
  maxSteps: z.literal(HOOD_WALK_MAX_STEPS),
  momentum: z.number().int().min(0).max(10),
  danger: z.number().int().min(0).max(10),
  clues: z.number().int().min(0).max(10),
  leads: z.array(HoodWalkLeadSchema).max(3),
  encounter: HoodWalkEncounterSchema.nullable(),
  lastOutcome: HoodWalkOutcomeSchema.nullable(),
  seenEventIds: z.array(HoodWalkEventIdSchema).max(12),
  summary: HoodWalkSummarySchema.nullable(),
  memory: HoodWalkStreetMemorySchema
});
export type HoodWalkState = z.infer<typeof HoodWalkStateSchema>;

const RequestIdSchema = z.string().uuid();
export const HoodWalkCommandSchema = z.discriminatedUnion('command', [
  z.object({ command: z.literal('start'), requestId: RequestIdSchema, expectedVersion: z.number().int().min(0) }),
  z.object({ command: z.literal('pick_lead'), requestId: RequestIdSchema, runId: z.string().uuid(), leadId: z.string().min(1).max(120) }),
  z.object({ command: z.literal('choose'), requestId: RequestIdSchema, expectedVersion: z.number().int().min(0), runId: z.string().uuid(), encounterId: z.string().min(1).max(160), choiceId: z.string().min(1).max(80) }),
  z.object({ command: z.literal('end'), requestId: RequestIdSchema, runId: z.string().uuid() })
]);
export type HoodWalkCommand = z.infer<typeof HoodWalkCommandSchema>;

export const HoodWalkMutationResultSchema = z.object({
  hood: HoodWalkStateSchema,
  state: BootstrapStateSchema.nullable(),
  noticeId: z.enum(['started', 'lead_picked', 'choice_resolved', 'completed', 'ended'])
});
export type HoodWalkMutationResult = z.infer<typeof HoodWalkMutationResultSchema>;
