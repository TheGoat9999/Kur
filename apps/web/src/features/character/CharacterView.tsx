import type { BootstrapState } from '@sol-dorado/contracts';
import { useI18n } from '../../i18n';

export function CharacterView({ state }: { state: BootstrapState }) {
  const { t, runtime } = useI18n();
  const recipe = state.character?.recipe;
  const appearance = recipe?.appearance ?? {};
  const grooming = recipe?.grooming ?? {};
  return (
    <section className="glass-panel overflow-hidden">
      <div className="grid min-h-[420px] md:grid-cols-[minmax(260px,.8fr)_1.2fr]">
        <div className="character-stage grid place-items-center border-b border-white/8 p-8 md:border-b-0 md:border-r">
          <div className="text-center"><div className="mx-auto grid h-28 w-28 place-items-center rounded-full border border-amber-200/20 bg-amber-200/8 text-4xl">◇</div><p className="mt-4 text-xs text-slate-500">{t('character.renderer')}</p></div>
        </div>
        <div className="p-6">
          <span className="eyebrow">{t('character.identity')}</span>
          <h1 className="mt-3 text-2xl font-semibold">{state.character ? runtime(state.character.displayName) : t('character.noCharacter')}</h1>
          <p className="mt-2 text-sm text-slate-400">{t('character.description')}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <ProfileValue label={t('character.id')} value={state.character?.id ?? '—'} />
            <ProfileValue label={t('character.body')} value={recipe?.body ?? '—'} />
            <ProfileValue label={t('character.age')} value={String(appearance.age ?? '—')} />
            <ProfileValue label={t('character.hair')} value={String(grooming.hairStyle ?? '—')} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProfileValue({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/8 bg-black/15 p-3"><small className="text-[9px] uppercase tracking-[0.18em] text-slate-500">{label}</small><b className="mt-1 block truncate text-sm text-slate-200">{value}</b></div>;
}
