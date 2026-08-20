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
  type GarmentSlot
} from '../character-creator/characterRecipe';

type Tab = 'body' | 'face' | 'appearance' | 'hair' | 'clothing';

const SKIN_TONES = [
  ['light-neutral', '#c9967d'], ['light-warm', '#bd856d'], ['warm-medium', '#aa715b'], ['medium-neutral', '#97614e'],
  ['medium-deep', '#7d4d3d'], ['deep-warm', '#633b2f'], ['deep-neutral', '#4c2f29'], ['dark', '#38231f']
] as const;
const EYE_COLORS = ['dark-brown', 'brown', 'hazel', 'amber', 'green', 'blue', 'gray'] as const;
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
  async function save() {
    setSaveState('saving'); setError('');
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
              {(['male', 'female'] as const).map(sex => <button key={sex} className={`min-w-24 rounded-lg px-3 py-2 text-xs font-semibold ${recipe.body === sex ? 'bg-amber-300/15 text-amber-100' : 'text-slate-400'}`} onClick={() => patch(current => ({ ...current, body: sex }))}>{sex === 'male' ? copy.male : copy.female}</button>)}
            </div>
          </div>
          {error && <div className="mt-3 rounded-lg border border-red-400/20 bg-red-400/8 px-3 py-2 text-xs text-red-100">{error}</div>}
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-white/8 px-3 py-2">
          {(['body', 'face', 'appearance', 'hair', 'clothing'] as Tab[]).map(value => <button key={value} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${tab === value ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`} onClick={() => setTab(value)}>{copy.tabs[value]}</button>)}
        </div>

        <div className="max-h-[calc(100dvh-330px)] min-h-[360px] overflow-y-auto p-4 md:p-5">
          {tab === 'body' && <BodyPanel copy={copy} recipe={recipe} appearance={appearance} morph={morph} />}
          {tab === 'face' && <MorphPanel title={copy.faceTitle} subtitle={copy.faceSubtitle} definitions={FACE_MORPHS} values={recipe.faceMorphs} onChange={(key, value) => morph('faceMorphs', key, value)} />}
          {tab === 'appearance' && <AppearancePanel copy={copy} recipe={recipe} appearance={appearance} />}
          {tab === 'hair' && <PipelinePanel title={copy.hairTitle} body={copy.hairBody} badge={copy.pipelineBadge} />}
          {tab === 'clothing' && <ClothingPanel copy={copy} recipe={recipe} />}
        </div>
      </div>
    </section>
  );
}

function BodyPanel({ copy, recipe, appearance, morph }: { copy: Copy; recipe: CharacterAppearanceRecipe; appearance: (key: keyof CharacterAppearanceRecipe['appearance'], value: number | string) => void; morph: (group: 'morphs' | 'faceMorphs', key: string, value: number) => void }) {
  return <div className="space-y-5"><div><h2 className="text-sm font-semibold text-slate-100">{copy.bodyTitle}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{copy.bodySubtitle}</p></div>
    <div className="grid gap-3 sm:grid-cols-2"><Range label={copy.height} value={recipe.appearance.height} onChange={value => appearance('height', value)} /><Range label={copy.weight} value={recipe.appearance.weight} onChange={value => appearance('weight', value)} /><Range label={copy.muscle} value={recipe.appearance.muscle} onChange={value => appearance('muscle', value)} /><Range label={copy.age} value={recipe.appearance.age} min={18} max={80} neutral={28} onChange={value => appearance('age', value)} /></div>
    <MorphPanel title={copy.measurements} subtitle={copy.measurementsSubtitle} definitions={BODY_MORPHS} values={recipe.morphs} onChange={(key, value) => morph('morphs', key, value)} />
  </div>;
}

function AppearancePanel({ copy, recipe, appearance }: { copy: Copy; recipe: CharacterAppearanceRecipe; appearance: (key: keyof CharacterAppearanceRecipe['appearance'], value: number | string) => void }) {
  return <div className="space-y-6"><div><h2 className="text-sm font-semibold text-slate-100">{copy.appearanceTitle}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{copy.appearanceSubtitle}</p></div>
    <div><b className="text-xs text-slate-300">{copy.skin}</b><div className="mt-3 flex flex-wrap gap-2">{SKIN_TONES.map(([id, color]) => <button key={id} aria-label={id} title={id} onClick={() => appearance('skinTone', id)} className={`h-9 w-9 rounded-full border-2 ${recipe.appearance.skinTone === id ? 'border-amber-300' : 'border-white/10'}`} style={{ backgroundColor: color }} />)}</div></div>
    <div><b className="text-xs text-slate-300">{copy.eyes}</b><div className="mt-3 flex flex-wrap gap-2">{EYE_COLORS.map(id => <button key={id} onClick={() => appearance('eyeColor', id)} className={`rounded-full border px-3 py-2 text-[10px] font-semibold ${recipe.appearance.eyeColor === id ? 'border-amber-300/50 bg-amber-300/10 text-amber-100' : 'border-white/10 text-slate-400'}`}>{id}</button>)}</div></div>
  </div>;
}

function ClothingPanel({ copy, recipe }: { copy: Copy; recipe: CharacterAppearanceRecipe }) {
  return <div className="space-y-4"><PipelinePanel title={copy.clothingTitle} body={copy.clothingBody} badge={copy.pipelineBadge} />
    <div className="grid gap-2 sm:grid-cols-2">{GARMENT_SLOTS.map(slot => <div key={slot} className="rounded-xl border border-white/8 bg-black/15 p-3"><small className="text-[9px] uppercase tracking-[.16em] text-slate-500">{slot}</small><b className="mt-1 block text-xs text-slate-300">{recipe.grooming.equipped[slot] ?? copy.emptySlot}</b></div>)}</div>
  </div>;
}

function PipelinePanel({ title, body, badge }: { title: string; body: string; badge: string }) {
  return <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[.04] p-4"><div className="flex items-center gap-2"><h2 className="text-sm font-semibold text-slate-100">{title}</h2><span className="rounded-full border border-amber-300/20 px-2 py-1 text-[8px] font-bold uppercase tracking-[.14em] text-amber-200">{badge}</span></div><p className="mt-2 text-xs leading-5 text-slate-400">{body}</p></div>;
}

function MorphPanel({ title, subtitle, definitions, values, onChange }: { title: string; subtitle: string; definitions: ReadonlyArray<readonly [string, string]>; values: Record<string, number>; onChange: (key: string, value: number) => void }) {
  return <div><h2 className="text-sm font-semibold text-slate-100">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{definitions.map(([key, label]) => <Range key={key} label={label} value={values[key] ?? 0} onChange={value => onChange(key, value)} />)}</div></div>;
}

function Range({ label, value, onChange, min = -100, max = 100, neutral = 0 }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; neutral?: number }) {
  return <label className="rounded-xl border border-white/8 bg-black/15 p-3"><span className="flex items-center justify-between gap-3 text-xs"><b className="font-medium text-slate-300">{label}</b><i className="not-italic text-amber-200">{value === neutral ? '0' : value > neutral ? `+${value - neutral}` : String(value - neutral)}</i></span><input className="mt-2 w-full accent-amber-300" type="range" min={min} max={max} step={1} value={value} onChange={event => onChange(Number(event.target.value))} /></label>;
}

type Copy = typeof EN;
const EN = {
  eyebrow: 'CHARACTER SYSTEM · LIVE HM08', title: 'Character creator', description: 'The production UI now drives the same MakeHuman HM08 topology and target system proven in the prototype. Hair and clothing stay behind the asset-registry boundary so AI content can be published without UI changes.',
  name: 'Character name', defaultName: 'My Character', male: 'Male', female: 'Female', save: 'Save character', saving: 'Saving…', saved: 'Saved', pipelineBadge: 'AI pipeline',
  tabs: { body: 'Body', face: 'Face', appearance: 'Appearance', hair: 'Hair', clothing: 'Clothing' } as Record<Tab, string>,
  bodyTitle: 'Body foundation', bodySubtitle: 'Macro proportions and real MakeHuman measurement targets.', height: 'Height', weight: 'Weight / body fat', muscle: 'Muscle', age: 'Age', measurements: 'Measurements', measurementsSubtitle: 'Each slider applies HM08 target deltas, not separate-object scaling.',
  faceTitle: 'Face structure', faceSubtitle: 'Curated facial targets keep the range useful and human.', appearanceTitle: 'Surface appearance', appearanceSubtitle: 'Skin is live. Eye color is persisted now and will bind to the production eye material pass.', skin: 'Skin tone', eyes: 'Eye color',
  hairTitle: 'Hair registry', hairBody: 'The old prototype proved MHCLO hair fitting. The production creator now reserves the hair asset slot; the next pipeline pass will publish validated GLB hair assets here rather than downloading arbitrary MHCLO files at runtime.',
  clothingTitle: 'Modular clothing registry', clothingBody: 'These slots are the stable game contract. AI-generated garments will be fitted, rigged, validated and published into them automatically.', emptySlot: 'No asset equipped'
};
const BG: Copy = {
  ...EN, eyebrow: 'CHARACTER SYSTEM · LIVE HM08', title: 'Създаване на герой', description: 'Production UI вече управлява същата MakeHuman HM08 topology и target система, доказана в прототипа. Косата и дрехите остават зад asset registry слой, за да могат AI assets да се публикуват без промяна на UI.',
  name: 'Име на героя', defaultName: 'Моят герой', male: 'Мъж', female: 'Жена', save: 'Запази героя', saving: 'Запазване…', saved: 'Запазено', pipelineBadge: 'AI pipeline',
  tabs: { body: 'Тяло', face: 'Лице', appearance: 'Външен вид', hair: 'Коса', clothing: 'Дрехи' }, bodyTitle: 'Основа на тялото', bodySubtitle: 'Основни пропорции и реални MakeHuman measurement targets.', height: 'Височина', weight: 'Тегло / мазнини', muscle: 'Мускулатура', age: 'Възраст', measurements: 'Размери', measurementsSubtitle: 'Всеки slider прилага HM08 target deltas, а не scale на отделни обекти.', faceTitle: 'Структура на лицето', faceSubtitle: 'Подбраните face targets пазят диапазона реалистичен.', appearanceTitle: 'Външен вид', appearanceSubtitle: 'Кожата се обновява live. Цветът на очите вече се запазва и ще се свърже с production eye material pass.', skin: 'Тон на кожата', eyes: 'Цвят на очите', hairTitle: 'Hair registry', hairBody: 'Старият прототип доказа MHCLO fitting-а. Production creator вече пази стабилен hair asset slot; следващият pipeline pass ще публикува валидирани GLB hair assets вместо произволни MHCLO downloads в runtime.', clothingTitle: 'Модулен clothing registry', clothingBody: 'Тези slots са стабилният game contract. AI-generated дрехите ще се fit-ват, rig-ват, валидират и публикуват автоматично.', emptySlot: 'Няма екипиран asset'
};
