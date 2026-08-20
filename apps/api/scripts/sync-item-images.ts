import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORE_ITEM_CATALOG } from '../src/domain/items/index.js';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const overwrite = args.has('--overwrite');
const strict = args.has('--strict');

const RAINMAD_BASE = 'https://items.rainmad.com';
const RAINMAD_INDEX = `${RAINMAD_BASE}/api/images`;
const USER_AGENT = 'sol-dorado-item-sync/0.3';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(scriptDir, '../../web/public/assets/items');
const sourceMapPath = path.join(outputDir, '_source-map.json');

type CatalogItem = (typeof CORE_ITEM_CATALOG)[number];
type RainmadEntry = { url: string; category: string };
type RainmadIndex = { total: number; categories: string[]; images: RainmadEntry[] };
type MatchKind = 'alias' | 'exact' | 'fuzzy';
type ResolvedAsset = {
  url: string;
  source: 'rainmad';
  sourceFile: string;
  sourceCategory: string;
  match: MatchKind;
  score: number;
};

type RainmadAlias = { category: string; file: string };

/**
 * Explicit mappings are intentional visual choices for catalog names that do not
 * exist verbatim in Rainmad, plus a handful of ambiguous names where fuzzy
 * matching could select a completely unrelated image (for example taco -> vehicle).
 * Each alias is verified against Rainmad's live /api/images index before use.
 */
const RAINMAD_ALIASES: Record<string, RainmadAlias> = {
  identity_card: { category: 'license', file: 'id_card.png' },
  house_keys: { category: 'general', file: 'key-house.png' },
  vehicle_keys: { category: 'general', file: 'carkeys.png' },
  protein_bar: { category: 'food', file: 'health_bar.png' },
  strawberries: { category: 'food', file: 'strawberry.png' },
  cheese_block: { category: 'ingredients', file: 'cheese_cubes.png' },
  egg_carton: { category: 'ingredients', file: 'eggs.png' },
  taco: { category: 'food', file: 'taco_beef.png' },
  fried_chicken: { category: 'food', file: 'chicken_strips.png' },
  steak_plate: { category: 'food', file: 'steak_potato.png' },
  rice_bag: { category: 'food', file: 'rice.png' },

  large_water_bottle: { category: 'drinks', file: 'water_bottle.png' },
  energy_drink: { category: 'drinks', file: 'subdrink.png' },
  sports_drink: { category: 'drinks', file: 'burger-softdrink.png' },
  tea: { category: 'drinks', file: 'cc-tea.png' },
  orange_soda: { category: 'drinks', file: 'faygo-orange.png' },
  lemon_soda: { category: 'food', file: 'lemonade.png' },

  rubber_mallet: { category: 'materials', file: 'hammer.png' },
  socket_set: { category: 'mechanic', file: 'screwdriverset.png' },
  pliers: { category: 'mechanic', file: 'cutter.png' },
  crowbar: { category: 'weapons', file: 'weapon_crowbar.png' },
  hacksaw: { category: 'tools', file: 'tool_woodsaw.png' },
  handsaw: { category: 'tools', file: 'tool_woodsaw.png' },
  impact_driver: { category: 'mechanic', file: 'screwdriver.png' },
  soldering_iron: { category: 'mechanic', file: 'electronickit.png' },
  multimeter: { category: 'tech', file: 'electronickit-1.png' },
  headlamp: { category: 'tech', file: 'light.png' },
  flashlight: { category: 'weapons', file: 'weapon_flashlight.png' },
  axe: { category: 'tools', file: 'tool_lumber_axe.png' },

  electrical_wire: { category: 'materials', file: 'copperwire.png' },
  leather_roll: { category: 'ingredients', file: 'fabric.png' },
  leather_scraps: { category: 'materials', file: 'cloth.png' },
  screws_box: { category: 'materials', file: 'nails.png' },
  bolts_box: { category: 'materials', file: 'nails.png' },
  washers_box: { category: 'materials', file: 'nails.png' },
  adhesive: { category: 'general', file: 'duct_tape.png' },
  epoxy_resin: { category: 'materials', file: 'plastic.png' },
  paint_can: { category: 'mechanic', file: 'mechanic_paint_spray.png' },
  concrete_mix: { category: 'materials', file: 'box.png' },
  cement_bag: { category: 'materials', file: 'box.png' },
  ceramic_tile_box: { category: 'materials', file: 'box.png' },
  brick_stack: { category: 'materials', file: 'box.png' },

  smartwatch: { category: 'clothing', file: 'kq_expensive_watch.png' },
  gps_unit: { category: 'tech', file: 'garmin-gps.png' },
  external_drive: { category: 'tech', file: 'hardrive.png' },
  aa_batteries: { category: 'tech', file: 'battery_package_aaa.png' },
  microcontroller: { category: 'tech', file: 'electronickit-1.png' },
  salvaged_electronics: { category: 'tech', file: 'electronickit-2.png' },

  gauze: { category: 'medical', file: 'bandage.png' },
  antiseptic: { category: 'medical', file: 'salinebag.png' },
  cold_medicine: { category: 'medical', file: 'coldnflubox.png' },
  tourniquet: { category: 'medical', file: 'bandage.png' },
  trauma_dressing: { category: 'medical', file: 'burndressing.png' },
  surgical_mask: { category: 'medical', file: 'surgicalkit.png' },
  medical_gloves: { category: 'clothing', file: 'gloves.png' },
  thermometer: { category: 'medical', file: 'glucosemeter.png' },
  splint: { category: 'medical', file: 'bandage.png' },

  kitchen_knife: { category: 'weapons', file: 'bpknife.png' },
  pocket_knife: { category: 'weapons', file: 'weapon_knife.png' },
  baseball_bat: { category: 'weapons', file: 'bpbat.png' },
  compact_pistol: { category: 'weapons', file: 'bpsnspistol.png' },
  service_pistol: { category: 'weapons', file: 'combatpistol.png' },
  compact_smg: { category: 'weapons', file: 'bpminismg.png' },
  smg: { category: 'weapons', file: 'bpsmg.png' },
  shotgun_shells: { category: 'weapons', file: 'shotgun_ammo.png' },
  pistol_magazine: { category: 'weapons', file: 'pistol_ammopack.png' },
  rifle_magazine: { category: 'weapons', file: 'rifle_drummag.png' },
  ammo_45: { category: 'weapons', file: 'pistol_ammo.png' },
  ammo_revolver: { category: 'weapons', file: 'pistol_ammo.png' }
};

