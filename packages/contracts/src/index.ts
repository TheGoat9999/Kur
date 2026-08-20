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

export const StreetSegmentIdSchema = z.enum([
  'market_block_3',
  'cypress_corner',
  'mira_alley'
]);

export const StreetObjectIdSchema = z.enum([
  'corner_store',
  'el_camino',
  'cypress_apartments',
  'service_alley',
  'market_dumpster',
  'maya_rojas',
  'exit_market',
  'exit_cypress',
  'exit_alley'
]);

export const WorldActionIdSchema = z.enum([
  'travel_market_block_3',
  'travel_cypress_corner',
  'travel_mira_alley',
  'inspect_corner_store',
  'enter_corner_store',
  'shoplift_corner_store',
  'speak_corner_clerk',
  'deliver_el_camino',
  'inspect_el_camino',
  'enter_el_camino',
  'inspect_apartment',
  'enter_apartment',
  'inspect_service_alley',
  'search_dumpster',
  'talk_maya',
  'ask_maya_information'
]);

export const WorldNoticeIdSchema = z.enum([
  'travel_market',
  'travel_cypress',
  'travel_alley',
  'corner_inspected',
  'corner_entered',
  'shoplift_witnessed',
  'shoplift_clean',
  'clerk_spoken',
  'delivery_complete',
  'restaurant_inspected',
  'restaurant_entered',
  'apartment_inspected',
  'alley_inspected',
  'dumpster_salvage',
  'maya_greeting',
  'maya_tip'
]);

export const StreetActionAvailabilitySchema = z.enum([
  'available',
  'cooldown',
  'locked',
  'already_done',
  'wrong_location'
]);

export const StreetActionStateSchema = z.object({
  actionId: WorldActionIdSchema,
  availability: StreetActionAvailabilitySchema,
  cooldownEndsAt: z.iso.datetime().nullable()
});

export const StreetFlagsSchema = z.object({
  cornerStoreAlerted: z.boolean(),
  alleyTipKnown: z.boolean()
});

export const StreetStateSchema = z.object({
  currentSegmentId: StreetSegmentIdSchema,
  visitedSegmentIds: z.array(StreetSegmentIdSchema),
  visibleObjectIds: z.array(StreetObjectIdSchema),
  flags: StreetFlagsSchema,
  actionStates: z.array(StreetActionStateSchema)
});

export const WorldActionRequestSchema = z.object({
  requestId: z.uuid(),
  actionId: WorldActionIdSchema,
  expectedVersion: z.number().int().nonnegative()
});

