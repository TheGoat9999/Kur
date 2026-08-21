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
  const appearance: Record<string, unknown> = recipe?.appearance ?? {};
  const grooming: Record<string, unknown> = recipe?.grooming ?? {};
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
      <svg className="world-character-svg" viewBox="0 0 40 72" role="presentation">
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
  const flip = direction === 'west' ? 'translate(40 0) scale(-1 1)' : undefined;
  const female = visual.body === 'female';
  const torsoPath = side
    ? 'M14 28Q20 25 25 29L26 47Q21 50 15 47Z'
    : female
      ? 'M10 29Q20 24 30 29L28 47Q20 51 12 47Z'
      : 'M9 29Q20 24 31 29L29 48Q20 51 11 48Z';

  return (
    <g transform={flip}>
      <ellipse cx="20" cy="67" rx="11" ry="2.7" fill="#061013" opacity=".36" />

      <g className="world-character-leg world-character-leg-left">
        <path d="M12 46Q15 45 18 47L18 62Q16 65 12 62Z" fill={visual.bottomColor} stroke="#112127" strokeWidth="1.15" />
        <path d="M10.5 61.5Q15 60.5 18.5 62L18 67H10Z" fill={visual.shoeColor} stroke="#0d171a" strokeWidth=".8" />
      </g>
      <g className="world-character-leg world-character-leg-right">
        <path d="M22 47Q25 45 28 46L29 62Q27 65 23 62Z" fill={visual.bottomColor} stroke="#112127" strokeWidth="1.15" />
        <path d="M22 62Q26 60.5 30 62L30.5 67H22Z" fill={visual.shoeColor} stroke="#0d171a" strokeWidth=".8" />
      </g>

      <g className="world-character-arm world-character-arm-left">
        <path d={side ? 'M11 29Q14 28 16 31L14 47Q11 50 9 46Z' : 'M7 30Q10 27 13 30L12 47Q10 51 7 48Z'} fill={visual.topColor} stroke="#112127" strokeWidth="1" />
        <ellipse cx={side ? 11.5 : 9.5} cy="48" rx="2.2" ry="2.6" fill={visual.skinColor} />
      </g>
      <g className="world-character-arm world-character-arm-right">
        <path d={side ? 'M24 29Q27 28 29 31L30 47Q28 50 25 47Z' : 'M27 30Q30 27 33 30L33 48Q30 51 28 47Z'} fill={visual.topColor} stroke="#112127" strokeWidth="1" />
        <ellipse cx={side ? 28 : 30.5} cy="48" rx="2.2" ry="2.6" fill={visual.skinColor} />
      </g>

      <path className="world-character-torso" d={torsoPath} fill={visual.topColor} stroke="#112127" strokeWidth="1.25" />
      <path d={side ? 'M16 31Q20 29 24 31' : 'M13 31Q20 28 27 31'} fill="none" stroke="#dfe8e7" strokeOpacity=".13" strokeWidth="1" />
      <path d={side ? 'M15 45h11' : 'M12 46h16'} stroke={visual.accentColor} strokeWidth="1.05" opacity=".52" />
      {!side && <path d="M20 29v18" stroke="#09191e" strokeOpacity=".22" strokeWidth=".9" />}

      <path d="M17 23Q20 21 23 23L23 29Q20 31 17 29Z" fill={visual.skinColor} stroke="#142429" strokeWidth=".7" />
      <ellipse cx={side ? 21 : 20} cy="15.5" rx={side ? 6.5 : 7.2} ry="8.4" fill={visual.skinColor} stroke="#112127" strokeWidth="1.1" />
      {side && <ellipse cx="15.2" cy="16" rx="1.25" ry="1.8" fill={visual.skinColor} stroke="#112127" strokeWidth=".65" />}
      {!side && <><ellipse cx="12.9" cy="16" rx="1.05" ry="1.6" fill={visual.skinColor} /><ellipse cx="27.1" cy="16" rx="1.05" ry="1.6" fill={visual.skinColor} /></>}

      <Hair visual={visual} rear={rear} side={side} />

      {!rear && (
        <g>
          {side ? (
            <>
              <path d="M22.4 14.3l2.1 1-2 1" fill="none" stroke="#885b4e" strokeWidth=".75" strokeLinecap="round" />
              <circle cx="23.8" cy="13" r=".85" fill="#1a2325" />
              <path d="M22.5 19q2 .8 3.3-.4" fill="none" stroke="#774f45" strokeWidth=".75" strokeLinecap="round" />
            </>
          ) : (
            <>
              <path d="M15.7 12.6q2-1 3.5 0M20.8 12.6q2-1 3.5 0" fill="none" stroke={visual.hairColor} strokeOpacity=".55" strokeWidth=".7" strokeLinecap="round" />
              <circle cx="17.4" cy="14" r=".82" fill="#1a2325" /><circle cx="22.6" cy="14" r=".82" fill="#1a2325" />
              <path d="M20 14.5l-.7 3 1.6.3" fill="none" stroke="#936659" strokeWidth=".65" strokeLinecap="round" />
              <path d="M17.2 19.3q2.8 1.6 5.6 0" fill="none" stroke="#754b43" strokeWidth=".75" strokeLinecap="round" />
            </>
          )}
        </g>
      )}
    </g>
  );
}

function Hair({ visual, rear, side }: { visual: WorldCharacterVisual; rear: boolean; side: boolean }) {
  if (visual.hairStyle === 'bald') return null;
  if (visual.hairStyle === 'crop') return <path d={side ? 'M14 15Q14 7 21 7Q28 8 28 14L24 11Q20 10 16 13Z' : 'M12.5 15Q12.5 6.5 20 6.5Q28 7 27.5 15Q23 11.3 20 11.2Q16 11 12.5 15Z'} fill={visual.hairColor} />;
  if (visual.hairStyle === 'short') return <path d={side ? 'M13.5 16Q13.5 5.5 21 5.5Q29 6 29 15L26 12Q22 8.5 16.5 11L14 17Z' : 'M12 16Q12 5 20 5Q29 5.5 28 16L25 12Q21 8 15.5 11L12.5 17Z'} fill={visual.hairColor} />;
  if (visual.hairStyle === 'bun') return <><circle cx={rear ? 20 : side ? 26.5 : 26} cy="5" r="3.7" fill={visual.hairColor} /><path d={side ? 'M13 17Q13 5 21 5Q29 6 29 17L26 13Q21 8 16 11L14 18Z' : 'M12 17Q12 5 20 5Q29 5 28 17L25 13Q21 8 15 11L13 18Z'} fill={visual.hairColor} /></>;
  return <path d={side ? 'M13 16Q13 5 21 5Q30 6 29 18L28 32L24 29L23 12Q18 9 15 16L16 33L12 30Z' : 'M12 16Q12 5 20 5Q29 5 28 17L28 34L24 31L23 12Q20 9 16 12L16 31L12 34Z'} fill={visual.hairColor} />;
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
