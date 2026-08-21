import { z } from 'zod';
import { StreetPositionSchema, StreetSpatialSegmentIdSchema } from './world-position.js';

export const LocalizedNpcTextSchema = z.object({
  bg: z.string().min(1),
  en: z.string().min(1)
});

export const NpcIdSchema = z.enum([
  'maya_rojas',
  'rafael_vega',
  'elena_cruz',
  'tomas_ibarra',
  'darius_cole',
  'nina_park'
]);

export const NpcArchetypeSchema = z.enum([
  'connector',
  'merchant',
  'operator',
  'craftsperson',
  'courier',
  'observer'
]);

export const NpcMoodSchema = z.enum(['calm', 'busy', 'guarded', 'friendly', 'tired', 'alert']);
export const NpcIntentSchema = z.enum(['work', 'commute', 'break', 'socialize', 'errand', 'off_duty']);
export const NpcInteractionActionSchema = z.enum(['talk', 'ask_work', 'ask_rumor']);
export const NpcMissionHookStatusSchema = z.enum(['foreshadowed', 'available_later', 'available']);

export const NpcTraitSchema = z.enum([
  'observant',
  'practical',
  'social',
  'private',
  'ambitious',
  'loyal',
  'cautious',
  'restless'
]);

export const NpcMissionHookSchema = z.object({
  id: z.string().min(1),
  title: LocalizedNpcTextSchema,
  premise: LocalizedNpcTextSchema,
  requiredFeature: z.string().min(1),
  status: NpcMissionHookStatusSchema
});

export const NpcRelationshipSchema = z.object({
  familiarity: z.number().int().min(0).max(100),
  trust: z.number().int().min(-100).max(100),
  respect: z.number().int().min(-100).max(100),
  interactionCount: z.number().int().nonnegative(),
  lastInteractionAt: z.iso.datetime().nullable(),
  lastTopic: NpcInteractionActionSchema.nullable()
});

export const NpcPresenceSchema = z.object({
  segmentId: StreetSpatialSegmentIdSchema,
  position: StreetPositionSchema,
  intent: NpcIntentSchema,
  activity: LocalizedNpcTextSchema,
  mood: NpcMoodSchema,
  available: z.boolean()
});

export const NpcPublicStateSchema = z.object({
  id: NpcIdSchema,
  name: z.string().min(1),
  nickname: z.string().nullable(),
  role: LocalizedNpcTextSchema,
  story: LocalizedNpcTextSchema,
  archetype: NpcArchetypeSchema,
  traits: z.array(NpcTraitSchema).min(2).max(4),
  presence: NpcPresenceSchema,
  relationship: NpcRelationshipSchema,
  missionHooks: z.array(NpcMissionHookSchema)
});

export const NearbyNpcsStateSchema = z.object({
  serverTime: z.iso.datetime(),
  segmentId: StreetSpatialSegmentIdSchema,
  npcs: z.array(NpcPublicStateSchema)
});

export const NpcInteractRequestSchema = z.object({
  action: NpcInteractionActionSchema
});

export const NpcInteractionResultSchema = z.object({
  npc: NpcPublicStateSchema,
  action: NpcInteractionActionSchema,
  dialogue: LocalizedNpcTextSchema,
  memory: LocalizedNpcTextSchema,
  lead: NpcMissionHookSchema.nullable()
});

export type LocalizedNpcText = z.infer<typeof LocalizedNpcTextSchema>;
export type NpcId = z.infer<typeof NpcIdSchema>;
export type NpcArchetype = z.infer<typeof NpcArchetypeSchema>;
export type NpcMood = z.infer<typeof NpcMoodSchema>;
export type NpcIntent = z.infer<typeof NpcIntentSchema>;
export type NpcTrait = z.infer<typeof NpcTraitSchema>;
export type NpcInteractionAction = z.infer<typeof NpcInteractionActionSchema>;
export type NpcMissionHook = z.infer<typeof NpcMissionHookSchema>;
export type NpcRelationship = z.infer<typeof NpcRelationshipSchema>;
export type NpcPresence = z.infer<typeof NpcPresenceSchema>;
export type NpcPublicState = z.infer<typeof NpcPublicStateSchema>;
export type NearbyNpcsState = z.infer<typeof NearbyNpcsStateSchema>;
export type NpcInteractionResult = z.infer<typeof NpcInteractionResultSchema>;
