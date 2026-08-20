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

export const InventoryContainerKeySchema = z.enum(['player', 'ground', 'home', 'vehicle_trunk']);

export const InventoryItemSchema = z.object({
  id: z.uuid(),
  itemKey: z.string().min(1),
  displayName: z.string().min(1),
  category: z.string().min(1),
  symbol: z.string().min(1).max(8),
  quantity: z.number().int().positive(),
  unitWeightGrams: z.number().int().nonnegative(),
  stackable: z.boolean(),
  slotIndex: z.number().int().nonnegative(),
  containerKey: InventoryContainerKeySchema,
  metadata: z.record(z.string(), z.unknown())
});

export const InventoryContainerSchema = z.object({
  key: InventoryContainerKeySchema,
  label: z.string().min(1),
  capacityGrams: z.number().int().positive(),
  weightGrams: z.number().int().nonnegative(),
  slotCount: z.number().int().positive(),
  accessible: z.boolean(),
  accessReason: z.string(),
  items: z.array(InventoryItemSchema)
});

export const InventoryStateSchema = z.object({
  containers: z.array(InventoryContainerSchema),
  selectedExternalKey: InventoryContainerKeySchema
});

export const InventoryMoveRequestSchema = z.object({
  itemId: z.uuid(),
  toContainerKey: InventoryContainerKeySchema,
  toSlotIndex: z.number().int().nonnegative().optional()
});

export const InventoryUseRequestSchema = z.object({ itemId: z.uuid() });

export const InventoryMutationResultSchema = z.object({
  inventory: InventoryStateSchema,
  state: BootstrapStateSchema
});

export type HudState = z.infer<typeof HudStateSchema>;
export type CharacterRecipe = z.infer<typeof CharacterRecipeSchema>;
export type BootstrapState = z.infer<typeof BootstrapStateSchema>;
export type WorldActionId = z.infer<typeof WorldActionIdSchema>;
export type WorldActionRequest = z.infer<typeof WorldActionRequestSchema>;
export type WorldActionResult = z.infer<typeof WorldActionResultSchema>;
export type InventoryContainerKey = z.infer<typeof InventoryContainerKeySchema>;
export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export type InventoryContainer = z.infer<typeof InventoryContainerSchema>;
export type InventoryState = z.infer<typeof InventoryStateSchema>;
export type InventoryMoveRequest = z.infer<typeof InventoryMoveRequestSchema>;
export type InventoryMutationResult = z.infer<typeof InventoryMutationResultSchema>;

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
