import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORE_ITEM_CATALOG } from '../src/domain/items/index.js';

const args = new Set(process.argv.slice(2));
const allowMirror = args.has('--allow-mirror');
const dryRun = args.has('--dry-run');
const overwrite = args.has('--overwrite');
const rainmadTemplate = process.env.RAINMAD_ASSET_URL_TEMPLATE?.trim();

if (!rainmadTemplate && !allowMirror) {
  console.error([
    'No image source is enabled.',
    'Set RAINMAD_ASSET_URL_TEMPLATE with a {file} placeholder when the direct Rainmad asset URL is known,',
    'or pass --allow-mirror to explicitly use the development FiveM item-gallery mirror as a fallback.'
  ].join(' '));
  process.exit(1);
}
if (rainmadTemplate && !rainmadTemplate.includes('{file}')) {
  throw new Error('RAINMAD_ASSET_URL_TEMPLATE must contain a {file} placeholder');
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(scriptDir, '../../web/public/assets/items');
const sourceMapPath = path.join(outputDir, '_source-map.json');

type MirrorEntry = { name: string; url: string };
type ResolvedAsset = { url: string; source: 'rainmad' | 'development-mirror'; sourceFile: string };

const normalize = (value: string) => value.toLowerCase().replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9]+/g, '');
const fileCandidates = (item: (typeof CORE_ITEM_CATALOG)[number]) => {
  const candidates = [
    item.image.preferredSourceFile,
    `${item.key}.png`,
    ...item.image.searchTerms.map(term => `${term.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}.png`)
  ].filter((value): value is string => Boolean(value));
  return [...new Set(candidates)];
};

async function fetchImage(url: string): Promise<Uint8Array | null> {
  const response = await fetch(url, { headers: { 'user-agent': 'sol-dorado-item-sync/0.1' } });
  if (!response.ok) return null;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) return null;
  return new Uint8Array(await response.arrayBuffer());
}

async function tryRainmad(item: (typeof CORE_ITEM_CATALOG)[number]): Promise<ResolvedAsset | null> {
  if (!rainmadTemplate) return null;
  for (const file of fileCandidates(item)) {
    const url = rainmadTemplate.replace('{file}', encodeURIComponent(file));
    const bytes = await fetchImage(url);
    if (!bytes) continue;
    cachedBytes.set(url, bytes);
    return { url, source: 'rainmad', sourceFile: file };
  }
  return null;
}

let mirrorEntries: MirrorEntry[] | null = null;
async function loadMirrorEntries(): Promise<MirrorEntry[]> {
  if (mirrorEntries) return mirrorEntries;
  const response = await fetch('https://raw.githubusercontent.com/Trowee/fivem-items/main/items-data.js', {
    headers: { 'user-agent': 'sol-dorado-item-sync/0.1' }
  });
  if (!response.ok) throw new Error(`Could not load development mirror index: HTTP ${response.status}`);
  const source = await response.text();
  const match = source.match(/const ITEMS_DATA = ([\s\S]*?);\s*\n\s*\/\/ Func/);
  if (!match?.[1]) throw new Error('Could not parse development mirror item index');
  const categories = JSON.parse(match[1]) as Record<string, MirrorEntry[]>;
  mirrorEntries = Object.values(categories).flat().filter(entry => entry.url.toLowerCase().endsWith('.png'));
  return mirrorEntries;
}

async function tryMirror(item: (typeof CORE_ITEM_CATALOG)[number]): Promise<ResolvedAsset | null> {
  if (!allowMirror) return null;
  const entries = await loadMirrorEntries();
  const wanted = new Set([
    normalize(item.key),
    normalize(item.displayName),
    ...item.image.searchTerms.map(normalize),
    ...(item.image.preferredSourceFile ? [normalize(item.image.preferredSourceFile)] : [])
  ]);
  const exact = entries.filter(entry => wanted.has(normalize(entry.name)) || wanted.has(normalize(path.basename(entry.url))));
  if (exact.length === 0) return null;
  const entry = exact[0]!;
  const url = `https://raw.githubusercontent.com/Trowee/fivem-items/main/${entry.url.split('/').map(encodeURIComponent).join('/')}`;
  return { url, source: 'development-mirror', sourceFile: path.basename(entry.url) };
}

const cachedBytes = new Map<string, Uint8Array>();
const sourceMap: Record<string, { source: string; sourceFile: string; url: string }> = {};
const unresolved: string[] = [];
let resolved = 0;

await mkdir(outputDir, { recursive: true });
for (const item of CORE_ITEM_CATALOG) {
  const resolvedAsset = await tryRainmad(item) ?? await tryMirror(item);
  if (!resolvedAsset) {
    unresolved.push(item.key);
    continue;
  }

  sourceMap[item.key] = resolvedAsset;
  resolved += 1;
  if (dryRun) continue;

  const destination = path.join(outputDir, `${item.key}.png`);
  let bytes = cachedBytes.get(resolvedAsset.url);
  if (!bytes) {
    bytes = await fetchImage(resolvedAsset.url) ?? undefined;
  }
  if (!bytes) {
    unresolved.push(item.key);
    delete sourceMap[item.key];
    resolved -= 1;
    continue;
  }

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

console.log(`Resolved ${resolved}/${CORE_ITEM_CATALOG.length} item images${dryRun ? ' (dry run)' : ''}.`);
if (unresolved.length > 0) {
  console.log(`Unresolved (${unresolved.length}): ${unresolved.join(', ')}`);
  process.exitCode = 2;
}
