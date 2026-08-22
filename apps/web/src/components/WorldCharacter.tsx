import type { CharacterRecipe } from '@sol-dorado/contracts';
import './world-character-v2.css';

export type WorldCharacterDirection = 'north' | 'south' | 'east' | 'west';
export type WorldHairStyle = 'bald' | 'buzz' | 'crop' | 'fade' | 'short' | 'bob' | 'long' | 'braid' | 'ponytail' | 'bun' | 'afro';
export type WorldFaceStyle = 'soft' | 'angular' | 'round' | 'long';
export type WorldBeardStyle = 'none' | 'stubble' | 'goatee' | 'short' | 'full';
export type WorldTopStyle = 'tee' | 'shirt' | 'tank' | 'hoodie' | 'uniform';
export type WorldOuterStyle = 'none' | 'jacket' | 'denim' | 'suit' | 'vest';
export type WorldBottomStyle = 'jeans' | 'trousers' | 'shorts' | 'skirt' | 'work';
export type WorldShoeStyle = 'sneakers' | 'boots' | 'dress';
export type WorldTattooStyle = 'none' | 'arm-band' | 'forearm-lines' | 'neck-mark' | 'sleeve';
export type WorldAccessoryStyle = 'none' | 'glasses' | 'sunglasses' | 'necklace';
export type WorldHeadwearStyle = 'none' | 'cap' | 'beanie' | 'fedora';
export type WorldBuild = 'slim' | 'average' | 'broad';

export interface WorldCharacterVisual {
  body: 'male' | 'female';
  build: WorldBuild;
  skinColor: string;
  eyeColor: string;
  hairColor: string;
  hairStyle: WorldHairStyle;
  faceStyle: WorldFaceStyle;
  beardStyle: WorldBeardStyle;
  topColor: string;
  topStyle: WorldTopStyle;
  outerColor: string;
  outerStyle: WorldOuterStyle;
  bottomColor: string;
  bottomStyle: WorldBottomStyle;
  shoeColor: string;
  shoeStyle: WorldShoeStyle;
  tattooStyle: WorldTattooStyle;
  accessoryStyle: WorldAccessoryStyle;
  headwearStyle: WorldHeadwearStyle;
  accentColor: string;
}

const SKIN_TONES = ['#f0c6a0', '#ddb086', '#c98e65', '#a96f4f', '#7d4f38', '#553628', '#3d271f'] as const;
const HAIR_COLORS = ['#151311', '#2a211c', '#3b2920', '#624334', '#784233', '#a46a42', '#bda372', '#d4cdbc', '#73777a'] as const;
const EYE_COLORS = ['#38261d', '#5d4938', '#7a653d', '#4f6951', '#4b6f86', '#69767b'] as const;
const TOP_COLORS = ['#315e6b', '#66516e', '#436957', '#765943', '#455476', '#6b4f47', '#53646a'] as const;
const OUTER_COLORS = ['#28383e', '#3f3432', '#31444b', '#45404a', '#29302f', '#4b4339'] as const;
const BOTTOM_COLORS = ['#263b45', '#32343c', '#40454b', '#353d34', '#292e3d', '#4c4039'] as const;
const SHOE_COLORS = ['#171d20', '#262324', '#35302d', '#e3e0da'] as const;
const ACCENT_COLORS = ['#d7b66e', '#6aa9b8', '#a66f73', '#72906e', '#b38fbd'] as const;

const SKIN_BY_ID: Record<string, string> = {
  'light-neutral': '#c9967d', 'light-warm': '#bd856d', 'warm-medium': '#aa715b', 'medium-neutral': '#97614e',
  'medium-deep': '#7d4d3d', 'deep-warm': '#633b2f', 'deep-neutral': '#4c2f29', dark: '#38231f'
};
const HAIR_BY_ID: Record<string, string> = {
  black: '#151311', 'soft-black': '#27211d', 'dark-brown': '#3c2b22', brown: '#644334', auburn: '#754032',
  copper: '#9a5d3a', blonde: '#b89a65', platinum: '#d0c8b5', gray: '#777b7d'
};
const EYE_BY_ID: Record<string, string> = {
  'dark-brown': '#38261d', brown: '#5d4938', hazel: '#7a653d', amber: '#8b652d', green: '#4f6951', blue: '#4b6f86', gray: '#69767b'
};

const HAIR_STYLES: WorldHairStyle[] = ['buzz', 'crop', 'fade', 'short', 'bob', 'long', 'braid', 'ponytail', 'bun', 'afro', 'bald'];
const FACE_STYLES: WorldFaceStyle[] = ['soft', 'angular', 'round', 'long'];
const TOP_STYLES: WorldTopStyle[] = ['tee', 'shirt', 'tank', 'hoodie'];
const OUTER_STYLES: WorldOuterStyle[] = ['none', 'none', 'jacket', 'denim', 'vest', 'suit'];
const BOTTOM_STYLES: WorldBottomStyle[] = ['jeans', 'trousers', 'work', 'shorts'];
const TATTOO_STYLES: WorldTattooStyle[] = ['none', 'none', 'none', 'arm-band', 'forearm-lines', 'neck-mark', 'sleeve'];
const ACCESSORY_STYLES: WorldAccessoryStyle[] = ['none', 'none', 'none', 'glasses', 'sunglasses', 'necklace'];
const HEADWEAR_STYLES: WorldHeadwearStyle[] = ['none', 'none', 'none', 'none', 'cap', 'beanie'];

