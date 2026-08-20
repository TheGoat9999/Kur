import { useMemo, useState } from 'react';
import type { BootstrapState } from '@sol-dorado/contracts';
import { useI18n } from '../../i18n';
import { saveCharacter } from '../../lib/api';
import { MakeHumanViewer } from '../character-creator/MakeHumanViewer';
import {
  BODY_MORPHS,
  DEFAULT_CHARACTER_RECIPE,
  FACE_MORPHS,
  normalizeRecipe,
  type CharacterAppearanceRecipe,
  type CharacterSex,
  type GarmentSlot
} from '../character-creator/characterRecipe';
import {
  HAIR_ASSETS,
  assetsForSex,
  getSystemAsset,
  type MakeHumanSystemAsset
} from '../character-creator/systemAssets';

type Tab = 'body' | 'face' | 'appearance' | 'hair' | 'clothing';

const SKIN_TONES = [
  ['light-neutral', '#c9967d'], ['light-warm', '#bd856d'], ['warm-medium', '#aa715b'], ['medium-neutral', '#97614e'],
  ['medium-deep', '#7d4d3d'], ['deep-warm', '#633b2f'], ['deep-neutral', '#4c2f29'], ['dark', '#38231f']
] as const;
const EYE_COLORS = [
  ['dark-brown', '#38261d'], ['brown', '#5d4938'], ['hazel', '#7a653d'], ['amber', '#8b652d'],
  ['green', '#4f6951'], ['blue', '#4b6f86'], ['gray', '#69767b']
] as const;
const HAIR_COLORS = [
  ['black', '#151311'], ['soft-black', '#27211d'], ['dark-brown', '#3c2b22'], ['brown', '#644334'],
  ['auburn', '#754032'], ['copper', '#9a5d3a'], ['blonde', '#b89a65'], ['platinum', '#d0c8b5'], ['gray', '#777b7d']
] as const;
const GARMENT_SLOTS: GarmentSlot[] = ['head', 'face', 'torsoInner', 'torsoOuter', 'legs', 'feet', 'hands', 'accessory'];