export const WorldActionResultSchema = z.object({
  requestId: z.uuid(),
  actionId: WorldActionIdSchema,
  noticeId: WorldNoticeIdSchema,
  state: BootstrapStateSchema,
  street: StreetStateSchema,
  reward: z.object({
    itemKey: z.string(),
    displayName: z.string(),
    quantity: z.number().int().positive()
  }).optional()
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

export const FinanceAccessModeSchema = z.enum(['branch', 'atm', 'phone']);
export const FinanceAssetSymbolSchema = z.enum(['DRC', 'VTA', 'MSA']);
export const FinanceLedgerTypeSchema = z.enum(['cash', 'transfer', 'internal', 'loan', 'crypto']);

export const FinanceLoanSchema = z.object({
  id: z.uuid(),
  kind: z.enum(['personal', 'vehicle']),
  name: z.string().min(1),
  principalCents: z.number().int().positive(),
  remainingCents: z.number().int().nonnegative(),
  paymentCents: z.number().int().positive(),
  paymentsRemaining: z.number().int().nonnegative(),
  aprBasisPoints: z.number().int().nonnegative()
});

export const FinanceAssetSchema = z.object({
  symbol: FinanceAssetSymbolSchema,
  name: z.string().min(1),
  priceCents: z.number().int().positive(),
  previousPriceCents: z.number().int().positive(),
  holding: z.number().nonnegative()
});

export const FinanceLedgerEntrySchema = z.object({
  id: z.uuid(),
  type: FinanceLedgerTypeSchema,
  title: z.string().min(1),
  amountCents: z.number().int().nonnegative(),
  direction: z.enum(['in', 'out']),
  detail: z.string(),
  createdAt: z.iso.datetime()
});

export const FinanceStateSchema = z.object({
  version: z.number().int().nonnegative(),
  accessMode: FinanceAccessModeSchema,
  balances: z.object({
    cashCents: z.number().int().nonnegative(),
    checkingCents: z.number().int().nonnegative(),
    savingsCents: z.number().int().nonnegative(),
    exchangeCashCents: z.number().int().nonnegative()
  }),
  creditScore: z.number().int().min(300).max(850),
  transferLimitCents: z.number().int().positive(),
  loans: z.array(FinanceLoanSchema),
  assets: z.array(FinanceAssetSchema),
  ledger: z.array(FinanceLedgerEntrySchema)
});

export const FinanceSetAccessRequestSchema = z.object({ accessMode: FinanceAccessModeSchema });
export const FinanceCashRequestSchema = z.object({
  direction: z.enum(['deposit', 'withdraw']),
  amountCents: z.number().int().positive().max(100_000_000)
});
export const FinanceInternalTransferRequestSchema = z.object({
  direction: z.enum(['checking_to_savings', 'savings_to_checking']),
  amountCents: z.number().int().positive().max(100_000_000)
});
export const FinanceRecipientTransferRequestSchema = z.object({
  recipientId: z.enum(['maya', 'leo', 'landlord']),
  amountCents: z.number().int().positive().max(100_000_000),
  reference: z.string().trim().max(40).default('')
});
export const FinanceLoanRequestSchema = z.object({ kind: z.enum(['personal', 'vehicle']) });
export const FinanceExchangeFundRequestSchema = z.object({
  amountCents: z.number().int().positive().max(100_000_000)
});
export const FinanceCryptoTradeRequestSchema = z.object({
  side: z.enum(['buy', 'sell']),
  symbol: FinanceAssetSymbolSchema,
  usdCents: z.number().int().positive().max(100_000_000)
});

export const FinanceMutationResultSchema = z.object({
  finance: FinanceStateSchema,
  state: BootstrapStateSchema,
  notice: z.object({ title: z.string(), message: z.string() }).optional()
});

export type HudState = z.infer<typeof HudStateSchema>;
export type CharacterRecipe = z.infer<typeof CharacterRecipeSchema>;
export type BootstrapState = z.infer<typeof BootstrapStateSchema>;
export type StreetSegmentId = z.infer<typeof StreetSegmentIdSchema>;
export type StreetObjectId = z.infer<typeof StreetObjectIdSchema>;
export type WorldActionId = z.infer<typeof WorldActionIdSchema>;
export type WorldNoticeId = z.infer<typeof WorldNoticeIdSchema>;
export type StreetActionAvailability = z.infer<typeof StreetActionAvailabilitySchema>;
export type StreetActionState = z.infer<typeof StreetActionStateSchema>;
export type StreetFlags = z.infer<typeof StreetFlagsSchema>;
export type StreetState = z.infer<typeof StreetStateSchema>;
export type WorldActionRequest = z.infer<typeof WorldActionRequestSchema>;
export type WorldActionResult = z.infer<typeof WorldActionResultSchema>;
export type InventoryContainerKey = z.infer<typeof InventoryContainerKeySchema>;
export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export type InventoryContainer = z.infer<typeof InventoryContainerSchema>;
export type InventoryState = z.infer<typeof InventoryStateSchema>;
export type InventoryMoveRequest = z.infer<typeof InventoryMoveRequestSchema>;
export type InventoryMutationResult = z.infer<typeof InventoryMutationResultSchema>;
export type FinanceAccessMode = z.infer<typeof FinanceAccessModeSchema>;
export type FinanceAssetSymbol = z.infer<typeof FinanceAssetSymbolSchema>;
export type FinanceLoan = z.infer<typeof FinanceLoanSchema>;
export type FinanceAsset = z.infer<typeof FinanceAssetSchema>;
export type FinanceLedgerEntry = z.infer<typeof FinanceLedgerEntrySchema>;
export type FinanceState = z.infer<typeof FinanceStateSchema>;
export type FinanceMutationResult = z.infer<typeof FinanceMutationResultSchema>;

export const WORLD_ACTION_IDS: ReadonlyArray<WorldActionId> = [
  'travel_market_block_3',
  'travel_cypress_corner',
  'travel_mira_alley',
  'inspect_corner_store',
  'enter_corner_store',
  'shoplift_corner_store',
  'speak_corner_clerk',
  'deliver_el_camino',
  'inspect_el_camino',
  'enter_el_camino',
  'inspect_apartment',
  'enter_apartment',
  'inspect_service_alley',
  'search_dumpster',
  'talk_maya',
  'ask_maya_information'
];