export function visualFromCharacterRecipe(recipe: CharacterRecipe | null | undefined): WorldCharacterVisual {
  const appearance = record(recipe?.appearance);
  const grooming = record(recipe?.grooming);
  const equipped = record(grooming.equipped);
  const morphs = recipe?.morphs ?? {};
  const faceMorphs = recipe?.faceMorphs ?? {};
  const body = recipe?.body ?? 'male';
  const topAsset = text(equipped.torsoInner, '');
  const outerAsset = text(equipped.torsoOuter, '');
  const legAsset = text(equipped.legs, '');
  const feetAsset = text(equipped.feet, '');
  const faceAsset = text(equipped.face, '');
  const accessoryAsset = text(equipped.accessory, '');
  const headAsset = text(equipped.head, '');

  return {
    body,
    build: normalizeBuild(number(morphs.shoulders, number(appearance.muscle, 0))),
    skinColor: resolveNamedColor(appearance.skinTone, SKIN_BY_ID, SKIN_TONES, 2),
    eyeColor: resolveNamedColor(appearance.eyeColor, EYE_BY_ID, EYE_COLORS, 1),
    hairColor: resolveNamedColor(grooming.hairColor, HAIR_BY_ID, HAIR_COLORS, 2),
    hairStyle: normalizeHair(text(grooming.hairStyle, body === 'female' ? 'long01' : 'short01')),
    faceStyle: normalizeFace(text(appearance.faceStyle, ''), faceMorphs),
    beardStyle: normalizeBeard(text(grooming.beardStyle, text(appearance.beardStyle, 'none')), body),
    topColor: colorFromRecords([grooming, appearance], ['topColor', 'shirtColor', 'upperColor']) ?? (body === 'female' ? '#655776' : '#456a76'),
    topStyle: normalizeTop(text(grooming.topStyle, topAsset)),
    outerColor: colorFromRecords([grooming, appearance], ['outerColor', 'jacketColor']) ?? outfitColor(outerAsset, body),
    outerStyle: normalizeOuter(text(grooming.outerStyle, outerAsset)),
    bottomColor: colorFromRecords([grooming, appearance], ['bottomColor', 'pantsColor', 'lowerColor']) ?? outfitBottomColor(legAsset || outerAsset),
    bottomStyle: normalizeBottom(text(grooming.bottomStyle, legAsset || outerAsset), body),
    shoeColor: colorFromRecords([grooming, appearance], ['shoeColor', 'shoesColor']) ?? '#202326',
    shoeStyle: normalizeShoes(text(grooming.shoeStyle, feetAsset)),
    tattooStyle: normalizeTattoo(firstText(appearance.tattooStyle, grooming.tattooStyle, appearance.tattoos, grooming.tattoos)),
    accessoryStyle: normalizeAccessory(firstText(grooming.accessoryStyle, faceAsset, accessoryAsset)),
    headwearStyle: normalizeHeadwear(firstText(grooming.headwearStyle, headAsset)),
    accentColor: colorFromRecords([grooming, appearance], ['accentColor']) ?? '#d7b66e'
  };
}

export function visualFromSeed(seed: string): WorldCharacterVisual {
  const value = hash(seed);
  const body: 'male' | 'female' = value % 2 === 0 ? 'male' : 'female';
  const outerStyle = OUTER_STYLES[(value >>> 17) % OUTER_STYLES.length] ?? 'none';
  const tattooStyle = TATTOO_STYLES[(value >>> 21) % TATTOO_STYLES.length] ?? 'none';
  return {
    body,
    build: (['slim', 'average', 'average', 'broad'] as const)[(value >>> 2) % 4] ?? 'average',
    skinColor: SKIN_TONES[(value >>> 4) % SKIN_TONES.length] ?? SKIN_TONES[2],
    eyeColor: EYE_COLORS[(value >>> 7) % EYE_COLORS.length] ?? EYE_COLORS[1],
    hairColor: HAIR_COLORS[(value >>> 10) % HAIR_COLORS.length] ?? HAIR_COLORS[1],
    hairStyle: HAIR_STYLES[(value >>> 13) % HAIR_STYLES.length] ?? 'short',
    faceStyle: FACE_STYLES[(value >>> 16) % FACE_STYLES.length] ?? 'soft',
    beardStyle: body === 'male' ? (['none', 'none', 'stubble', 'goatee', 'short', 'full'] as const)[(value >>> 19) % 6] ?? 'none' : 'none',
    topColor: TOP_COLORS[(value >>> 5) % TOP_COLORS.length] ?? TOP_COLORS[0],
    topStyle: TOP_STYLES[(value >>> 9) % TOP_STYLES.length] ?? 'tee',
    outerColor: OUTER_COLORS[(value >>> 12) % OUTER_COLORS.length] ?? OUTER_COLORS[0],
    outerStyle,
    bottomColor: BOTTOM_COLORS[(value >>> 15) % BOTTOM_COLORS.length] ?? BOTTOM_COLORS[0],
    bottomStyle: body === 'female' && ((value >>> 24) % 8 === 0) ? 'skirt' : BOTTOM_STYLES[(value >>> 23) % BOTTOM_STYLES.length] ?? 'jeans',
    shoeColor: SHOE_COLORS[(value >>> 26) % SHOE_COLORS.length] ?? SHOE_COLORS[0],
    shoeStyle: (['sneakers', 'sneakers', 'boots', 'dress'] as const)[(value >>> 27) % 4] ?? 'sneakers',
    tattooStyle,
    accessoryStyle: ACCESSORY_STYLES[(value >>> 20) % ACCESSORY_STYLES.length] ?? 'none',
    headwearStyle: HEADWEAR_STYLES[(value >>> 25) % HEADWEAR_STYLES.length] ?? 'none',
    accentColor: ACCENT_COLORS[(value >>> 28) % ACCENT_COLORS.length] ?? ACCENT_COLORS[0]
  };
}

