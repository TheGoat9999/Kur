import { z } from 'zod';

export const ItemCategorySchema = z.enum([
  'personal',
  'food',
  'drink',
  'tool',
  'material',
  'electronics',
  'medical',
  'weapon'
]);

export const ItemLegalitySchema = z.enum(['legal', 'restricted', 'regulated', 'illegal']);

export const ItemUseEffectsSchema = z.object({
  health: z.number().int().min(-100).max(100).optional(),
  energy: z.number().int().min(-100).max(100).optional(),
  satiety: z.number().int().min(-100).max(100).optional(),
  hydration: z.number().int().min(-100).max(100).optional(),
  stress: z.number().int().min(-100).max(100).optional(),
  policeHeat: z.number().int().min(-100).max(100).optional()
});

export const ItemImageSchema = z.object({
  provider: z.literal('rainmad'),
  galleryUrl: z.url(),
  localPath: z.string().min(1),
  searchTerms: z.array(z.string().min(1)).min(1),
  preferredSourceFile: z.string().min(1).nullable()
});

export const ItemRealWorldReferenceSchema = z.object({
  matchType: z.literal('representative'),
  referenceName: z.string().min(1).max(120),
  manufacturer: z.string().min(1).max(120),
  referenceClass: z.string().min(1).max(100),
  cartridge: z.string().min(1).max(60).nullable(),
  action: z.string().min(1).max(80).nullable(),
  typicalCapacity: z.number().int().positive().max(200).nullable(),
  approximateUnloadedWeightGrams: z.number().int().positive().max(30000).nullable(),
  referenceUrl: z.url(),
  disclaimer: z.string().min(1).max(240)
});

export const ItemWorldAssetSourceSchema = z.object({
  provider: z.literal('quaternius'),
  pack: z.literal('Ultimate Guns Pack'),
  sourceEntry: z.string().min(1),
  uploadedArchiveSha256: z.string().regex(/^[a-f0-9]{64}$/),
  sourceUrl: z.url(),
  license: z.literal('CC0-1.0'),
  runtimeStatus: z.literal('source-fbx')
});

export const ItemDefinitionSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]+$/),
  displayName: z.string().min(1).max(80),
  category: ItemCategorySchema,
  subcategory: z.string().min(1).max(40),
  unitWeightGrams: z.number().int().nonnegative(),
  stackable: z.boolean(),
  maxStack: z.number().int().positive().max(1000),
  basePriceCents: z.number().int().nonnegative(),
  legality: ItemLegalitySchema,
  useEffects: ItemUseEffectsSchema,
  tags: z.array(z.string().min(1).max(40)),
  image: ItemImageSchema,
  realWorldReference: ItemRealWorldReferenceSchema.optional(),
  worldAssetSource: ItemWorldAssetSourceSchema.optional()
}).superRefine((item, context) => {
  if (!item.stackable && item.maxStack !== 1) {
    context.addIssue({
      code: 'custom',
      path: ['maxStack'],
      message: 'Non-stackable items must have maxStack = 1'
    });
  }
});

export const ItemCatalogSchema = z.array(ItemDefinitionSchema);

export const ItemCatalogResponseSchema = z.object({
  total: z.number().int().nonnegative(),
  items: ItemCatalogSchema
});

export type ItemCategory = z.infer<typeof ItemCategorySchema>;
export type ItemLegality = z.infer<typeof ItemLegalitySchema>;
export type ItemUseEffects = z.infer<typeof ItemUseEffectsSchema>;
export type ItemImage = z.infer<typeof ItemImageSchema>;
export type ItemRealWorldReference = z.infer<typeof ItemRealWorldReferenceSchema>;
export type ItemWorldAssetSource = z.infer<typeof ItemWorldAssetSourceSchema>;
export type ItemDefinition = z.infer<typeof ItemDefinitionSchema>;
export type ItemCatalogResponse = z.infer<typeof ItemCatalogResponseSchema>;