const CATEGORY_PRIORITY: Record<CatalogItem['category'], readonly string[]> = {
  personal: ['general', 'license', 'tech', 'misc', 'activities', 'clothing'],
  food: ['food', 'ingredients'],
  drink: ['drinks', 'food'],
  tool: ['tools', 'mechanic', 'mining', 'materials', 'general', 'illegal', 'hunting', 'weapons', 'tech'],
  material: ['materials', 'mechanic', 'mining', 'ingredients', 'general'],
  electronics: ['tech', 'mechanic', 'materials', 'general', 'police'],
  medical: ['medical', 'tools', 'general', 'police', 'clothing'],
  weapon: ['weapons', 'police', 'illegal', 'general']
};

const normalize = (value: string) => value
  .toLowerCase()
  .replace(/\.[a-z0-9]+$/i, '')
  .replace(/[^a-z0-9]+/g, '');

const toFileName = (value: string) => `${value
  .toLowerCase()
  .trim()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')}.png`;

function fileCandidates(item: CatalogItem) {
  const candidates = [
    item.image.preferredSourceFile,
    `${item.key}.png`,
    toFileName(item.displayName),
    ...item.image.searchTerms.map(toFileName)
  ].filter((value): value is string => Boolean(value));
  return [...new Set(candidates)];
}

function categoryScore(item: CatalogItem, category: string) {
  const normalized = category.toLowerCase();
  const priority = CATEGORY_PRIORITY[item.category].findIndex(entry => entry.toLowerCase() === normalized);
  if (priority >= 0) return 220 - priority * 20;
  return -1_000;
}

function assetUrl(entry: RainmadEntry) {
  return `${RAINMAD_BASE}/images/${encodeURIComponent(entry.category)}/${encodeURIComponent(entry.url)}`;
}

function resolveAlias(item: CatalogItem, entries: readonly RainmadEntry[]): ResolvedAsset | null {
  const alias = RAINMAD_ALIASES[item.key];
  if (!alias) return null;
  const entry = entries.find(candidate => candidate.category === alias.category && candidate.url === alias.file);
  if (!entry) {
    console.warn(`Configured Rainmad alias is missing from live index: ${item.key} -> ${alias.category}/${alias.file}`);
    return null;
  }
  return {
    url: assetUrl(entry),
    source: 'rainmad',
    sourceFile: entry.url,
    sourceCategory: entry.category,
    match: 'alias',
    score: 2_000
  };
}