export function WorldCharacter({ visual, direction = 'south', moving = false, className = '' }: {
  visual: WorldCharacterVisual;
  direction?: WorldCharacterDirection;
  moving?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`world-character world-character-v2 world-character-${direction} ${moving ? 'world-character-moving' : ''} ${className}`.trim()}
      data-character-body={visual.body}
      data-character-build={visual.build}
      data-character-hair={visual.hairStyle}
      data-character-outfit={visual.outerStyle === 'none' ? visual.topStyle : visual.outerStyle}
      aria-hidden="true"
    >
      <svg className="world-character-svg" viewBox="0 0 96 160" preserveAspectRatio="xMidYMid meet" role="presentation">
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
  const flip = direction === 'west' ? 'translate(96 0) scale(-1 1)' : undefined;
  const shoulder = visual.build === 'broad' ? 5 : visual.build === 'slim' ? -3 : 0;
  const female = visual.body === 'female';

  return (
    <g transform={flip}>
      <ellipse cx="48" cy="153" rx={visual.build === 'broad' ? 25 : 22} ry="5.2" fill="#03090b" opacity=".42" />
      <HairBack visual={visual} side={side} rear={rear} />
      <Legs visual={visual} side={side} female={female} />
      <Arms visual={visual} side={side} shoulder={shoulder} rear={rear} />
      <g className="world-character-v2-body">
        <Torso visual={visual} side={side} female={female} shoulder={shoulder} rear={rear} />
        <OuterLayer visual={visual} side={side} female={female} shoulder={shoulder} rear={rear} />
        <NeckAndHead visual={visual} side={side} rear={rear} />
      </g>
      <HairFront visual={visual} side={side} rear={rear} />
      {!rear && <Face visual={visual} side={side} />}
      {!rear && <Beard visual={visual} side={side} />}
      <Accessory visual={visual} side={side} rear={rear} />
      <Headwear visual={visual} side={side} rear={rear} />
    </g>
  );
}

function Legs({ visual, side, female }: { visual: WorldCharacterVisual; side: boolean; female: boolean }) {
  const shorts = visual.bottomStyle === 'shorts';
  const skirt = visual.bottomStyle === 'skirt';
  const work = visual.bottomStyle === 'work';
  const trouserStroke = work ? '#182227' : '#152229';
  const leftLeg = side ? 'M39 101C43 99 47 100 50 103L49 140C47 145 41 145 38 141L36 111Z' : 'M29 99C35 97 43 98 46 102L44 140C41 145 34 145 31 141L27 109Z';
  const rightLeg = side ? 'M48 102C53 99 58 101 60 105L62 141C59 146 53 146 50 141L47 111Z' : 'M50 102C54 98 62 98 67 101L68 140C65 145 58 145 55 141L51 109Z';
  const skinStart = shorts ? 118 : 140;
  return <>
    {skirt && <path d={side ? 'M36 96Q49 91 60 98L64 119Q50 123 35 118Z' : female ? 'M26 94Q48 88 70 95L66 119Q48 124 30 119Z' : 'M28 95Q48 91 68 96L66 119Q48 122 30 119Z'} fill={visual.bottomColor} stroke="#132126" strokeWidth="2" />}
    <g className="world-character-v2-leg-left">
      <path d={leftLeg} fill={shorts || skirt ? visual.skinColor : visual.bottomColor} stroke={trouserStroke} strokeWidth="2" />
      {(shorts || skirt) && <path d={side ? 'M37 100Q43 98 50 102L50 117Q43 120 37 116Z' : 'M28 99Q36 96 46 101L45 117Q35 120 29 116Z'} fill={visual.bottomColor} stroke={trouserStroke} strokeWidth="1.5" />}
      <Shoe visual={visual} x={side ? 36 : 28} y={139} side={side} left />
    </g>
    <g className="world-character-v2-leg-right">
      <path d={rightLeg} fill={shorts || skirt ? visual.skinColor : visual.bottomColor} stroke={trouserStroke} strokeWidth="2" />
      {(shorts || skirt) && <path d={side ? 'M48 101Q55 98 60 104L61 118Q54 121 49 117Z' : 'M51 101Q59 97 67 101L68 117Q59 120 52 117Z'} fill={visual.bottomColor} stroke={trouserStroke} strokeWidth="1.5" />}
      <Shoe visual={visual} x={side ? 50 : 53} y={139} side={side} />
    </g>
    {!skirt && !shorts && visual.bottomStyle === 'jeans' && <>
      <path d="M31 121L42 121" stroke="#7e8a91" strokeWidth="1" opacity=".22" />
      {!side && <path d="M55 121L66 121" stroke="#7e8a91" strokeWidth="1" opacity=".22" />}
    </>}
    {(shorts || skirt) && <path d={`M35 ${skinStart}h0`} stroke="transparent" />}
  </>;
}

function Shoe({ visual, x, y, side, left = false }: { visual: WorldCharacterVisual; x: number; y: number; side: boolean; left?: boolean }) {
  const boot = visual.shoeStyle === 'boots';
  const dress = visual.shoeStyle === 'dress';
  if (side) return <path d={`M${x} ${boot ? y - 5 : y}Q${x + 8} ${y - 2} ${x + 16} ${y + 2}L${x + 17} ${y + 8}Q${x + 8} ${y + 10} ${x} ${y + 6}Z`} fill={visual.shoeColor} stroke="#0b1518" strokeWidth="1.5" />;
  const width = dress ? 15 : 18;
  const x2 = left ? x - 1 : x;
  return <path d={`M${x2} ${boot ? y - 5 : y}Q${x2 + width * .42} ${y - 2} ${x2 + width - 2} ${y + 1}L${x2 + width} ${y + 8}Q${x2 + width * .45} ${y + 11} ${x2} ${y + 7}Z`} fill={visual.shoeColor} stroke="#0b1518" strokeWidth="1.5" />;
}