export function CharacterView({ state, onStateChange }: { state: BootstrapState; onStateChange: (state: BootstrapState) => void }) {
  const { locale, runtime } = useI18n();
  const copy = locale === 'bg' ? BG : EN;
  const initial = useMemo(() => normalizeRecipe((state.character?.recipe ?? DEFAULT_CHARACTER_RECIPE) as Partial<CharacterAppearanceRecipe>), [state.character?.id]);
  const [recipe, setRecipe] = useState(initial);
  const [displayName, setDisplayName] = useState(state.character ? runtime(state.character.displayName) : copy.defaultName);
  const [tab, setTab] = useState<Tab>('body');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  const focus = tab === 'face' || tab === 'hair' ? 'face' : 'full';

  function patch(next: (current: CharacterAppearanceRecipe) => CharacterAppearanceRecipe) {
    setRecipe(current => next(current));
    setSaveState('idle');
  }

  function appearance(key: keyof CharacterAppearanceRecipe['appearance'], value: number | string) {
    patch(current => ({ ...current, appearance: { ...current.appearance, [key]: value } }));
  }

  function morph(group: 'morphs' | 'faceMorphs', key: string, value: number) {
    patch(current => ({ ...current, [group]: { ...current[group], [key]: value } }));
  }

  function setBody(body: CharacterSex) {
    patch(current => {
      const equipped: Partial<Record<GarmentSlot, string>> = {};
      for (const [slot, assetId] of Object.entries(current.grooming.equipped) as Array<[GarmentSlot, string]>) {
        const asset = getSystemAsset(assetId);
        if (!asset || asset.compatibleSexes.includes(body)) equipped[slot] = assetId;
      }
      return { ...current, body, grooming: { ...current.grooming, equipped } };
    });
  }

  function setHairStyle(hairStyle: string) {
    patch(current => ({ ...current, grooming: { ...current.grooming, hairStyle } }));
  }

  function setHairColor(hairColor: string) {
    patch(current => ({ ...current, grooming: { ...current.grooming, hairColor } }));
  }

  function toggleClothing(asset: MakeHumanSystemAsset) {
    patch(current => {
      const equipped = { ...current.grooming.equipped };
      const active = asset.slots.length > 0 && asset.slots.every(slot => equipped[slot] === asset.id);
      for (const slot of asset.slots) {
        if (active) delete equipped[slot];
        else equipped[slot] = asset.id;
      }
      return { ...current, grooming: { ...current.grooming, equipped } };
    });
  }

  function removeSlot(slot: GarmentSlot) {
    patch(current => {
      const equipped = { ...current.grooming.equipped };
      const assetId = equipped[slot];
      const asset = getSystemAsset(assetId);
      if (asset) asset.slots.forEach(assetSlot => { if (equipped[assetSlot] === asset.id) delete equipped[assetSlot]; });
      else delete equipped[slot];
      return { ...current, grooming: { ...current.grooming, equipped } };
    });
  }

  async function save() {
    setSaveState('saving');
    setError('');
    try {
      const next = await saveCharacter(displayName.trim() || copy.defaultName, recipe);
      onStateChange(next);
      setSaveState('saved');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setSaveState('error');
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(360px,.9fr)_minmax(460px,1.1fr)]">
      <div className="glass-panel min-h-[520px] overflow-hidden p-2 md:p-3 xl:sticky xl:top-4 xl:h-[calc(100dvh-190px)]">
        <MakeHumanViewer recipe={recipe} focus={focus} />
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="border-b border-white/8 px-4 py-4 md:px-5">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <span className="eyebrow">{copy.eyebrow}</span>
              <h1 className="mt-2 text-xl font-semibold text-slate-100">{copy.title}</h1>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">{copy.description}</p>
            </div>
            <button className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-bold text-amber-100 disabled:opacity-50" disabled={saveState === 'saving'} onClick={save}>
              {saveState === 'saving' ? copy.saving : saveState === 'saved' ? copy.saved : copy.save}
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input className="min-h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-slate-100 outline-none focus:border-amber-300/40" value={displayName} maxLength={80} onChange={event => setDisplayName(event.target.value)} aria-label={copy.name} />
            <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
              {(['male', 'female'] as const).map(sex => <button key={sex} className={`min-w-24 rounded-lg px-3 py-2 text-xs font-semibold ${recipe.body === sex ? 'bg-amber-300/15 text-amber-100' : 'text-slate-400'}`} onClick={() => setBody(sex)}>{sex === 'male' ? copy.male : copy.female}</button>)}
            </div>
          </div>
          {error && <div className="mt-3 rounded-lg border border-red-400/20 bg-red-400/8 px-3 py-2 text-xs text-red-100">{error}</div>}
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-white/8 px-3 py-2">
          {(['body', 'face', 'appearance', 'hair', 'clothing'] as Tab[]).map(value => <button key={value} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${tab === value ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`} onClick={() => setTab(value)}>{copy.tabs[value]}</button>)}
        </div>

        <div className="max-h-[calc(100dvh-330px)] min-h-[360px] overflow-y-auto p-4 md:p-5">
          {tab === 'body' && <BodyPanel copy={copy} recipe={recipe} appearance={appearance} morph={morph} />}
          {tab === 'face' && <MorphPanel title={copy.faceTitle} subtitle={copy.faceSubtitle} definitions={FACE_MORPHS} labels={copy.faceMorphLabels} values={recipe.faceMorphs} onChange={(key, value) => morph('faceMorphs', key, value)} />}
          {tab === 'appearance' && <AppearancePanel copy={copy} recipe={recipe} appearance={appearance} />}
          {tab === 'hair' && <HairPanel copy={copy} locale={locale} recipe={recipe} onStyle={setHairStyle} onColor={setHairColor} />}
          {tab === 'clothing' && <ClothingPanel copy={copy} locale={locale} recipe={recipe} onToggle={toggleClothing} onRemoveSlot={removeSlot} />}
        </div>
      </div>
    </section>
  );
}

function BodyPanel({ copy, recipe, appearance, morph }: { copy: Copy; recipe: CharacterAppearanceRecipe; appearance: (key: keyof CharacterAppearanceRecipe['appearance'], value: number | string) => void; morph: (group: 'morphs' | 'faceMorphs', key: string, value: number) => void }) {
  return <div className="space-y-5"><div><h2 className="text-sm font-semibold text-slate-100">{copy.bodyTitle}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{copy.bodySubtitle}</p></div>
    <div className="grid gap-3 sm:grid-cols-2"><Range label={copy.height} value={recipe.appearance.height} onChange={value => appearance('height', value)} /><Range label={copy.weight} value={recipe.appearance.weight} onChange={value => appearance('weight', value)} /><Range label={copy.muscle} value={recipe.appearance.muscle} onChange={value => appearance('muscle', value)} /><Range label={copy.age} value={recipe.appearance.age} min={18} max={80} neutral={28} onChange={value => appearance('age', value)} /></div>
    <MorphPanel title={copy.measurements} subtitle={copy.measurementsSubtitle} definitions={BODY_MORPHS} labels={copy.bodyMorphLabels} values={recipe.morphs} onChange={(key, value) => morph('morphs', key, value)} />
  </div>;
}

function AppearancePanel({ copy, recipe, appearance }: { copy: Copy; recipe: CharacterAppearanceRecipe; appearance: (key: keyof CharacterAppearanceRecipe['appearance'], value: number | string) => void }) {
  return <div className="space-y-6"><div><h2 className="text-sm font-semibold text-slate-100">{copy.appearanceTitle}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{copy.appearanceSubtitle}</p></div>
    <div><b className="text-xs text-slate-300">{copy.skin}</b><div className="mt-3 flex flex-wrap gap-2">{SKIN_TONES.map(([id, color]) => <button key={id} aria-label={copy.skinLabels[id]} title={copy.skinLabels[id]} onClick={() => appearance('skinTone', id)} className={`h-9 w-9 rounded-full border-2 ${recipe.appearance.skinTone === id ? 'border-amber-300' : 'border-white/10'}`} style={{ backgroundColor: color }} />)}</div></div>
    <div><b className="text-xs text-slate-300">{copy.eyes}</b><div className="mt-3 flex flex-wrap gap-2">{EYE_COLORS.map(([id, color]) => <button key={id} onClick={() => appearance('eyeColor', id)} className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-semibold ${recipe.appearance.eyeColor === id ? 'border-amber-300/50 bg-amber-300/10 text-amber-100' : 'border-white/10 text-slate-400'}`}><span className="h-3 w-3 rounded-full border border-white/15" style={{ backgroundColor: color }} />{copy.eyeLabels[id]}</button>)}</div></div>
  </div>;
}

function HairPanel({ copy, locale, recipe, onStyle, onColor }: { copy: Copy; locale: 'bg' | 'en'; recipe: CharacterAppearanceRecipe; onStyle: (id: string) => void; onColor: (id: string) => void }) {
  return <div className="space-y-6">
    <PipelinePanel title={copy.hairTitle} body={copy.hairBody} badge={copy.systemBadge} />
    <div>
      <b className="text-xs text-slate-300">{copy.hairStyle}</b>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <AssetCard active={recipe.grooming.hairStyle === 'bald'} name={copy.bald} category={copy.noHair} onClick={() => onStyle('bald')} />
        {HAIR_ASSETS.map(asset => <AssetCard key={asset.id} active={recipe.grooming.hairStyle === asset.id} name={locale === 'bg' ? asset.displayNameBg : asset.displayNameEn} category={locale === 'bg' ? asset.categoryBg : asset.categoryEn} image={asset.thumbnailUrl} onClick={() => onStyle(asset.id)} />)}
      </div>
    </div>
    <div><b className="text-xs text-slate-300">{copy.hairColor}</b><div className="mt-3 flex flex-wrap gap-2">{HAIR_COLORS.map(([id, color]) => <button key={id} aria-label={copy.hairColorLabels[id]} title={copy.hairColorLabels[id]} onClick={() => onColor(id)} className={`h-9 w-9 rounded-full border-2 ${recipe.grooming.hairColor === id ? 'border-amber-300' : 'border-white/10'}`} style={{ backgroundColor: color }} />)}</div></div>
    <div className="rounded-xl border border-emerald-300/10 bg-emerald-300/[.035] p-3 text-[10px] leading-5 text-slate-400">{copy.hairTechnical}</div>
  </div>;
}

function ClothingPanel({ copy, locale, recipe, onToggle, onRemoveSlot }: { copy: Copy; locale: 'bg' | 'en'; recipe: CharacterAppearanceRecipe; onToggle: (asset: MakeHumanSystemAsset) => void; onRemoveSlot: (slot: GarmentSlot) => void }) {
  const assets = assetsForSex(recipe.body);
  const equippedIds = new Set(Object.values(recipe.grooming.equipped).filter(Boolean));
  return <div className="space-y-5">
    <PipelinePanel title={copy.clothingTitle} body={copy.clothingBody} badge={copy.systemBadge} />
    <div>
      <div className="flex items-center justify-between gap-3"><b className="text-xs text-slate-300">{copy.availableClothes}</b><small className="text-[9px] uppercase tracking-[.14em] text-slate-500">{recipe.body === 'male' ? copy.forMale : copy.forFemale}</small></div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {assets.map(asset => <AssetCard key={asset.id} active={equippedIds.has(asset.id)} name={locale === 'bg' ? asset.displayNameBg : asset.displayNameEn} category={locale === 'bg' ? asset.categoryBg : asset.categoryEn} image={asset.thumbnailUrl} footer={equippedIds.has(asset.id) ? copy.remove : copy.equip} onClick={() => onToggle(asset)} />)}
      </div>
    </div>
    <div>
      <b className="text-xs text-slate-300">{copy.equipped}</b>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{GARMENT_SLOTS.map(slot => {
        const assetId = recipe.grooming.equipped[slot];
        const asset = getSystemAsset(assetId);
        const name = asset ? (locale === 'bg' ? asset.displayNameBg : asset.displayNameEn) : copy.emptySlot;
        return <div key={slot} className="rounded-xl border border-white/8 bg-black/15 p-3"><small className="text-[9px] uppercase tracking-[.12em] text-slate-500">{copy.slotLabels[slot]}</small><div className="mt-1 flex items-center justify-between gap-2"><b className="min-w-0 truncate text-xs text-slate-300">{name}</b>{assetId && <button className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-[9px] text-slate-400 hover:text-white" onClick={() => onRemoveSlot(slot)}>{copy.remove}</button>}</div></div>;
      })}</div>
    </div>
    <div className="rounded-xl border border-amber-300/10 bg-amber-300/[.035] p-3 text-[10px] leading-5 text-slate-400">{copy.clothingTechnical}</div>
  </div>;
}

function AssetCard({ active, name, category, image, footer, onClick }: { active: boolean; name: string; category: string; image?: string; footer?: string; onClick: () => void }) {
  return <button onClick={onClick} className={`overflow-hidden rounded-xl border text-left transition ${active ? 'border-amber-300/45 bg-amber-300/[.08]' : 'border-white/8 bg-black/15 hover:border-white/15'}`}>
    <div className="grid h-24 place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_35%,#28353b,#11191e_72%)]">{image ? <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} /> : <span className="text-3xl text-slate-500">○</span>}</div>
    <div className="p-2.5"><b className="block text-[11px] text-slate-200">{name}</b><small className="mt-1 block text-[8px] uppercase tracking-[.11em] text-slate-500">{category}</small>{footer && <span className={`mt-2 inline-block text-[9px] font-semibold ${active ? 'text-amber-200' : 'text-slate-400'}`}>{footer}</span>}</div>
  </button>;
}

function PipelinePanel({ title, body, badge }: { title: string; body: string; badge: string }) {
  return <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[.04] p-4"><div className="flex items-center gap-2"><h2 className="text-sm font-semibold text-slate-100">{title}</h2><span className="rounded-full border border-amber-300/20 px-2 py-1 text-[8px] font-bold uppercase tracking-[.12em] text-amber-200">{badge}</span></div><p className="mt-2 text-xs leading-5 text-slate-400">{body}</p></div>;
}

function MorphPanel({ title, subtitle, definitions, labels, values, onChange }: { title: string; subtitle: string; definitions: ReadonlyArray<readonly [string, string]>; labels: Record<string, string>; values: Record<string, number>; onChange: (key: string, value: number) => void }) {
  return <div><h2 className="text-sm font-semibold text-slate-100">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{definitions.map(([key, fallback]) => <Range key={key} label={labels[key] ?? fallback} value={values[key] ?? 0} onChange={value => onChange(key, value)} />)}</div></div>;
}

function Range({ label, value, onChange, min = -100, max = 100, neutral = 0 }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; neutral?: number }) {
  return <label className="rounded-xl border border-white/8 bg-black/15 p-3"><span className="flex items-center justify-between gap-3 text-xs"><b className="font-medium text-slate-300">{label}</b><i className="not-italic text-amber-200">{value === neutral ? '0' : value > neutral ? `+${value - neutral}` : String(value - neutral)}</i></span><input className="mt-2 w-full accent-amber-300" type="range" min={min} max={max} step={1} value={value} onChange={event => onChange(Number(event.target.value))} /></label>;
}

