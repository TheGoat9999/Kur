import type { CharacterRecipe } from '@sol-dorado/contracts';

export type WorldCharacterDirection = 'north' | 'south' | 'east' | 'west';
export type WorldHairStyle = 'bald' | 'crop' | 'short' | 'long' | 'bun';

export interface WorldCharacterVisual {
  body: 'male' | 'female';
  skinColor: string;
  hairColor: string;
  hairStyle: WorldHairStyle;
  topColor: string;
  bottomColor: string;
  shoeColor: string;
  accentColor: string;
}

const SKIN_TONES = ['#f0c6a0', '#ddb086', '#c98e65', '#a96f4f', '#7d4f38', '#553628'] as const;
const HAIR_COLORS = ['#161513', '#38271e', '#704a2f', '#a26c3f', '#c6aa74', '#7b3e31'] as const;
const TOP_COLORS = ['#3f6572', '#72546e', '#4f725c', '#7b5f45', '#4e5877', '#6c584b'] as const;
const BOTTOM_COLORS = ['#263b45', '#32343c', '#40454b', '#353d34', '#292e3d'] as const;
const HAIR_STYLES: WorldHairStyle[] = ['crop', 'short', 'long', 'bun', 'bald'];

export function visualFromCharacterRecipe(recipe: CharacterRecipe | null | undefined): WorldCharacterVisual {
  const appearance = recipe?.appearance ?? {};
  const grooming = recipe?.grooming ?? {};
  const body = recipe?.body ?? 'male';
  const skinTone = numeric(appearance.skinTone, 2);
  const hairColor = numeric(grooming.hairColor, 1);
  const hairStyle = normalizeHair(text(grooming.hairStyle, body === 'female' ? 'long' : 'short'));

  return {
    body,
    skinColor: palette(SKIN_TONES, skinTone),
    hairColor: palette(HAIR_COLORS, hairColor),
    hairStyle,
    topColor: colorFromRecords([grooming, appearance], ['topColor', 'shirtColor', 'upperColor']) ?? (body === 'female' ? '#655776' : '#456a76'),
    bottomColor: colorFromRecords([grooming, appearance], ['bottomColor', 'pantsColor', 'lowerColor']) ?? '#2d3b43',
    shoeColor: colorFromRecords([grooming, appearance], ['shoeColor', 'shoesColor']) ?? '#171d20',
    accentColor: colorFromRecords([grooming, appearance], ['accentColor']) ?? '#d7b66e'
  };
}

export function visualFromSeed(seed: string): WorldCharacterVisual {
  const value = hash(seed);
  const body: 'male' | 'female' = value % 2 === 0 ? 'male' : 'female';
  const hairStyle = HAIR_STYLES[(value >>> 5) % HAIR_STYLES.length] ?? 'short';
  return {
    body,
    skinColor: SKIN_TONES[(value >>> 2) % SKIN_TONES.length] ?? SKIN_TONES[2],
    hairColor: HAIR_COLORS[(value >>> 8) % HAIR_COLORS.length] ?? HAIR_COLORS[1],
    hairStyle,
    topColor: TOP_COLORS[(value >>> 11) % TOP_COLORS.length] ?? TOP_COLORS[0],
    bottomColor: BOTTOM_COLORS[(value >>> 15) % BOTTOM_COLORS.length] ?? BOTTOM_COLORS[0],
    shoeColor: '#171d20',
    accentColor: '#d7b66e'
  };
}

export function WorldCharacter({ visual, direction = 'south', moving = false, className = '' }: {
  visual: WorldCharacterVisual;
  direction?: WorldCharacterDirection;
  moving?: boolean;
  className?: string;
}) {
  return (
    <span className={`world-character world-character-${direction} ${moving ? 'world-character-moving' : ''} ${className}`.trim()} aria-hidden="true">
      <svg className="world-character-svg" viewBox="0 0 36 58" role="presentation">
        <WorldCharacterGlyph visual={visual} direction={direction} />
      </svg>
    </span>
  );
}