function Arms({ visual, side, shoulder, rear }: { visual: WorldCharacterVisual; side: boolean; shoulder: number; rear: boolean }) {
  const longSleeve = visual.topStyle === 'hoodie' || visual.topStyle === 'shirt' || visual.topStyle === 'uniform' || visual.outerStyle !== 'none';
  const sleeveColor = visual.outerStyle === 'none' ? visual.topColor : visual.outerColor;
  const leftPath = side ? 'M31 60C35 55 40 56 42 62L38 92C36 99 29 98 27 92Z' : `M${22 - shoulder} 60C${27 - shoulder} 53 ${33 - shoulder} 55 ${35 - shoulder} 62L${31 - shoulder} 93C${28 - shoulder} 100 ${21 - shoulder} 98 ${20 - shoulder} 91Z`;
  const rightPath = side ? 'M56 61C60 56 66 58 67 64L72 92C70 99 63 99 60 93Z' : `M${61 + shoulder} 62C${63 + shoulder} 55 ${70 + shoulder} 53 ${75 + shoulder} 60L${76 + shoulder} 91C${75 + shoulder} 98 ${68 + shoulder} 100 ${65 + shoulder} 93Z`;
  return <>
    <g className="world-character-v2-arm-left">
      <path d={leftPath} fill={longSleeve ? sleeveColor : visual.skinColor} stroke="#112126" strokeWidth="2" />
      {!longSleeve && <path d={side ? 'M29 61Q36 57 41 62L39 76Q34 79 29 75Z' : `M${21 - shoulder} 61Q${28 - shoulder} 54 ${35 - shoulder} 62L${33 - shoulder} 76Q${27 - shoulder} 80 ${21 - shoulder} 74Z`} fill={visual.topColor} stroke="#112126" strokeWidth="1.5" />}
      <Tattoo visual={visual} side={side} arm="left" />
      <ellipse cx={side ? 32 : 26 - shoulder} cy="94" rx="4.3" ry="5" fill={visual.skinColor} stroke="#112126" strokeWidth="1" />
    </g>
    <g className="world-character-v2-arm-right">
      <path d={rightPath} fill={longSleeve ? sleeveColor : visual.skinColor} stroke="#112126" strokeWidth="2" />
      {!longSleeve && <path d={side ? 'M57 62Q62 58 67 64L69 77Q64 80 59 76Z' : `M${61 + shoulder} 62Q${68 + shoulder} 54 ${75 + shoulder} 61L${75 + shoulder} 75Q${68 + shoulder} 80 ${62 + shoulder} 76Z`} fill={visual.topColor} stroke="#112126" strokeWidth="1.5" />}
      <Tattoo visual={visual} side={side} arm="right" />
      <ellipse cx={side ? 68 : 71 + shoulder} cy="94" rx="4.3" ry="5" fill={visual.skinColor} stroke="#112126" strokeWidth="1" />
    </g>
    {rear && visual.outerStyle === 'vest' && <path d="M41 62h14" stroke={visual.accentColor} strokeWidth="2" opacity=".55" />}
  </>;
}

function Torso({ visual, side, female, shoulder, rear }: { visual: WorldCharacterVisual; side: boolean; female: boolean; shoulder: number; rear: boolean }) {
  const path = side
    ? 'M36 55Q48 49 58 57L60 103Q49 109 36 103L34 65Z'
    : female
      ? `M${29 - shoulder} 58Q48 48 ${67 + shoulder} 58L${63 + shoulder} 103Q48 110 ${33 - shoulder} 103Z`
      : `M${27 - shoulder} 57Q48 47 ${69 + shoulder} 57L${66 + shoulder} 104Q48 109 ${30 - shoulder} 104Z`;
  return <>
    <path d={path} fill={visual.topColor} stroke="#112126" strokeWidth="2.2" />
    {visual.topStyle === 'hoodie' && <>
      <path d={side ? 'M39 59Q48 51 57 59L54 69Q48 64 41 69Z' : 'M35 59Q48 49 61 59L58 69Q48 63 38 69Z'} fill="#0c181c" opacity=".24" />
      {!rear && <path d={side ? 'M50 62v15' : 'M48 62v18'} stroke="#e4ecec" strokeWidth="1.2" opacity=".28" />}
    </>}
    {visual.topStyle === 'shirt' && !rear && <>
      <path d={side ? 'M43 57L49 66L55 58' : 'M37 57L48 68L59 57'} fill="none" stroke="#e8eeee" strokeWidth="1.4" opacity=".36" />
      <path d="M48 68v31" stroke="#101b1f" strokeWidth="1.2" opacity=".28" />
      <circle cx="48" cy="77" r="1" fill="#e8eeee" opacity=".35" /><circle cx="48" cy="86" r="1" fill="#e8eeee" opacity=".35" />
    </>}
    {visual.topStyle === 'tank' && <path d={side ? 'M39 55Q48 51 56 58L54 65Q49 60 42 65Z' : 'M35 55Q48 49 61 56L57 67Q48 61 39 67Z'} fill={visual.skinColor} opacity=".72" />}
    {visual.topStyle === 'uniform' && <>
      <path d="M39 65h18" stroke={visual.accentColor} strokeWidth="2" opacity=".7" />
      {!rear && <rect x="52" y="70" width="7" height="5" rx="1" fill={visual.accentColor} opacity=".55" />}
    </>}
    {!rear && visual.outerStyle === 'none' && <path d={side ? 'M38 97h20' : 'M32 98h32'} stroke="#071316" strokeWidth="1.5" opacity=".3" />}
  </>;
}