function resolveRainmad(item: CatalogItem, entries: readonly RainmadEntry[]): ResolvedAsset | null {
  const alias = resolveAlias(item, entries);
  if (alias) return alias;

  const candidates = fileCandidates(item);
  const normalizedCandidates = candidates.map(normalize);
  let best: { entry: RainmadEntry; score: number; match: 'exact' | 'fuzzy' } | null = null;

  for (const entry of entries) {
    const categoryWeight = categoryScore(item, entry.category);
    if (categoryWeight < 0) continue;

    const entryName = normalize(entry.url);
    const exactIndex = normalizedCandidates.indexOf(entryName);
    let match: 'exact' | 'fuzzy' | null = null;
    let score = Number.NEGATIVE_INFINITY;

    if (exactIndex >= 0) {
      match = 'exact';
      score = 1_000 - exactIndex * 35 + categoryWeight;
    } else {
      for (let index = 0; index < normalizedCandidates.length; index += 1) {
        const candidate = normalizedCandidates[index]!;
        if (candidate.length < 4 || entryName.length < 4) continue;
        const contains = entryName.includes(candidate) || candidate.includes(entryName);
        if (!contains) continue;
        const shorter = Math.min(entryName.length, candidate.length);
        const longer = Math.max(entryName.length, candidate.length);
        if (shorter / longer < 0.45) continue;
        const difference = longer - shorter;
        const candidateScore = 600 - index * 25 - difference * 12 + categoryWeight;
        if (candidateScore > score) {
          match = 'fuzzy';
          score = candidateScore;
        }
      }
    }

    if (!match) continue;
    if (!best || score > best.score) best = { entry, score, match };
  }

  if (!best || best.score < 540) return null;
  return {
    url: assetUrl(best.entry),
    source: 'rainmad',
    sourceFile: best.entry.url,
    sourceCategory: best.entry.category,
    match: best.match,
    score: best.score
  };
}

async function loadRainmadIndex(): Promise<RainmadIndex> {
  const response = await fetch(RAINMAD_INDEX, { headers: { 'user-agent': USER_AGENT } });
  if (!response.ok) throw new Error(`Could not load Rainmad image index: HTTP ${response.status}`);
  const payload = await response.json() as Partial<RainmadIndex>;
  if (!Array.isArray(payload.images)) throw new Error('Rainmad image index did not contain an images array');
  return {
    total: typeof payload.total === 'number' ? payload.total : payload.images.length,
    categories: Array.isArray(payload.categories) ? payload.categories : [],
    images: payload.images.filter((entry): entry is RainmadEntry => Boolean(entry && typeof entry.url === 'string' && typeof entry.category === 'string'))
  };
}

async function fetchImage(url: string): Promise<Uint8Array | null> {
  const response = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
  if (!response.ok) return null;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) return null;
  return new Uint8Array(await response.arrayBuffer());
}

const index = await loadRainmadIndex();
console.log(`Rainmad index: ${index.images.length}/${index.total} images across ${index.categories.length} categories.`);

const sourceMap: Record<string, {
  source: 'rainmad';
  sourceFile: string;
  sourceCategory: string;
  url: string;
  match: MatchKind;
  score: number;
}> = {};
const unresolved: string[] = [];
const fuzzy: string[] = [];
const aliases: string[] = [];
let resolved = 0;

await mkdir(outputDir, { recursive: true });
for (const item of CORE_ITEM_CATALOG) {
  const resolvedAsset = resolveRainmad(item, index.images);
  if (!resolvedAsset) {
    unresolved.push(item.key);
    continue;
  }

  sourceMap[item.key] = resolvedAsset;
  resolved += 1;
  if (resolvedAsset.match === 'fuzzy') fuzzy.push(`${item.key} -> ${resolvedAsset.sourceCategory}/${resolvedAsset.sourceFile}`);
  if (resolvedAsset.match === 'alias') aliases.push(`${item.key} -> ${resolvedAsset.sourceCategory}/${resolvedAsset.sourceFile}`);
  console.log(`${item.key} -> ${resolvedAsset.sourceCategory}/${resolvedAsset.sourceFile} [${resolvedAsset.match}:${resolvedAsset.score}]`);
  if (dryRun) continue;

  const bytes = await fetchImage(resolvedAsset.url);
  if (!bytes) {
    unresolved.push(item.key);
    delete sourceMap[item.key];
    resolved -= 1;
    continue;
  }

  const destination = path.join(outputDir, `${item.key}.png`);
  try {
    await writeFile(destination, bytes, overwrite ? undefined : { flag: 'wx' });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'EEXIST') throw error;
  }
}

if (!dryRun) {
  await writeFile(sourceMapPath, `${JSON.stringify(sourceMap, null, 2)}\n`, 'utf8');
}

console.log(`Resolved ${resolved}/${CORE_ITEM_CATALOG.length} Rainmad item images${dryRun ? ' (dry run)' : ''}.`);
if (aliases.length > 0) console.log(`Explicit aliases (${aliases.length}):\n${aliases.join('\n')}`);
if (fuzzy.length > 0) console.log(`Fuzzy matches (${fuzzy.length}):\n${fuzzy.join('\n')}`);
if (unresolved.length > 0) {
  console.log(`Unresolved (${unresolved.length}): ${unresolved.join(', ')}`);
  if (strict) process.exitCode = 2;
}