export function WorldCharacterGlyph({ visual, direction = 'south' }: {
  visual: WorldCharacterVisual;
  direction?: WorldCharacterDirection;
}) {
  const side = direction === 'east' || direction === 'west';
  const rear = direction === 'north';
  const flip = direction === 'west' ? 'translate(36 0) scale(-1 1)' : undefined;
  const torsoPath = visual.body === 'female'
    ? 'M10 24 Q18 20 26 24 L25 40 Q18 43 11 40 Z'
    : 'M9 24 Q18 20 27 24 L26 41 Q18 43 10 41 Z';

  return (
    <g transform={flip}>
      <ellipse cx="18" cy="54" rx="12" ry="3" fill="#071014" opacity=".4" />
      <g className="world-character-leg world-character-leg-left">
        <rect x="11" y="39" width="6" height="13" rx="2.5" fill={visual.bottomColor} stroke="#122127" strokeWidth="1.2" />
        <rect x="10" y="49" width="8" height="4" rx="2" fill={visual.shoeColor} />
      </g>
      <g className="world-character-leg world-character-leg-right">
        <rect x="19" y="39" width="6" height="13" rx="2.5" fill={visual.bottomColor} stroke="#122127" strokeWidth="1.2" />
        <rect x="19" y="49" width="8" height="4" rx="2" fill={visual.shoeColor} />
      </g>
      <g className="world-character-arm world-character-arm-left">
        <rect x="6" y="25" width="6" height="17" rx="3" fill={visual.topColor} stroke="#122127" strokeWidth="1.1" />
        <circle cx="9" cy="41" r="2.7" fill={visual.skinColor} />
      </g>
      <g className="world-character-arm world-character-arm-right">
        <rect x="24" y="25" width="6" height="17" rx="3" fill={visual.topColor} stroke="#122127" strokeWidth="1.1" />
        <circle cx="27" cy="41" r="2.7" fill={visual.skinColor} />
      </g>
      <path className="world-character-torso" d={torsoPath} fill={visual.topColor} stroke="#122127" strokeWidth="1.3" />
      <path d="M12 39h12" stroke={visual.accentColor} strokeWidth="1.3" opacity=".6" />
      <rect x="15" y="19" width="6" height="6" rx="2" fill={visual.skinColor} />
      <circle cx={side ? 19 : 18} cy="14" r="9" fill={visual.skinColor} stroke="#122127" strokeWidth="1.3" />
      <Hair visual={visual} rear={rear} side={side} />
      {!rear && (
        <>
          {side ? <circle cx="24" cy="13" r="1.15" fill="#182125" /> : <><circle cx="15" cy="13" r="1.05" fill="#182125" /><circle cx="21" cy="13" r="1.05" fill="#182125" /></>}
          <path d={side ? 'M24 17q-2 1-3 0' : 'M15 18q3 2 6 0'} fill="none" stroke="#754e42" strokeWidth=".9" strokeLinecap="round" opacity=".75" />
        </>
      )}
    </g>
  );
}

function Hair({ visual, rear, side }: { visual: WorldCharacterVisual; rear: boolean; side: boolean }) {
  if (visual.hairStyle === 'bald') return null;
  if (visual.hairStyle === 'crop') return <path d="M10 13Q10 4 18 4Q27 5 27 13Q23 9 18 9Q14 9 10 13Z" fill={visual.hairColor} />;
  if (visual.hairStyle === 'short') return <path d="M9 14Q9 3 18 3Q28 4 28 14L25 11Q21 7 15 8L10 14Z" fill={visual.hairColor} />;
  if (visual.hairStyle === 'bun') return <><circle cx={rear ? 18 : 25} cy="5" r="4" fill={visual.hairColor} /><path d="M9 15Q9 3 18 3Q28 4 28 16L25 13Q21 8 14 9L10 16Z" fill={visual.hairColor} /></>;
  return <path d={side ? 'M9 15Q9 3 18 3Q29 4 28 17L27 28L22 24L21 10Q15 8 11 16L12 29L8 26Z' : 'M9 15Q9 3 18 3Q28 4 28 16L27 29L23 27L22 11Q18 8 13 11L13 27L9 29Z'} fill={visual.hairColor} />;
}

function numeric(value: unknown, fallback: number) { return typeof value === 'number' && Number.isFinite(value) ? value : fallback; }
function text(value: unknown, fallback: string) { return typeof value === 'string' && value.trim() ? value : fallback; }
function palette<const T extends readonly string[]>(values: T, index: number): string { return values[Math.abs(Math.round(index)) % values.length] ?? values[0]!; }
function normalizeHair(value: string): WorldHairStyle {
  const normalized = value.toLowerCase();
  if (normalized.includes('bald')) return 'bald';
  if (normalized.includes('bun') || normalized.includes('updo')) return 'bun';
  if (normalized.includes('long') || normalized.includes('ponytail')) return 'long';
  if (normalized.includes('crop') || normalized.includes('buzz')) return 'crop';
  return 'short';
}
function colorFromRecords(records: Array<Record<string, unknown>>, keys: string[]) {
  for (const record of records) for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) return value;
  }
  return null;
}
function hash(seed: string) {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}