function OuterLayer({ visual, side, female, shoulder, rear }: { visual: WorldCharacterVisual; side: boolean; female: boolean; shoulder: number; rear: boolean }) {
  if (visual.outerStyle === 'none') return null;
  const path = side
    ? 'M34 57Q48 48 61 58L61 103Q50 111 34 103L33 68Z'
    : female
      ? `M${27 - shoulder} 58Q48 46 ${69 + shoulder} 58L${65 + shoulder} 104Q48 112 ${31 - shoulder} 104Z`
      : `M${25 - shoulder} 56Q48 45 ${71 + shoulder} 56L${68 + shoulder} 105Q48 111 ${28 - shoulder} 105Z`;
  const opacity = visual.outerStyle === 'vest' ? .94 : 1;
  return <g opacity={opacity}>
    <path d={path} fill={visual.outerColor} stroke="#101e23" strokeWidth="2.2" />
    {visual.outerStyle === 'jacket' && !rear && <>
      <path d={side ? 'M45 57L50 69L57 59' : 'M34 57L47 70L61 57'} fill="none" stroke="#d7e0e1" strokeWidth="1.4" opacity=".32" />
      <path d="M48 69v33" stroke="#071216" strokeWidth="1.4" opacity=".34" />
      <path d="M34 86h8M55 86h8" stroke="#d7e0e1" strokeWidth="1" opacity=".22" />
    </>}
    {visual.outerStyle === 'denim' && <>
      <path d={side ? 'M36 69h23M36 91h24' : 'M29 69h38M30 91h36'} stroke="#aab8bd" strokeWidth="1.1" opacity=".28" />
      {!rear && <path d="M48 58v46" stroke="#aab8bd" strokeWidth="1" opacity=".26" />}
      {!rear && <rect x="34" y="74" width="9" height="8" rx="1.2" fill="none" stroke="#aab8bd" strokeWidth="1" opacity=".28" />}
    </>}
    {visual.outerStyle === 'suit' && !rear && <>
      <path d={side ? 'M41 57L49 73L57 59' : 'M33 57L46 75L48 67L51 75L63 57'} fill="none" stroke="#e0e6e6" strokeWidth="1.4" opacity=".38" />
      <path d="M48 68v35" stroke="#091417" strokeWidth="1.25" opacity=".38" />
      <path d="M45 61h6l-3 9z" fill={visual.accentColor} opacity=".75" />
    </>}
    {visual.outerStyle === 'vest' && <>
      <path d={side ? 'M37 61L42 71M57 61L53 71' : 'M32 60L39 72M64 60L57 72'} stroke="#d7e0e1" strokeWidth="1.2" opacity=".35" />
      {!rear && <path d="M48 59v44" stroke="#0b171b" strokeWidth="1.1" opacity=".32" />}
    </>}
  </g>;
}

function NeckAndHead({ visual, side, rear }: { visual: WorldCharacterVisual; side: boolean; rear: boolean }) {
  const headPath = facePath(visual.faceStyle, side);
  return <g className="world-character-v2-head">
    <path d={side ? 'M43 49Q48 45 53 49L54 58Q48 62 42 58Z' : 'M42 47Q48 44 54 47L54 58Q48 62 42 58Z'} fill={visual.skinColor} stroke="#122126" strokeWidth="1.2" />
    <path d={headPath} fill={visual.skinColor} stroke="#112126" strokeWidth="2" />
    {side ? <ellipse cx="39" cy="33" rx="3.1" ry="4.6" fill={visual.skinColor} stroke="#112126" strokeWidth="1" /> : <>
      <ellipse cx="30.7" cy="33" rx="2.7" ry="4.5" fill={visual.skinColor} stroke="#112126" strokeWidth=".8" />
      <ellipse cx="65.3" cy="33" rx="2.7" ry="4.5" fill={visual.skinColor} stroke="#112126" strokeWidth=".8" />
    </>}
    {visual.tattooStyle === 'neck-mark' && <path d={side ? 'M46 51l5 4-4 3' : 'M44 51l4 5 4-5'} fill="none" stroke="#28343b" strokeWidth="1.5" opacity=".8" />}
    {rear && <path d="M36 42Q48 49 60 42" fill="none" stroke="#754b3f" strokeWidth="1" opacity=".2" />}
  </g>;
}

function Face({ visual, side }: { visual: WorldCharacterVisual; side: boolean }) {
  const brow = visual.faceStyle === 'angular' ? visual.hairColor : '#4d332a';
  if (side) return <g>
    <path d="M55 29Q60 30 62 33L58 35" fill="none" stroke="#8f6255" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M52 27Q56 25 59 27" fill="none" stroke={brow} strokeWidth="1.5" strokeLinecap="round" />
    <ellipse cx="56" cy="30" rx="1.5" ry="1.8" fill={visual.eyeColor} /><circle cx="56.5" cy="30" r=".65" fill="#101718" />
    <path d="M57 39Q61 40 63 38" fill="none" stroke="#734a43" strokeWidth="1.2" strokeLinecap="round" />
  </g>;
  const eyeSpread = visual.faceStyle === 'long' ? 12 : 11;
  return <g>
    <path d={`M${48 - eyeSpread - 5} 27Q${48 - eyeSpread} 24 ${48 - eyeSpread + 5} 27M${48 + eyeSpread - 5} 27Q${48 + eyeSpread} 24 ${48 + eyeSpread + 5} 27`} fill="none" stroke={brow} strokeWidth="1.5" strokeLinecap="round" />
    <path d={`M${48 - eyeSpread - 4} 31Q${48 - eyeSpread} 28 ${48 - eyeSpread + 4} 31Q${48 - eyeSpread} 34 ${48 - eyeSpread - 4} 31ZM${48 + eyeSpread - 4} 31Q${48 + eyeSpread} 28 ${48 + eyeSpread + 4} 31Q${48 + eyeSpread} 34 ${48 + eyeSpread - 4} 31Z`} fill="#f1ece8" opacity=".82" />
    <ellipse cx={48 - eyeSpread} cy="31" rx="1.7" ry="2" fill={visual.eyeColor} /><ellipse cx={48 + eyeSpread} cy="31" rx="1.7" ry="2" fill={visual.eyeColor} />
    <circle cx={48 - eyeSpread} cy="31" r=".7" fill="#101718" /><circle cx={48 + eyeSpread} cy="31" r=".7" fill="#101718" />
    <path d="M48 31L45.5 39Q48 41 51 39" fill="none" stroke="#936659" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    <path d={visual.faceStyle === 'soft' ? 'M41 44Q48 48 55 44' : 'M42 44Q48 46 54 44'} fill="none" stroke="#754b43" strokeWidth="1.35" strokeLinecap="round" />
    <path d="M34 38Q37 40 39 39M57 39Q60 40 62 38" fill="none" stroke="#b97b6c" strokeWidth="1" opacity=".24" />
  </g>;
}

