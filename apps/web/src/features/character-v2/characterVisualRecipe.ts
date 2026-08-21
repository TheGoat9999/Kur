export type CharacterSex = 'male' | 'female';
export type BodyBuild = 'slim' | 'average' | 'athletic' | 'heavy';
export type AgeBand = 'young' | 'adult' | 'mature';
export type FaceShape = 'oval' | 'angular' | 'round' | 'heart';

export type CharacterVisualRecipeV2 = {
  version: 2;
  body: CharacterSex;
  appearance: {
    styleVersion: 'stylized-v2';
    bodyBuild: BodyBuild;
    height: number;
    ageBand: AgeBand;
    skinTone: string;
    faceShape: FaceShape;
    jaw: number;
    cheekbones: number;
    nose: string;
    lips: string;
    eyeShape: string;
    eyeColor: string;
    eyebrows: string;
  };
  grooming: {
    hairStyle: string;
    hairColor: string;
    facialHair: string;
    top: string;
    outerwear: string;
    bottoms: string;
    shoes: string;
    eyewear: string;
    headwear: string;
    jewelry: string;
    accessory: string;
    vibe: string;
    accentColor: string;
    canonicalPreviewUrl?: string;
    portraitPreviewUrl?: string;
  };
  morphs: Record<string, number>;
  faceMorphs: Record<string, number>;
};

export const DEFAULT_CHARACTER_V2: CharacterVisualRecipeV2 = {
  version: 2,
  body: 'male',
  appearance: {
    styleVersion: 'stylized-v2',
    bodyBuild: 'average',
    height: 0,
    ageBand: 'adult',
    skinTone: 'warm-medium',
    faceShape: 'angular',
    jaw: 12,
    cheekbones: 8,
    nose: 'straight',
    lips: 'medium',
    eyeShape: 'almond',
    eyeColor: 'brown',
    eyebrows: 'natural'
  },
  grooming: {
    hairStyle: 'fade-textured',
    hairColor: 'dark-brown',
    facialHair: 'clean',
    top: 'tee-urban-black',
    outerwear: 'none',
    bottoms: 'cargo-charcoal',
    shoes: 'sneakers-white',
    eyewear: 'none',
    headwear: 'none',
    jewelry: 'none',
    accessory: 'none',
    vibe: 'street-modern',
    accentColor: '#f0bd4f'
  },
  morphs: {},
  faceMorphs: {}
};

export function normalizeVisualRecipe(input: unknown): CharacterVisualRecipeV2 {
  const source = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const appearance = object(source.appearance);
  const grooming = object(source.grooming);
  const isV2 = appearance.styleVersion === 'stylized-v2';

  if (!isV2) {
    return {
      ...DEFAULT_CHARACTER_V2,
      body: source.body === 'female' ? 'female' : 'male',
      appearance: {
        ...DEFAULT_CHARACTER_V2.appearance,
        ageBand: legacyAgeBand(appearance.age),
        skinTone: stringValue(appearance.skinTone, DEFAULT_CHARACTER_V2.appearance.skinTone),
        height: numberValue(appearance.height, 0, -100, 100)
      },
      grooming: {
        ...DEFAULT_CHARACTER_V2.grooming,
        hairStyle: legacyHair(stringValue(grooming.hairStyle, '')),
        hairColor: stringValue(grooming.hairColor, DEFAULT_CHARACTER_V2.grooming.hairColor)
      }
    };
  }

  return {
    version: 2,
    body: source.body === 'female' ? 'female' : 'male',
    appearance: {
      styleVersion: 'stylized-v2',
      bodyBuild: oneOf(appearance.bodyBuild, ['slim', 'average', 'athletic', 'heavy'], 'average'),
      height: numberValue(appearance.height, 0, -100, 100),
      ageBand: oneOf(appearance.ageBand, ['young', 'adult', 'mature'], 'adult'),
      skinTone: stringValue(appearance.skinTone, 'warm-medium'),
      faceShape: oneOf(appearance.faceShape, ['oval', 'angular', 'round', 'heart'], 'angular'),
      jaw: numberValue(appearance.jaw, 12, -100, 100),
      cheekbones: numberValue(appearance.cheekbones, 8, -100, 100),
      nose: stringValue(appearance.nose, 'straight'),
      lips: stringValue(appearance.lips, 'medium'),
      eyeShape: stringValue(appearance.eyeShape, 'almond'),
      eyeColor: stringValue(appearance.eyeColor, 'brown'),
      eyebrows: stringValue(appearance.eyebrows, 'natural')
    },
    grooming: {
      hairStyle: stringValue(grooming.hairStyle, DEFAULT_CHARACTER_V2.grooming.hairStyle),
      hairColor: stringValue(grooming.hairColor, DEFAULT_CHARACTER_V2.grooming.hairColor),
      facialHair: stringValue(grooming.facialHair, 'clean'),
      top: stringValue(grooming.top, DEFAULT_CHARACTER_V2.grooming.top),
      outerwear: stringValue(grooming.outerwear, 'none'),
      bottoms: stringValue(grooming.bottoms, DEFAULT_CHARACTER_V2.grooming.bottoms),
      shoes: stringValue(grooming.shoes, DEFAULT_CHARACTER_V2.grooming.shoes),
      eyewear: stringValue(grooming.eyewear, 'none'),
      headwear: stringValue(grooming.headwear, 'none'),
      jewelry: stringValue(grooming.jewelry, 'none'),
      accessory: stringValue(grooming.accessory, 'none'),
      vibe: stringValue(grooming.vibe, 'street-modern'),
      accentColor: stringValue(grooming.accentColor, '#f0bd4f'),
      canonicalPreviewUrl: optionalString(grooming.canonicalPreviewUrl),
      portraitPreviewUrl: optionalString(grooming.portraitPreviewUrl)
    },
    morphs: numberMap(source.morphs),
    faceMorphs: numberMap(source.faceMorphs)
  };
}

function object(value: unknown) {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}
function stringValue(value: unknown, fallback: string) { return typeof value === 'string' && value ? value : fallback; }
function optionalString(value: unknown) { return typeof value === 'string' && value ? value : undefined; }
function numberValue(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
}
function oneOf<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === 'string' && (values as readonly string[]).includes(value) ? value as T : fallback;
}
function numberMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).flatMap(([key, raw]) => {
    const n = Number(raw);
    return Number.isFinite(n) ? [[key, Math.max(-100, Math.min(100, Math.round(n)))]] : [];
  }));
}
function legacyAgeBand(value: unknown): AgeBand {
  const age = Number(value);
  if (!Number.isFinite(age) || age < 32) return 'young';
  if (age < 52) return 'adult';
  return 'mature';
}
function legacyHair(value: string) {
  if (!value || value === 'bald') return value === 'bald' ? 'bald' : 'fade-textured';
  if (value.includes('long')) return 'long-layered';
  if (value.includes('bob')) return 'bob-modern';
  if (value.includes('afro')) return 'afro-rounded';
  if (value.includes('braid')) return 'braids-clean';
  return 'fade-textured';
}
