import { catalogItem } from './characterCatalog';
import type { CharacterVisualRecipeV2 } from './characterVisualRecipe';

const SKIN: Record<string, string> = {
  porcelain: 'very light neutral skin',
  'light-warm': 'light warm skin',
  'warm-medium': 'warm medium skin',
  olive: 'olive medium skin',
  'deep-warm': 'deep warm skin',
  'deep-neutral': 'deep neutral skin'
};
const EYES: Record<string, string> = {
  brown: 'brown eyes', hazel: 'hazel eyes', green: 'green eyes', blue: 'blue eyes', gray: 'gray eyes', amber: 'amber eyes'
};
const HAIR: Record<string, string> = {
  black: 'black', 'dark-brown': 'dark brown', brown: 'brown', auburn: 'auburn', blonde: 'blonde', platinum: 'platinum blonde', gray: 'gray'
};
const VIBE: Record<string, string> = {
  'street-modern': 'modern urban streetwear, confident and contemporary',
  'coastal-clean': 'clean coastal luxury, warm daylight, refined casual styling',
  'nightlife-luxe': 'premium nightlife fashion, glossy accents, dramatic city lighting',
  'utility-industrial': 'functional industrial street style, utility details, grounded materials',
  'sport-performance': 'athletic performance fashion, clean technical materials, energetic attitude',
  'old-money-modern': 'modern understated luxury, tailored silhouettes, restrained expensive materials'
};

export function buildCharacterPrompt(recipe: CharacterVisualRecipeV2, mode: 'full-body' | 'portrait' = 'full-body') {
  const a = recipe.appearance;
  const g = recipe.grooming;
  const items = [
    catalogItem('hair', g.hairStyle),
    catalogItem('facialHair', g.facialHair),
    catalogItem('top', g.top),
    catalogItem('outerwear', g.outerwear),
    catalogItem('bottoms', g.bottoms),
    catalogItem('shoes', g.shoes),
    catalogItem('eyewear', g.eyewear),
    catalogItem('headwear', g.headwear),
    catalogItem('jewelry', g.jewelry),
    catalogItem('accessory', g.accessory)
  ].filter(Boolean);

  const framing = mode === 'portrait'
    ? 'waist-up character portrait, face clearly visible, natural neutral expression, slight three-quarter camera angle'
    : 'full-body standing character, complete outfit visible head to toe, relaxed confident pose, slight three-quarter camera angle';

  return [
    'Create a premium stylized game-character illustration for SOL DORADO, an original browser/mobile persistent urban RPG.',
    'Visual direction: vibrant contemporary crime-drama promotional artwork, bold illustrated shapes, polished painterly detail, expressive but believable anatomy, saturated city color accents, cinematic rim light, clean readable silhouette, premium loading-screen key-art feeling. Do not copy any specific copyrighted game artwork or character.',
    `Character: ${recipe.body === 'female' ? 'woman' : 'man'}, ${a.ageBand} adult, ${a.bodyBuild} build, ${heightText(a.height)}, ${SKIN[a.skinTone] ?? a.skinTone}, ${a.faceShape} face shape, ${jawText(a.jaw)}, ${cheekText(a.cheekbones)}, ${a.nose} nose, ${a.lips} lips, ${a.eyeShape} eye shape, ${EYES[a.eyeColor] ?? a.eyeColor}, ${a.eyebrows} eyebrows.`,
    `Hair color: ${HAIR[g.hairColor] ?? g.hairColor}.`,
    `Wardrobe and grooming: ${items.map(item => item!.prompt).join('; ')}.`,
    `Style direction: ${VIBE[g.vibe] ?? g.vibe}. Accent color ${g.accentColor}.`,
    framing + '.',
    'Background: abstract stylized SOL DORADO city atmosphere, subtle palm silhouettes, neon and sunset gradients, graphic painted shapes; background must stay secondary to the character.',
    'Keep identity, facial proportions and body proportions stable between future variations. When only outfit or hair changes, preserve the same person.',
    'No text, no logos from real brands, no watermark, no UI, no weapon, no vehicle.'
  ].join('\n');
}

function heightText(value: number) {
  if (value < -35) return 'short stature';
  if (value > 35) return 'tall stature';
  return 'average height';
}
function jawText(value: number) {
  if (value < -25) return 'soft narrow jaw';
  if (value > 35) return 'strong broad jaw';
  return 'defined natural jaw';
}
function cheekText(value: number) {
  if (value < -25) return 'soft low cheekbones';
  if (value > 35) return 'prominent high cheekbones';
  return 'natural cheekbone definition';
}
