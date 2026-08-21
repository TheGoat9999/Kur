import { useMemo, useState, type ReactNode } from 'react';
import type { BootstrapState } from '@sol-dorado/contracts';
import { saveCharacter } from '../../lib/api';
import { catalogFor, type CharacterCatalogSlot } from './characterCatalog';
import { buildCharacterPrompt } from './characterPromptBuilder';
import { generateCharacterPreview } from './characterPreviewApi';
import { StylizedCharacterPreview } from './StylizedCharacterPreview';
import {
  normalizeVisualRecipe,
  type AgeBand,
  type BodyBuild,
  type CharacterSex,
  type CharacterVisualRecipeV2,
  type FaceShape
} from './characterVisualRecipe';

type Tab = 'identity' | 'face' | 'hair' | 'clothes' | 'accessories' | 'style' | 'ai';
type PreviewMode = 'full-body' | 'portrait';
type AiState = 'idle' | 'generating' | 'ready' | 'error';

const TABS: Array<[Tab, string]> = [
  ['identity', 'Самоличност'], ['face', 'Лице и тяло'], ['hair', 'Коса'], ['clothes', 'Облекло'],
  ['accessories', 'Аксесоари'], ['style', 'Стил'], ['ai', 'AI преглед']
];
const SKINS = [
  ['porcelain', '#f2c8b6', 'Много светъл'], ['light-warm', '#d9a186', 'Светъл топъл'], ['warm-medium', '#b9785f', 'Среден топъл'],
  ['olive', '#9e7356', 'Маслинен'], ['deep-warm', '#734a37', 'Тъмен топъл'], ['deep-neutral', '#4d3028', 'Тъмен неутрален']
] as const;
const EYES = [
  ['brown', '#4c3528', 'Кафяви'], ['hazel', '#79633e', 'Лешникови'], ['green', '#4b6f55', 'Зелени'],
  ['blue', '#4d7591', 'Сини'], ['gray', '#78858d', 'Сиви'], ['amber', '#9a6a2e', 'Кехлибарени']
] as const;
const HAIR_COLORS = [
  ['black', '#171515', 'Черен'], ['dark-brown', '#30221e', 'Тъмнокафяв'], ['brown', '#604438', 'Кафяв'],
  ['auburn', '#7a4638', 'Кестеняв'], ['blonde', '#c6a877', 'Рус'], ['platinum', '#ded8c8', 'Платинен'], ['gray', '#777b80', 'Сив']
] as const;
const ACCENTS = ['#f0bd4f','#ff5c8a','#52d5d0','#7b8cff','#ef6b4b','#9bdb68','#d5a2ff'];
const VIBES = [
  ['street-modern','Модерен street'], ['coastal-clean','Coastal clean'], ['nightlife-luxe','Nightlife luxe'],
  ['utility-industrial','Utility / industrial'], ['sport-performance','Sport performance'], ['old-money-modern','Modern luxury']
] as const;

