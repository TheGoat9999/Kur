export type CharacterSex = 'male' | 'female';

export type CharacterAppearanceRecipe = {
  schemaVersion: 1;
  sex: CharacterSex;
  height: number;
  weight: number;
  muscle: number;
  age: number;
  skinTone: string;
  eyeColor: string;
  bodyMorphs: Record<string, number>;
  faceMorphs: Record<string, number>;
  hairAssetId: string | null;
  hairColor: string;
  equipped: Partial<Record<GarmentSlot, string>>;
};

export type GarmentSlot =
  | 'head'
  | 'face'
  | 'torsoInner'
  | 'torsoOuter'
  | 'legs'
  | 'feet'
  | 'hands'
  | 'accessory';

export type CharacterAssetStatus =
  | 'draft'
  | 'generating'
  | 'validating'
  | 'ready'
  | 'rejected';

export type CharacterAssetManifest = {
  id: string;
  kind: 'hair' | 'clothing' | 'body-part';
  slot?: GarmentSlot;
  displayName: string;
  glbUrl: string;
  thumbnailUrl?: string;
  compatibleSexes: CharacterSex[];
  compatibleRig: 'sol-dorado-humanoid-v1';
  source: 'makehuman-system' | 'ai-generated' | 'curated-third-party';
  license: string;
  prompt?: string;
  status: CharacterAssetStatus;
  createdAt: string;
};

export const DEFAULT_CHARACTER_RECIPE: CharacterAppearanceRecipe = {
  schemaVersion: 1,
  sex: 'male',
  height: 0,
  weight: 0,
  muscle: 0,
  age: 28,
  skinTone: 'warm-medium',
  eyeColor: 'brown',
  bodyMorphs: {},
  faceMorphs: {},
  hairAssetId: null,
  hairColor: 'dark-brown',
  equipped: {}
};

export function normalizeMorph(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-100, Math.min(100, Math.round(value)));
}

export function normalizeRecipe(
  input: Partial<CharacterAppearanceRecipe>
): CharacterAppearanceRecipe {
  return {
    ...DEFAULT_CHARACTER_RECIPE,
    ...input,
    schemaVersion: 1,
    sex: input.sex === 'female' ? 'female' : 'male',
    height: normalizeMorph(input.height ?? 0),
    weight: normalizeMorph(input.weight ?? 0),
    muscle: normalizeMorph(input.muscle ?? 0),
    age: Math.max(18, Math.min(80, Math.round(input.age ?? 28))),
    bodyMorphs: Object.fromEntries(
      Object.entries(input.bodyMorphs ?? {}).map(([key, value]) => [key, normalizeMorph(value)])
    ),
    faceMorphs: Object.fromEntries(
      Object.entries(input.faceMorphs ?? {}).map(([key, value]) => [key, normalizeMorph(value)])
    ),
    equipped: { ...(input.equipped ?? {}) }
  };
}
