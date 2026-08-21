export type CharacterSex = 'male' | 'female';

export type CharacterAppearance = {
  height: number;
  weight: number;
  muscle: number;
  age: number;
  skinTone: string;
  eyeColor: string;
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

export type CharacterGrooming = {
  hairStyle: string;
  hairColor: string;
  equipped: Partial<Record<GarmentSlot, string>>;
};

export type CharacterAppearanceRecipe = {
  body: CharacterSex;
  appearance: CharacterAppearance;
  grooming: CharacterGrooming;
  morphs: Record<string, number>;
  faceMorphs: Record<string, number>;
};

export type CharacterAssetStatus = 'draft' | 'generating' | 'validating' | 'ready' | 'rejected';

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

export const BODY_MORPHS = [
  ['shoulders', 'Shoulders'],
  ['chest', 'Chest'],
  ['waist', 'Waist'],
  ['hips', 'Hips'],
  ['upperArms', 'Upper arms'],
  ['thighs', 'Thighs'],
  ['calves', 'Calves'],
  ['armLength', 'Arm length'],
  ['legLength', 'Leg length']
] as const;

export const FACE_MORPHS = [
  ['cheekbones', 'Cheekbones'],
  ['cheekVolume', 'Cheek volume'],
  ['chinWidth', 'Chin width'],
  ['chinHeight', 'Chin height'],
  ['eyeSize', 'Eye size'],
  ['eyeSpacing', 'Eye spacing'],
  ['noseWidth', 'Nose width'],
  ['noseLength', 'Nose length'],
  ['mouthWidth', 'Mouth width'],
  ['upperLip', 'Upper lip'],
  ['lowerLip', 'Lower lip']
] as const;

export const DEFAULT_CHARACTER_RECIPE: CharacterAppearanceRecipe = {
  body: 'male',
  appearance: {
    height: 0,
    weight: 0,
    muscle: 0,
    age: 28,
    skinTone: 'warm-medium',
    eyeColor: 'brown'
  },
  grooming: {
    hairStyle: 'bald',
    hairColor: 'dark-brown',
    equipped: {}
  },
  morphs: {},
  faceMorphs: {}
};

export function normalizeMorph(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-100, Math.min(100, Math.round(value)));
}

export function normalizeRecipe(input?: Partial<CharacterAppearanceRecipe> | null): CharacterAppearanceRecipe {
  const appearance = input?.appearance ?? {} as Partial<CharacterAppearance>;
  const grooming = input?.grooming ?? {} as Partial<CharacterGrooming>;
  return {
    body: input?.body === 'female' ? 'female' : 'male',
    appearance: {
      height: normalizeMorph(Number(appearance.height ?? 0)),
      weight: normalizeMorph(Number(appearance.weight ?? 0)),
      muscle: normalizeMorph(Number(appearance.muscle ?? 0)),
      age: Math.max(18, Math.min(80, Math.round(Number(appearance.age ?? 28)))),
      skinTone: String(appearance.skinTone ?? 'warm-medium'),
      eyeColor: String(appearance.eyeColor ?? 'brown')
    },
    grooming: {
      hairStyle: String(grooming.hairStyle ?? 'bald'),
      hairColor: String(grooming.hairColor ?? 'dark-brown'),
      equipped: { ...(grooming.equipped ?? {}) }
    },
    morphs: normalizeMorphMap(input?.morphs),
    faceMorphs: normalizeMorphMap(input?.faceMorphs)
  };
}

function normalizeMorphMap(values?: Record<string, number>) {
  return Object.fromEntries(Object.entries(values ?? {}).map(([key, value]) => [key, normalizeMorph(value)]));
}