function Beard({ visual, side }: { visual: WorldCharacterVisual; side: boolean }) {
  if (visual.beardStyle === 'none' || visual.body === 'female') return null;
  const opacity = visual.beardStyle === 'stubble' ? .34 : .78;
  if (side) return <path d={visual.beardStyle === 'goatee' ? 'M55 39Q60 42 63 39L59 48Q55 47 53 43Z' : 'M48 37Q56 45 63 38L60 49Q52 51 47 44Z'} fill={visual.hairColor} opacity={opacity} />;
  if (visual.beardStyle === 'goatee') return <path d="M43 43Q48 47 53 43L52 51Q48 54 44 51Z" fill={visual.hairColor} opacity={opacity} />;
  if (visual.beardStyle === 'full') return <path d="M33 37Q48 50 63 37L60 50Q54 58 48 59Q41 57 36 50Z" fill={visual.hairColor} opacity={opacity} />;
  return <path d="M34 38Q48 49 62 38L59 49Q48 55 37 49Z" fill={visual.hairColor} opacity={opacity} />;
}

function HairBack({ visual, side, rear }: { visual: WorldCharacterVisual; side: boolean; rear: boolean }) {
  if (visual.hairStyle === 'bald' || visual.hairStyle === 'buzz' || visual.hairStyle === 'crop' || visual.hairStyle === 'fade' || visual.hairStyle === 'short') return null;
  if (visual.hairStyle === 'ponytail' || visual.hairStyle === 'braid') return <>
    <path d={side ? 'M34 23Q34 8 49 7Q65 8 65 26L61 45Q55 54 48 47L38 46Q32 40 34 23Z' : 'M29 24Q29 7 48 6Q68 7 67 25L64 48Q55 54 48 47Q39 54 31 47Z'} fill={visual.hairColor} stroke="#10191c" strokeWidth="1.5" />
    <path d={visual.hairStyle === 'braid' ? 'M64 34Q72 47 65 61Q72 72 65 84' : 'M63 34Q76 48 67 65'} fill="none" stroke={visual.hairColor} strokeWidth={visual.hairStyle === 'braid' ? 5 : 8} strokeLinecap="round" />
  </>;
  if (visual.hairStyle === 'long') return <path d={side ? 'M33 24Q34 7 49 7Q66 8 65 27L64 58Q56 64 48 56Q40 64 33 58Z' : 'M29 24Q29 6 48 6Q68 6 67 25L66 61Q57 66 48 58Q39 66 30 61Z'} fill={visual.hairColor} stroke="#10191c" strokeWidth="1.5" />;
  if (visual.hairStyle === 'bob') return <path d={side ? 'M33 24Q34 7 49 7Q66 8 65 26L62 48Q52 54 34 46Z' : 'M29 24Q29 6 48 6Q68 6 67 25L63 49Q48 56 32 49Z'} fill={visual.hairColor} stroke="#10191c" strokeWidth="1.5" />;
  if (visual.hairStyle === 'bun') return <circle cx={side ? 61 : rear ? 48 : 62} cy="8" r="9" fill={visual.hairColor} stroke="#10191c" strokeWidth="1.5" />;
  if (visual.hairStyle === 'afro') return <circle cx={side ? 49 : 48} cy="24" r={rear ? 25 : 23} fill={visual.hairColor} stroke="#10191c" strokeWidth="1.6" />;
  return null;
}

function HairFront({ visual, side, rear }: { visual: WorldCharacterVisual; side: boolean; rear: boolean }) {
  if (visual.hairStyle === 'bald') return null;
  const c = visual.hairColor;
  if (visual.hairStyle === 'buzz') return <path d={side ? 'M34 27Q35 12 49 11Q63 12 64 27Q57 20 48 19Q40 20 34 27Z' : 'M30 27Q31 10 48 10Q66 10 66 27Q58 19 48 19Q38 19 30 27Z'} fill={c} opacity=".92" />;
  if (visual.hairStyle === 'crop') return <path d={side ? 'M32 28Q32 9 49 8Q66 9 66 26L60 20Q48 17 37 24Z' : 'M28 28Q28 8 48 8Q69 8 68 28Q59 19 48 19Q37 19 28 28Z'} fill={c} />;
  if (visual.hairStyle === 'fade') return <>
    <path d={side ? 'M32 29Q32 12 48 9Q62 9 65 21L61 20Q50 15 38 23Z' : 'M29 29Q30 12 47 8Q64 9 68 22Q58 17 48 18Q37 18 29 29Z'} fill={c} />
    {!rear && <path d={side ? 'M33 28Q36 35 39 39' : 'M29 29Q31 37 34 40M67 29Q65 37 62 40'} fill="none" stroke={c} strokeWidth="3" opacity=".35" />}
  </>;
  if (visual.hairStyle === 'short') return <path d={side ? 'M31 28Q31 7 49 7Q68 8 67 27L61 21Q51 15 38 23L34 31Z' : 'M28 28Q28 6 48 6Q70 6 68 29L62 21Q51 14 37 22L29 31Z'} fill={c} />;
  if (visual.hairStyle === 'bun') return <path d={side ? 'M31 29Q31 8 49 7Q66 8 67 28L61 22Q50 16 37 23Z' : 'M28 29Q28 7 48 7Q69 7 68 29L62 21Q51 16 36 23Z'} fill={c} />;
  if (visual.hairStyle === 'afro') return <path d={side ? 'M29 29Q30 7 49 5Q70 7 69 31Q62 20 49 19Q37 20 29 29Z' : 'M26 30Q26 4 48 3Q72 4 71 31Q62 18 48 18Q35 18 26 30Z'} fill={c} />;
  if (visual.hairStyle === 'braid') return <path d={side ? 'M31 28Q32 7 49 7Q66 8 67 28L61 22Q50 16 37 23Z' : 'M28 29Q28 6 48 6Q69 6 68 29L62 21Q51 16 36 23Z'} fill={c} />;
  return <path d={side ? 'M31 28Q31 7 49 7Q67 8 67 29L61 22Q50 15 37 23Z' : 'M28 29Q28 6 48 6Q69 6 68 29L62 21Q51 15 36 23Z'} fill={c} />;
}