type Copy = {
  eyebrow: string; title: string; description: string; name: string; defaultName: string; male: string; female: string; save: string; saving: string; saved: string;
  tabs: Record<Tab, string>; bodyTitle: string; bodySubtitle: string; height: string; weight: string; muscle: string; age: string; measurements: string; measurementsSubtitle: string;
  faceTitle: string; faceSubtitle: string; appearanceTitle: string; appearanceSubtitle: string; skin: string; eyes: string; hairTitle: string; hairBody: string; clothingTitle: string; clothingBody: string;
  systemBadge: string; hairStyle: string; bald: string; noHair: string; hairColor: string; hairTechnical: string; availableClothes: string; forMale: string; forFemale: string; equipped: string; equip: string; remove: string; emptySlot: string; clothingTechnical: string;
  bodyMorphLabels: Record<string, string>; faceMorphLabels: Record<string, string>; eyeLabels: Record<string, string>; skinLabels: Record<string, string>; hairColorLabels: Record<string, string>; slotLabels: Record<GarmentSlot, string>;
};

const BG: Copy = {
  eyebrow: 'СИСТЕМА ЗА ГЕРОЙ · HM08 НА ЖИВО',
  title: 'Създаване на герой',
  description: 'Интерфейсът използва реалната MakeHuman HM08 геометрия и морфове. Очите, косата и дрехите се променят върху същото тяло и се запазват като една рецепта на героя.',
  name: 'Име на героя', defaultName: 'Моят герой', male: 'Мъж', female: 'Жена', save: 'Запази героя', saving: 'Запазване…', saved: 'Запазено',
  tabs: { body: 'Тяло', face: 'Лице', appearance: 'Външен вид', hair: 'Коса', clothing: 'Дрехи' },
  bodyTitle: 'Основа на тялото', bodySubtitle: 'Основни пропорции и реални MakeHuman морфове.', height: 'Височина', weight: 'Тегло / телесни мазнини', muscle: 'Мускулатура', age: 'Възраст', measurements: 'Размери на тялото', measurementsSubtitle: 'Всеки плъзгач деформира HM08 геометрията, а не мащабира отделен обект.',
  faceTitle: 'Структура на лицето', faceSubtitle: 'Подбраните лицеви морфове пазят резултата реалистичен и човешки.', appearanceTitle: 'Външен вид', appearanceSubtitle: 'Цветът на кожата и очите се прилагат веднага върху триизмерния модел.', skin: 'Цвят на кожата', eyes: 'Цвят на очите',
  hairTitle: 'Коса', hairBody: 'Избери реална системна MakeHuman прическа. MHCLO геометрията се напасва наново към текущата форма на главата при всяка промяна.',
  clothingTitle: 'Дрехи', clothingBody: 'Първата работеща библиотека използва системни CC0 MakeHuman дрехи. Те се напасват към тялото, а покритите части от кожата се скриват автоматично.',
  systemBadge: 'CC0 СИСТЕМНИ ЕЛЕМЕНТИ', hairStyle: 'Прическа', bald: 'Без коса', noHair: 'Без прическа', hairColor: 'Цвят на косата',
  hairTechnical: 'Това е преходният runtime слой. Следващата стъпка е същият интерфейс да получава предварително оптимизирани GLB елементи от автоматичния AI/Blender процес, без ръчно добавяне.',
  availableClothes: 'Налични дрехи', forMale: 'ЗА МЪЖ', forFemale: 'ЗА ЖЕНА', equipped: 'Облечени елементи', equip: 'Облечи', remove: 'Свали', emptySlot: 'Няма облечен елемент',
  clothingTechnical: 'Комплектите могат да заемат повече от един слот. При смяна на пола несъвместимите дрехи се премахват автоматично. Рецептата се записва в PostgreSQL заедно с останалия външен вид.',
  bodyMorphLabels: { shoulders: 'Ширина на раменете', chest: 'Гръдна обиколка', waist: 'Талия', hips: 'Ханш', upperArms: 'Мишници', thighs: 'Бедра', calves: 'Прасци', armLength: 'Дължина на ръцете', legLength: 'Дължина на краката' },
  faceMorphLabels: { cheekbones: 'Скули', cheekVolume: 'Обем на бузите', chinWidth: 'Ширина на брадичката', chinHeight: 'Височина на брадичката', eyeSize: 'Размер на очите', eyeSpacing: 'Разстояние между очите', noseWidth: 'Ширина на носа', noseLength: 'Дължина на носа', mouthWidth: 'Ширина на устата', upperLip: 'Горна устна', lowerLip: 'Долна устна' },
  eyeLabels: { 'dark-brown': 'Тъмнокафяви', brown: 'Кафяви', hazel: 'Лешникови', amber: 'Кехлибарени', green: 'Зелени', blue: 'Сини', gray: 'Сиви' },
  skinLabels: { 'light-neutral': 'Светъл неутрален', 'light-warm': 'Светъл топъл', 'warm-medium': 'Среден топъл', 'medium-neutral': 'Среден неутрален', 'medium-deep': 'Средно тъмен', 'deep-warm': 'Тъмен топъл', 'deep-neutral': 'Тъмен неутрален', dark: 'Много тъмен' },
  hairColorLabels: { black: 'Черен', 'soft-black': 'Мек черен', 'dark-brown': 'Тъмнокафяв', brown: 'Кафяв', auburn: 'Кестеняв', copper: 'Меден', blonde: 'Рус', platinum: 'Платинен', gray: 'Сив' },
  slotLabels: { head: 'Глава', face: 'Лице', torsoInner: 'Горна дреха · вътрешна', torsoOuter: 'Горна дреха · външна', legs: 'Крака', feet: 'Обувки', hands: 'Ръце', accessory: 'Аксесоар' }
};