export function CharacterCreatorV2({ state, onStateChange }: { state: BootstrapState; onStateChange: (next: BootstrapState) => void }) {
  const initial = useMemo(() => normalizeVisualRecipe(state.character?.recipe), [state.character?.id]);
  const [recipe, setRecipe] = useState<CharacterVisualRecipeV2>(initial);
  const [displayName, setDisplayName] = useState(state.character?.displayName ?? 'Моят герой');
  const [tab, setTab] = useState<Tab>('identity');
  const [saveState, setSaveState] = useState<'idle'|'saving'|'saved'|'error'>('idle');
  const [error, setError] = useState('');
  const [promptMode, setPromptMode] = useState<PreviewMode>('full-body');
  const [creativeNote, setCreativeNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [aiState, setAiState] = useState<AiState>('idle');
  const [aiError, setAiError] = useState('');
  const [aiPreview, setAiPreview] = useState<string | null>(null);

  const basePrompt = useMemo(() => buildCharacterPrompt(recipe, promptMode), [recipe, promptMode]);
  const prompt = useMemo(() => creativeNote.trim()
    ? `${basePrompt}\nAdditional user direction: ${creativeNote.trim()}`
    : basePrompt, [basePrompt, creativeNote]);

  function patch(mutator: (current: CharacterVisualRecipeV2) => CharacterVisualRecipeV2) {
    setRecipe(current => mutator(current));
    setSaveState('idle');
    setAiPreview(null);
    setAiState('idle');
    setAiError('');
  }
  function setSex(body: CharacterSex) { patch(current => ({ ...current, body })); }
  function setAppearance<K extends keyof CharacterVisualRecipeV2['appearance']>(key: K, value: CharacterVisualRecipeV2['appearance'][K]) {
    patch(current => ({ ...current, appearance: { ...current.appearance, [key]: value } }));
  }
  function setGrooming<K extends keyof CharacterVisualRecipeV2['grooming']>(key: K, value: CharacterVisualRecipeV2['grooming'][K]) {
    patch(current => ({ ...current, grooming: { ...current.grooming, [key]: value } }));
  }
  async function save() {
    setSaveState('saving'); setError('');
    try {
      const next = await saveCharacter(displayName.trim() || 'Моят герой', recipe);
      onStateChange(next); setSaveState('saved');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason)); setSaveState('error');
    }
  }
  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true); window.setTimeout(() => setCopied(false), 1400);
  }
  async function generateAi() {
    setAiState('generating'); setAiError('');
    try {
      const result = await generateCharacterPreview(prompt, promptMode);
      setAiPreview(result.imageDataUrl); setAiState('ready');
    } catch (reason) {
      const raw = reason instanceof Error ? reason.message : String(reason);
      setAiError(raw.includes('OPENAI_API_KEY') || raw.includes('image_generation_not_configured')
        ? 'AI генерирането не е конфигурирано. Добави OPENAI_API_KEY в .env и рестартирай npm run dev.'
        : raw);
      setAiState('error');
    }
  }

  return (
    <section className="grid gap-4 2xl:grid-cols-[minmax(420px,.92fr)_minmax(600px,1.08fr)]">
      <div className="min-h-[620px] 2xl:sticky 2xl:top-4 2xl:h-[calc(100dvh-180px)]">
        {aiPreview ? (
          <div className="relative h-full min-h-[620px] overflow-hidden rounded-[28px] border border-fuchsia-300/20 bg-[#0d1117]">
            <img src={aiPreview} alt={`AI образ на ${displayName}`} className="h-full w-full object-cover" />
            <div className="absolute left-4 top-4 rounded-full border border-emerald-300/25 bg-black/55 px-3 py-1 text-[9px] font-black uppercase tracking-[.16em] text-emerald-200 backdrop-blur">GPT IMAGE · AI PREVIEW</div>
            <button onClick={() => { setAiPreview(null); setAiState('idle'); }} className="absolute bottom-4 right-4 rounded-xl border border-white/15 bg-black/55 px-3 py-2 text-[10px] font-bold text-white backdrop-blur">Покажи live draft</button>
          </div>
        ) : <StylizedCharacterPreview recipe={recipe} name={displayName} />}
      </div>

      <div className="glass-panel overflow-hidden">
        <header className="border-b border-white/8 px-4 py-4 md:px-5">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-black uppercase tracking-[.22em] text-amber-200">SOL DORADO · CHARACTER ART V2</div>
              <h1 className="mt-2 text-xl font-black text-white">Създаване на герой</h1>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">Илюстративен, vibrant и AI-first creator. Няма 3D дрехи, rigging или ръчно моделиране. Изборите стават стабилна рецепта, от която генерираме постоянен визуален образ.</p>
            </div>
            <button onClick={save} disabled={saveState === 'saving'} className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-black text-amber-100 disabled:opacity-50">
              {saveState === 'saving' ? 'Запазване…' : saveState === 'saved' ? 'Запазено ✓' : 'Запази героя'}
            </button>
          </div>
          {error && <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/8 px-3 py-2 text-xs text-red-100">{error}</div>}
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-white/8 px-3 py-2">
          {TABS.map(([id,label]) => <button key={id} onClick={() => setTab(id)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${tab === id ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}>{label}</button>)}
        </nav>

        <div className="max-h-[calc(100dvh-312px)] min-h-[480px] overflow-y-auto p-4 md:p-5">
          {tab === 'identity' && <IdentityPanel recipe={recipe} name={displayName} onName={value => { setDisplayName(value); setSaveState('idle'); setAiPreview(null); }} onSex={setSex} onAppearance={setAppearance} />}
          {tab === 'face' && <FacePanel recipe={recipe} onAppearance={setAppearance} />}
          {tab === 'hair' && <HairPanel recipe={recipe} onGrooming={setGrooming} />}
          {tab === 'clothes' && <ClothesPanel recipe={recipe} onGrooming={setGrooming} />}
          {tab === 'accessories' && <AccessoriesPanel recipe={recipe} onGrooming={setGrooming} />}
          {tab === 'style' && <StylePanel recipe={recipe} onGrooming={setGrooming} />}
          {tab === 'ai' && <AiPanel prompt={prompt} mode={promptMode} onMode={value => { setPromptMode(value); setAiPreview(null); setAiState('idle'); }} creativeNote={creativeNote} onCreativeNote={value => { setCreativeNote(value); setAiPreview(null); setAiState('idle'); }} copied={copied} onCopy={copyPrompt} aiState={aiState} aiError={aiError} onGenerate={generateAi} />}
        </div>
      </div>
    </section>
  );
}

function IdentityPanel({ recipe, name, onName, onSex, onAppearance }: {
  recipe: CharacterVisualRecipeV2; name: string; onName: (v: string) => void; onSex: (v: CharacterSex) => void;
  onAppearance: <K extends keyof CharacterVisualRecipeV2['appearance']>(key: K, value: CharacterVisualRecipeV2['appearance'][K]) => void;
}) {
  return <div className="space-y-6">
    <Section title="Самоличност" subtitle="Основата на героя. Бъдещите AI версии използват тези параметри като identity anchor.">
      <label className="block"><Small>Име на героя</Small><input value={name} maxLength={80} onChange={e => onName(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none focus:border-amber-300/40" /></label>
      <div className="grid grid-cols-2 gap-2">{(['male','female'] as CharacterSex[]).map(sex => <Choice key={sex} active={recipe.body === sex} title={sex === 'male' ? 'Мъж' : 'Жена'} subtitle={sex === 'male' ? 'Мъжка основа' : 'Женска основа'} onClick={() => onSex(sex)} />)}</div>
    </Section>
    <Section title="Телосложение" subtitle="Визуален descriptor за art generation, а не 3D mesh deformation.">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{([['slim','Слабо'],['average','Средно'],['athletic','Атлетично'],['heavy','Едро']] as Array<[BodyBuild,string]>).map(([id,label]) => <Choice key={id} active={recipe.appearance.bodyBuild === id} title={label} onClick={() => onAppearance('bodyBuild',id)} />)}</div>
      <Range label="Височина" value={recipe.appearance.height} onChange={v => onAppearance('height',v)} />
      <div className="grid grid-cols-3 gap-2">{([['young','Млад'],['adult','Зрял'],['mature','По-зрял']] as Array<[AgeBand,string]>).map(([id,label]) => <Choice key={id} active={recipe.appearance.ageBand === id} title={label} onClick={() => onAppearance('ageBand',id)} />)}</div>
    </Section>
  </div>;
}

function FacePanel({ recipe, onAppearance }: { recipe: CharacterVisualRecipeV2; onAppearance: <K extends keyof CharacterVisualRecipeV2['appearance']>(key: K, value: CharacterVisualRecipeV2['appearance'][K]) => void }) {
  return <div className="space-y-6">
    <Section title="Кожа и форма" subtitle="Контролируеми характеристики, които AI трябва да запазва между outfit версии.">
      <Small>Цвят на кожата</Small><div className="mt-2 flex flex-wrap gap-2">{SKINS.map(([id,color,label]) => <button key={id} title={label} onClick={() => onAppearance('skinTone',id)} className={`h-10 w-10 rounded-full border-2 ${recipe.appearance.skinTone === id ? 'border-amber-300' : 'border-white/10'}`} style={{backgroundColor:color}} />)}</div>
      <Small>Форма на лицето</Small><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{([['oval','Овално'],['angular','Ъгловато'],['round','Кръгло'],['heart','Сърцевидно']] as Array<[FaceShape,string]>).map(([id,label]) => <Choice key={id} active={recipe.appearance.faceShape === id} title={label} onClick={() => onAppearance('faceShape',id)} />)}</div>
      <div className="grid gap-3 sm:grid-cols-2"><Range label="Челюст" value={recipe.appearance.jaw} onChange={v => onAppearance('jaw',v)} /><Range label="Скули" value={recipe.appearance.cheekbones} onChange={v => onAppearance('cheekbones',v)} /></div>
    </Section>
    <Section title="Детайли на лицето">
      <Selector label="Нос" value={recipe.appearance.nose} options={[['straight','Прав'],['button','Къс'],['wide','Широк']]} onChange={v => onAppearance('nose',v)} />
      <Selector label="Устни" value={recipe.appearance.lips} options={[['thin','Тънки'],['medium','Средни'],['full','Плътни']]} onChange={v => onAppearance('lips',v)} />
      <Selector label="Форма на очите" value={recipe.appearance.eyeShape} options={[['almond','Бадемови'],['round','Кръгли'],['narrow','Тесни']]} onChange={v => onAppearance('eyeShape',v)} />
      <Small>Цвят на очите</Small><div className="mt-2 flex flex-wrap gap-2">{EYES.map(([id,color,label]) => <button key={id} onClick={() => onAppearance('eyeColor',id)} className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-bold ${recipe.appearance.eyeColor === id ? 'border-amber-300/50 bg-amber-300/10 text-amber-100' : 'border-white/10 text-slate-400'}`}><span className="h-3 w-3 rounded-full" style={{backgroundColor:color}} />{label}</button>)}</div>
      <Selector label="Вежди" value={recipe.appearance.eyebrows} options={[['natural','Естествени'],['bold','Плътни'],['clean','Изчистени']]} onChange={v => onAppearance('eyebrows',v)} />
    </Section>
  </div>;
}

function HairPanel({ recipe, onGrooming }: PanelProps) {
  return <div className="space-y-6"><Section title="Коса" subtitle="Metadata library вместо 3D assets. Нови стилове могат да се добавят от AI prompt без моделиране."><CatalogGrid slot="hair" recipe={recipe} value={recipe.grooming.hairStyle} onSelect={v => onGrooming('hairStyle',v)} /><Small>Цвят</Small><div className="mt-2 flex flex-wrap gap-2">{HAIR_COLORS.map(([id,color,label]) => <button key={id} title={label} onClick={() => onGrooming('hairColor',id)} className={`h-10 w-10 rounded-full border-2 ${recipe.grooming.hairColor === id ? 'border-amber-300' : 'border-white/10'}`} style={{backgroundColor:color}} />)}</div></Section>{recipe.body === 'male' && <Section title="Брада"><CatalogGrid slot="facialHair" recipe={recipe} value={recipe.grooming.facialHair} onSelect={v => onGrooming('facialHair',v)} /></Section>}</div>;
}
function ClothesPanel({ recipe, onGrooming }: PanelProps) { return <div className="space-y-6"><Section title="Горна част"><CatalogGrid slot="top" recipe={recipe} value={recipe.grooming.top} onSelect={v => onGrooming('top',v)} /></Section><Section title="Връхна дреха"><CatalogGrid slot="outerwear" recipe={recipe} value={recipe.grooming.outerwear} onSelect={v => onGrooming('outerwear',v)} /></Section><Section title="Долна част"><CatalogGrid slot="bottoms" recipe={recipe} value={recipe.grooming.bottoms} onSelect={v => onGrooming('bottoms',v)} /></Section><Section title="Обувки"><CatalogGrid slot="shoes" recipe={recipe} value={recipe.grooming.shoes} onSelect={v => onGrooming('shoes',v)} /></Section></div>; }
function AccessoriesPanel({ recipe, onGrooming }: PanelProps) { return <div className="space-y-6"><Section title="Очила"><CatalogGrid slot="eyewear" recipe={recipe} value={recipe.grooming.eyewear} onSelect={v => onGrooming('eyewear',v)} /></Section><Section title="Шапки"><CatalogGrid slot="headwear" recipe={recipe} value={recipe.grooming.headwear} onSelect={v => onGrooming('headwear',v)} /></Section><Section title="Бижута"><CatalogGrid slot="jewelry" recipe={recipe} value={recipe.grooming.jewelry} onSelect={v => onGrooming('jewelry',v)} /></Section><Section title="Други"><CatalogGrid slot="accessory" recipe={recipe} value={recipe.grooming.accessory} onSelect={v => onGrooming('accessory',v)} /></Section></div>; }
function StylePanel({ recipe, onGrooming }: PanelProps) { return <div className="space-y-6"><Section title="Визуална посока" subtitle="Тези тагове влияят на AI art direction, а не само на един конкретен outfit."><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{VIBES.map(([id,label]) => <Choice key={id} active={recipe.grooming.vibe === id} title={label} onClick={() => onGrooming('vibe',id)} />)}</div></Section><Section title="Акцентен цвят"><div className="flex flex-wrap gap-2">{ACCENTS.map(color => <button key={color} onClick={() => onGrooming('accentColor',color)} className={`h-11 w-11 rounded-xl border-2 ${recipe.grooming.accentColor === color ? 'border-white' : 'border-white/10'}`} style={{backgroundColor:color}} />)}</div></Section></div>; }

function AiPanel({ prompt, mode, onMode, creativeNote, onCreativeNote, copied, onCopy, aiState, aiError, onGenerate }: { prompt:string; mode:PreviewMode; onMode:(v:PreviewMode)=>void; creativeNote:string; onCreativeNote:(v:string)=>void; copied:boolean; onCopy:()=>void; aiState:AiState; aiError:string; onGenerate:()=>void }) {
  return <div className="space-y-5">
    <div className="rounded-2xl border border-fuchsia-300/15 bg-[linear-gradient(135deg,rgba(244,114,182,.08),rgba(56,189,248,.05))] p-4"><div className="text-[9px] font-black uppercase tracking-[.18em] text-fuchsia-200">GPT IMAGE GENERATION</div><h2 className="mt-2 text-base font-black text-white">Генерирай постоянен stylized образ</h2><p className="mt-2 text-xs leading-5 text-slate-400">Draft preview-ът е моментален. Тук вече можеш да генерираш истинска AI илюстрация от същата рецепта. При промяна на коса, лице или outfit резултатът се маркира като остарял и се генерира наново.</p></div>
    <div className="flex gap-2">{(['full-body','portrait'] as const).map(value => <button key={value} onClick={() => onMode(value)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${mode === value ? 'border-amber-300/40 bg-amber-300/10 text-amber-100' : 'border-white/10 text-slate-400'}`}>{value === 'full-body' ? 'Цял ръст' : 'Портрет'}</button>)}</div>
    <label className="block"><Small>Допълнителна инструкция</Small><textarea value={creativeNote} onChange={e => onCreativeNote(e.target.value)} rows={3} placeholder="Пример: по-смела streetwear визия, без лога, по-наситен sunset background" className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs leading-5 text-white outline-none focus:border-fuchsia-300/40" /></label>
    <button onClick={onGenerate} disabled={aiState === 'generating'} className="w-full rounded-xl border border-fuchsia-300/30 bg-fuchsia-300/10 px-4 py-3 text-xs font-black text-fuchsia-100 disabled:opacity-50">{aiState === 'generating' ? 'Генериране… може да отнеме до 2 минути' : aiState === 'ready' ? 'Генерирай нов вариант' : 'Генерирай AI образ'}</button>
    {aiError && <div className="rounded-xl border border-red-400/20 bg-red-400/8 p-3 text-xs leading-5 text-red-100">{aiError}</div>}
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="mb-3 flex items-center justify-between gap-3"><Small>Генериран prompt</Small><button onClick={onCopy} className="rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-bold text-slate-300 hover:text-white">{copied ? 'Копирано ✓' : 'Копирай'}</button></div><pre className="max-h-72 overflow-auto whitespace-pre-wrap font-sans text-[11px] leading-5 text-slate-400">{prompt}</pre></div>
    <div className="rounded-xl border border-amber-300/15 bg-amber-300/[.04] p-3 text-[10px] leading-5 text-slate-400"><b className="text-amber-200">Текущ MVP:</b> AI preview-ът е временен browser result и не се записва като binary asset в PostgreSQL. Следващият слой е object storage + canonical reference image, което ще позволи consistency при outfit-only edits.</div>
  </div>;
}

type PanelProps = { recipe: CharacterVisualRecipeV2; onGrooming: <K extends keyof CharacterVisualRecipeV2['grooming']>(key: K, value: CharacterVisualRecipeV2['grooming'][K]) => void };
function CatalogGrid({ slot, recipe, value, onSelect }: { slot:CharacterCatalogSlot; recipe:CharacterVisualRecipeV2; value:string; onSelect:(id:string)=>void }) { const entries = catalogFor(slot, recipe.body); return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{entries.map(entry => <button key={entry.id} onClick={() => onSelect(entry.id)} className={`overflow-hidden rounded-xl border text-left transition ${value === entry.id ? 'border-amber-300/50 bg-amber-300/[.08]' : 'border-white/8 bg-black/15 hover:border-white/15'}`}><div className="relative h-16 overflow-hidden" style={{background:`linear-gradient(135deg,${entry.primary},${entry.secondary})`}}><div className="absolute -right-3 -top-5 h-20 w-20 rounded-full border-[16px] border-white/10" /><div className="absolute bottom-2 left-2 rounded bg-black/25 px-1.5 py-1 text-[8px] font-black uppercase tracking-[.12em] text-white/70">{entry.renderKind}</div></div><div className="p-2.5"><b className="block text-[11px] text-slate-200">{entry.nameBg}</b><small className="mt-1 block truncate text-[8px] uppercase tracking-[.1em] text-slate-500">{entry.tags.join(' · ')}</small></div></button>)}</div>; }
function Section({ title, subtitle, children }: { title:string; subtitle?:string; children:ReactNode }) { return <section><h2 className="text-sm font-black text-slate-100">{title}</h2>{subtitle && <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>}<div className="mt-4 space-y-4">{children}</div></section>; }
function Small({ children }: { children:ReactNode }) { return <div className="text-[9px] font-black uppercase tracking-[.16em] text-slate-500">{children}</div>; }
function Choice({ active, title, subtitle, onClick }: { active:boolean; title:string; subtitle?:string; onClick:()=>void }) { return <button onClick={onClick} className={`rounded-xl border p-3 text-left ${active ? 'border-amber-300/45 bg-amber-300/[.08]' : 'border-white/8 bg-black/15 hover:border-white/15'}`}><b className="block text-xs text-slate-200">{title}</b>{subtitle && <small className="mt-1 block text-[9px] text-slate-500">{subtitle}</small>}</button>; }
function Range({ label, value, onChange }: { label:string; value:number; onChange:(v:number)=>void }) { return <label className="block rounded-xl border border-white/8 bg-black/15 p-3"><div className="flex items-center justify-between text-xs"><b className="text-slate-300">{label}</b><span className="font-black text-amber-200">{value > 0 ? `+${value}` : value}</span></div><input type="range" min={-100} max={100} value={value} onChange={e => onChange(Number(e.target.value))} className="mt-2 w-full accent-amber-300" /></label>; }
function Selector({ label, value, options, onChange }: { label:string; value:string; options:Array<[string,string]>; onChange:(v:string)=>void }) { return <div><Small>{label}</Small><div className="mt-2 flex flex-wrap gap-2">{options.map(([id,text]) => <button key={id} onClick={() => onChange(id)} className={`rounded-full border px-3 py-2 text-[10px] font-bold ${value === id ? 'border-amber-300/45 bg-amber-300/10 text-amber-100' : 'border-white/10 text-slate-400'}`}>{text}</button>)}</div></div>; }