function Tattoo({ visual, side, arm }: { visual: WorldCharacterVisual; side: boolean; arm: 'left' | 'right' }) {
  if (visual.tattooStyle === 'none' || visual.tattooStyle === 'neck-mark') return null;
  const right = arm === 'right';
  const baseX = side ? (right ? 64 : 31) : (right ? 69 : 27);
  if (visual.tattooStyle === 'arm-band') return <path d={`M${baseX - 3} 82Q${baseX} 80 ${baseX + 4} 82M${baseX - 3} 85Q${baseX} 83 ${baseX + 4} 85`} fill="none" stroke="#26353b" strokeWidth="1.6" opacity=".78" />;
  if (visual.tattooStyle === 'forearm-lines') return <path d={`M${baseX - 2} 80l5 6-5 5M${baseX + 1} 78l4 5`} fill="none" stroke="#26353b" strokeWidth="1.4" opacity=".76" />;
  return <path d={`M${baseX - 3} 76q7 5 1 10q7 3 2 8M${baseX + 2} 76l-4 6 6 5-5 5`} fill="none" stroke="#26353b" strokeWidth="1.6" opacity=".82" />;
}

function Accessory({ visual, side, rear }: { visual: WorldCharacterVisual; side: boolean; rear: boolean }) {
  if (visual.accessoryStyle === 'none' || rear) return null;
  if (visual.accessoryStyle === 'necklace') return <path d={side ? 'M42 57Q48 66 55 57' : 'M39 57Q48 68 57 57'} fill="none" stroke={visual.accentColor} strokeWidth="1.6" opacity=".85" />;
  const dark = visual.accessoryStyle === 'sunglasses';
  if (side) return <>
    <rect x="51" y="27" width="9" height="6" rx="2" fill={dark ? '#12191b' : 'none'} stroke="#172126" strokeWidth="1.5" />
    <path d="M60 29h5" stroke="#172126" strokeWidth="1.5" />
  </>;
  return <>
    <rect x="31" y="27" width="13" height="7" rx="2.5" fill={dark ? '#12191b' : 'none'} stroke="#172126" strokeWidth="1.5" />
    <rect x="52" y="27" width="13" height="7" rx="2.5" fill={dark ? '#12191b' : 'none'} stroke="#172126" strokeWidth="1.5" />
    <path d="M44 30h8" stroke="#172126" strokeWidth="1.5" />
  </>;
}

function Headwear({ visual, side, rear }: { visual: WorldCharacterVisual; side: boolean; rear: boolean }) {
  if (visual.headwearStyle === 'none') return null;
  if (visual.headwearStyle === 'cap') return <>
    <path d={side ? 'M31 21Q37 7 50 7Q64 8 67 21Z' : 'M28 21Q34 6 48 6Q64 6 69 21Z'} fill={visual.outerColor} stroke="#101a1d" strokeWidth="1.6" />
    {!rear && <path d={side ? 'M54 20q13 0 18 4q-10 3-18 1z' : 'M48 20q18 0 25 5q-15 3-25 1z'} fill={visual.outerColor} stroke="#101a1d" strokeWidth="1.4" />}
  </>;
  if (visual.headwearStyle === 'beanie') return <path d={side ? 'M31 22Q33 5 49 4Q66 5 68 23L62 25H35Z' : 'M28 23Q30 4 48 3Q68 4 70 24L63 26H33Z'} fill={visual.outerColor} stroke="#101a1d" strokeWidth="1.6" />;
  return <>
    <path d={side ? 'M34 18Q37 6 49 6Q62 6 65 18Z' : 'M32 18Q36 5 48 5Q62 5 66 18Z'} fill={visual.outerColor} stroke="#101a1d" strokeWidth="1.5" />
    <path d={side ? 'M25 18Q49 15 75 20Q49 24 25 21Z' : 'M22 18Q48 14 74 18Q48 24 22 20Z'} fill={visual.outerColor} stroke="#101a1d" strokeWidth="1.5" />
  </>;
}

function facePath(style: WorldFaceStyle, side: boolean) {
  if (side) {
    if (style === 'long') return 'M36 15Q48 6 59 13Q67 20 64 34Q62 47 52 53Q41 53 35 43Q30 30 36 15Z';
    if (style === 'angular') return 'M35 16Q48 7 60 14L65 29L60 45L51 53L39 48L33 35Z';
    if (style === 'round') return 'M34 17Q48 6 61 16Q68 28 62 42Q56 52 45 52Q34 48 32 36Q30 25 34 17Z';
    return 'M35 16Q48 6 61 15Q67 26 63 39Q58 51 48 53Q37 50 33 39Q30 26 35 16Z';
  }
  if (style === 'long') return 'M31 14Q48 4 65 14Q70 25 67 40Q63 54 48 59Q33 54 29 40Q26 25 31 14Z';
  if (style === 'angular') return 'M30 15Q48 5 66 15L69 31L62 49L48 58L34 49L27 31Z';
  if (style === 'round') return 'M29 16Q48 4 67 16Q73 31 66 45Q60 56 48 57Q35 56 29 45Q23 31 29 16Z';
  return 'M30 15Q48 4 66 15Q72 29 67 43Q61 55 48 58Q35 55 29 43Q24 29 30 15Z';
}

