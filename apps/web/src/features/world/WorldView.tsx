import { WORLD_ACTIONS, type BootstrapState, type WorldActionId } from '@sol-dorado/contracts';
import { useI18n, type TranslationKey } from '../../i18n';

interface Props { state: BootstrapState; busy: WorldActionId | null; feedback: { title: string; message: string } | null; onAction: (id: WorldActionId) => void; }

export function WorldView({ state, busy, feedback, onAction }: Props) {
  const { t, runtime } = useI18n();
  const actionCopy: Record<WorldActionId, { label: TranslationKey; description: TranslationKey }> = {
    walk_market_street: { label: 'world.walk.label', description: 'world.walk.description' },
    work_delivery_shift: { label: 'world.work.label', description: 'world.work.description' },
    shoplift_corner_store: { label: 'world.crime.label', description: 'world.crime.description' }
  };
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,.8fr)]">
      <div className="world-scene">
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-5">
          <div>
            <span className="eyebrow">{t('world.liveDistrict')}</span>
            <h1 className="mt-2 text-2xl font-semibold">{t('world.title')}</h1>
            <p className="mt-1 max-w-md text-sm text-slate-400">{t('world.description')}</p>
          </div>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[9px] uppercase tracking-[0.16em] text-emerald-200">{t('world.calm')}</span>
        </div>
        <div className="road road-a" /><div className="road road-b" />
        <div className="building left-[9%] top-[36%] h-[24%] w-[24%]"><b>{t('world.apartment')}</b><small>{t('world.homeBlock')}</small></div>
        <div className="building right-[8%] top-[28%] h-[25%] w-[27%]"><b>{t('world.cornerStore')}</b><small>{t('world.storeState')}</small></div>
        <div className="building bottom-[8%] right-[28%] h-[19%] w-[25%]"><b>El Camino</b><small>{t('world.deliveryWork')}</small></div>
        <div className="player-marker"><span /><b>{t('world.you')}</b></div>
        <div className="absolute bottom-4 left-4 rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-[10px] text-slate-300 backdrop-blur-md">{state.location.streetSegment}</div>
      </div>

      <aside className="glass-panel p-4">
        <span className="eyebrow">{t('world.contextualActions')}</span>
        <div className="mt-4 space-y-2">
          {WORLD_ACTIONS.map(action => (
            <button key={action.id} disabled={busy !== null} onClick={() => onAction(action.id)} className={`action-button action-${action.kind}`}>
              <span><b>{busy === action.id ? t('world.resolving') : t(actionCopy[action.id].label)}</b><small>{t(actionCopy[action.id].description)}</small></span><i>→</i>
            </button>
          ))}
        </div>
        {feedback && <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/8 p-3"><b className="text-sm text-amber-100">{runtime(feedback.title)}</b><p className="mt-1 text-xs leading-5 text-slate-300">{runtime(feedback.message)}</p></div>}
        <p className="mt-4 text-[10px] leading-4 text-slate-500">{t('world.serverRule')}</p>
      </aside>
    </section>
  );
}
