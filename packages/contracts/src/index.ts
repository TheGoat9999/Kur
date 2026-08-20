import { z } from 'zod';

export const HudStateSchema = z.object({
  health: z.number().int().min(0).max(100),
  energy: z.number().int().min(0).max(100),
  satiety: z.number().int().min(0).max(100),
  hydration: z.number().int().min(0).max(100),
  stress: z.number().int().min(0).max(100),
  policeHeat: z.number().int().min(0).max(100),
  cashCents: z.number().int().nonnegative()
});

export const CharacterRecipeSchema = z.object({
  body: z.enum(['male', 'female']),
  appearance: z.record(z.string(), z.unknown()),
  grooming: z.record(z.string(), z.unknown()),
  morphs: z.record(z.string(), z.number()),
  faceMorphs: z.record(z.string(), z.number())
});

export const CharacterSchema = z.object({
  id: z.uuid(),
  displayName: z.string().min(1).max(80),
  recipe: CharacterRecipeSchema,
  updatedAt: z.iso.datetime()
});

export const PlayerLocationSchema = z.object({
  settlement: z.string(),
  zone: z.string(),
  district: z.string(),
  streetSegment: z.string()
});

export const BootstrapStateSchema = z.object({
  playerId: z.uuid(),
  version: z.number().int().nonnegative(),
  serverTime: z.iso.datetime(),
  character: CharacterSchema.nullable(),
  hud: HudStateSchema,
  location: PlayerLocationSchema
});

export const WorldActionIdSchema = z.enum([
  'walk_market_street',
  'work_delivery_shift',
  'shoplift_corner_store'
]);

export const WorldActionRequestSchema = z.object({
  requestId: z.uuid(),
  actionId: WorldActionIdSchema,
  expectedVersion: z.number().int().nonnegative()
});

export const WorldActionResultSchema = z.object({
  requestId: z.uuid(),
  actionId: WorldActionIdSchema,
  title: z.string(),
  feedback: z.string(),
  state: BootstrapStateSchema
});

export const DevSessionSchema = z.object({
  token: z.string().min(20),
  expiresInSeconds: z.number().int().positive()
});

export type HudState = z.infer<typeof HudStateSchema>;
export type CharacterRecipe = z.infer<typeof CharacterRecipeSchema>;
export type BootstrapState = z.infer<typeof BootstrapStateSchema>;
export type WorldActionId = z.infer<typeof WorldActionIdSchema>;
export type WorldActionRequest = z.infer<typeof WorldActionRequestSchema>;
export type WorldActionResult = z.infer<typeof WorldActionResultSchema>;

export const WORLD_ACTIONS: ReadonlyArray<{
  id: WorldActionId;
  label: string;
  kind: 'travel' | 'work' | 'crime';
  description: string;
}> = [
  { id: 'walk_market_street', label: 'Walk to Market Street', kind: 'travel', description: 'Move through Las Palmas on foot.' },
  { id: 'work_delivery_shift', label: 'Take delivery shift', kind: 'work', description: 'Earn cash, but spend energy and hydration.' },
  { id: 'shoplift_corner_store', label: 'Shoplift corner store', kind: 'crime', description: 'Fast cash with stress and police risk.' }
];