function normalizeBuild(value: number): WorldBuild { return value > 28 ? 'broad' : value < -28 ? 'slim' : 'average'; }
function normalizeFace(value: string, faceMorphs: Record<string, number>): WorldFaceStyle {
  const normalized = value.toLowerCase();
  if (normalized.includes('angular') || normalized.includes('sharp')) return 'angular';
  if (normalized.includes('round')) return 'round';
  if (normalized.includes('long')) return 'long';
  const chin = number(faceMorphs.chinHeight, 0);
  const cheek = number(faceMorphs.cheekVolume, 0);
  return chin > 35 ? 'long' : cheek > 35 ? 'round' : number(faceMorphs.chinWidth, 0) > 35 ? 'angular' : 'soft';
}
function normalizeHair(value: string): WorldHairStyle {
  const normalized = value.toLowerCase();
  if (normalized.includes('bald')) return 'bald';
  if (normalized.includes('afro')) return 'afro';
  if (normalized.includes('braid')) return 'braid';
  if (normalized.includes('ponytail')) return 'ponytail';
  if (normalized.includes('bun') || normalized.includes('updo')) return 'bun';
  if (normalized.includes('bob')) return 'bob';
  if (normalized.includes('long')) return 'long';
  if (normalized.includes('fade')) return 'fade';
  if (normalized.includes('buzz')) return 'buzz';
  if (normalized.includes('crop')) return 'crop';
  return 'short';
}
function normalizeBeard(value: string, body: 'male' | 'female'): WorldBeardStyle {
  if (body === 'female') return 'none';
  const normalized = value.toLowerCase();
  if (normalized.includes('full')) return 'full';
  if (normalized.includes('short')) return 'short';
  if (normalized.includes('goatee')) return 'goatee';
  if (normalized.includes('stubble')) return 'stubble';
  return 'none';
}
function normalizeTop(value: string): WorldTopStyle {
  const normalized = value.toLowerCase();
  if (normalized.includes('hood')) return 'hoodie';
  if (normalized.includes('tank') || normalized.includes('sport')) return 'tank';
  if (normalized.includes('shirt') || normalized.includes('suit')) return 'shirt';
  if (normalized.includes('work') || normalized.includes('uniform')) return 'uniform';
  return 'tee';
}
function normalizeOuter(value: string): WorldOuterStyle {
  const normalized = value.toLowerCase();
  if (!normalized) return 'none';
  if (normalized.includes('elegant') || normalized.includes('suit')) return 'suit';
  if (normalized.includes('denim')) return 'denim';
  if (normalized.includes('vest')) return 'vest';
  if (normalized.includes('casual') || normalized.includes('work') || normalized.includes('jacket')) return 'jacket';
  return 'none';
}
function normalizeBottom(value: string, body: 'male' | 'female'): WorldBottomStyle {
  const normalized = value.toLowerCase();
  if (normalized.includes('short')) return 'shorts';
  if (normalized.includes('skirt') || normalized.includes('dress')) return body === 'female' ? 'skirt' : 'trousers';
  if (normalized.includes('work')) return 'work';
  if (normalized.includes('elegant') || normalized.includes('suit')) return 'trousers';
  return 'jeans';
}
function normalizeShoes(value: string): WorldShoeStyle {
  const normalized = value.toLowerCase();
  if (normalized.includes('02') || normalized.includes('boot')) return 'boots';
  if (normalized.includes('03') || normalized.includes('dress')) return 'dress';
  return 'sneakers';
}
function normalizeTattoo(value: string): WorldTattooStyle {
  const normalized = value.toLowerCase();
  if (normalized.includes('sleeve')) return 'sleeve';
  if (normalized.includes('forearm') || normalized.includes('line')) return 'forearm-lines';
  if (normalized.includes('band')) return 'arm-band';
  if (normalized.includes('neck')) return 'neck-mark';
  return 'none';
}
function normalizeAccessory(value: string): WorldAccessoryStyle {
  const normalized = value.toLowerCase();
  if (normalized.includes('sun')) return 'sunglasses';
  if (normalized.includes('glass')) return 'glasses';
  if (normalized.includes('neck') || normalized.includes('chain')) return 'necklace';
  return 'none';
}
function normalizeHeadwear(value: string): WorldHeadwearStyle {
  const normalized = value.toLowerCase();
  if (normalized.includes('fedora')) return 'fedora';
  if (normalized.includes('beanie')) return 'beanie';
  if (normalized.includes('cap')) return 'cap';
  return 'none';
}
function outfitColor(asset: string, body: 'male' | 'female') {
  const normalized = asset.toLowerCase();
  if (normalized.includes('elegant')) return body === 'female' ? '#302e35' : '#252b2f';
  if (normalized.includes('work')) return '#4a514d';
  if (normalized.includes('sport')) return '#3d4548';
  if (normalized.includes('casual')) return body === 'female' ? '#454047' : '#343b3f';
  return body === 'female' ? '#3d3941' : '#30383c';
}
function outfitBottomColor(asset: string) {
  const normalized = asset.toLowerCase();
  if (normalized.includes('elegant')) return '#25292d';
  if (normalized.includes('work')) return '#434a46';
  if (normalized.includes('sport')) return '#343b3e';
  return '#2d3b43';
}
function resolveNamedColor(value: unknown, named: Record<string, string>, paletteValues: readonly string[], fallbackIndex: number) {
  if (typeof value === 'string') {
    if (/^#[0-9a-f]{6}$/i.test(value)) return value;
    const mapped = named[value.toLowerCase()];
    if (mapped) return mapped;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return paletteValues[Math.abs(Math.round(value)) % paletteValues.length] ?? paletteValues[fallbackIndex] ?? '#888888';
  return paletteValues[fallbackIndex] ?? paletteValues[0] ?? '#888888';
}
function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
    if (Array.isArray(value)) {
      const first = value.find(item => typeof item === 'string' && item.trim());
      if (typeof first === 'string') return first;
    }
  }
  return '';
}
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function number(value: unknown, fallback: number) { return typeof value === 'number' && Number.isFinite(value) ? value : fallback; }
function text(value: unknown, fallback: string) { return typeof value === 'string' && value.trim() ? value : fallback; }
function colorFromRecords(records: Array<Record<string, unknown>>, keys: string[]) {
  for (const source of records) for (const key of keys) {
    const value = source[key];
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