const EN: Copy = {
  eyebrow: 'CHARACTER SYSTEM · LIVE HM08', title: 'Character creator', description: 'The interface uses the real MakeHuman HM08 geometry and morph system. Eyes, hair and clothes update on the same body and are persisted as one character recipe.',
  name: 'Character name', defaultName: 'My Character', male: 'Male', female: 'Female', save: 'Save character', saving: 'Saving…', saved: 'Saved', tabs: { body: 'Body', face: 'Face', appearance: 'Appearance', hair: 'Hair', clothing: 'Clothing' },
  bodyTitle: 'Body foundation', bodySubtitle: 'Macro proportions and real MakeHuman morphs.', height: 'Height', weight: 'Weight / body fat', muscle: 'Muscle', age: 'Age', measurements: 'Measurements', measurementsSubtitle: 'Each slider deforms HM08 geometry instead of scaling a separate object.',
  faceTitle: 'Face structure', faceSubtitle: 'Curated facial morphs keep the result believable and human.', appearanceTitle: 'Appearance', appearanceSubtitle: 'Skin and eye color update immediately on the 3D model.', skin: 'Skin tone', eyes: 'Eye color',
  hairTitle: 'Hair', hairBody: 'Choose a real bundled MakeHuman hairstyle. MHCLO geometry is refitted to the current head shape after every change.', clothingTitle: 'Clothing', clothingBody: 'The first working library uses bundled CC0 MakeHuman clothes. Garments refit to the body and covered skin is hidden automatically.', systemBadge: 'CC0 SYSTEM ASSETS', hairStyle: 'Hairstyle', bald: 'Bald', noHair: 'No hair', hairColor: 'Hair color',
  hairTechnical: 'This is the transitional runtime layer. The next step keeps the same interface but consumes optimized GLB assets from the automated AI/Blender pipeline.', availableClothes: 'Available clothes', forMale: 'FOR MALE', forFemale: 'FOR FEMALE', equipped: 'Equipped items', equip: 'Equip', remove: 'Remove', emptySlot: 'Nothing equipped', clothingTechnical: 'Outfits may occupy more than one slot. Incompatible clothes are removed automatically when the body sex changes. The recipe is persisted in PostgreSQL.',
  bodyMorphLabels: { shoulders: 'Shoulder width', chest: 'Chest circumference', waist: 'Waist', hips: 'Hips', upperArms: 'Upper arms', thighs: 'Thighs', calves: 'Calves', armLength: 'Arm length', legLength: 'Leg length' },
  faceMorphLabels: { cheekbones: 'Cheekbones', cheekVolume: 'Cheek volume', chinWidth: 'Chin width', chinHeight: 'Chin height', eyeSize: 'Eye size', eyeSpacing: 'Eye spacing', noseWidth: 'Nose width', noseLength: 'Nose length', mouthWidth: 'Mouth width', upperLip: 'Upper lip', lowerLip: 'Lower lip' },
  eyeLabels: { 'dark-brown': 'Dark brown', brown: 'Brown', hazel: 'Hazel', amber: 'Amber', green: 'Green', blue: 'Blue', gray: 'Gray' },
  skinLabels: { 'light-neutral': 'Light neutral', 'light-warm': 'Light warm', 'warm-medium': 'Warm medium', 'medium-neutral': 'Medium neutral', 'medium-deep': 'Medium deep', 'deep-warm': 'Deep warm', 'deep-neutral': 'Deep neutral', dark: 'Dark' },
  hairColorLabels: { black: 'Black', 'soft-black': 'Soft black', 'dark-brown': 'Dark brown', brown: 'Brown', auburn: 'Auburn', copper: 'Copper', blonde: 'Blonde', platinum: 'Platinum', gray: 'Gray' },
  slotLabels: { head: 'Head', face: 'Face', torsoInner: 'Torso inner', torsoOuter: 'Torso outer', legs: 'Legs', feet: 'Feet', hands: 'Hands', accessory: 'Accessory' }
};
