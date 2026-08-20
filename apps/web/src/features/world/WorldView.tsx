import { WORLD_ACTIONS, type BootstrapState, type WorldActionId } from '@sol-dorado/contracts';

interface Props { state: BootstrapState; busy: WorldActionId | null; feedback: { title: string; message: string } | null; onAction: (id: WorldActionId) => void; }

export function WorldView({ state, busy, feedback, onAction }: Props) {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,.8fr)]">
      <div className="world-scene">
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-5">
          <div>
            <span className="eyebrow">Live district</span>
            <h1 className="mt-2 text-2xl font-semibold">Las Palmas West</h1>
            <p className="mt-1 max-w-md text-sm text-slate-400">One connected MVP district. Streets, actions and consequences now resolve against backend state.</p>
          </div>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[9px] uppercase tracking-[0.16em] text-emerald-200">Calm</span>
        </div>
        <div className="road road-a" /><div className="road road-b" />
        <div className="building left-[9%] top-[36%] h-[24%] w-[24%]"><b>Apartment</b><small>Home block</small></div>
        <div className="building right-[8%] top-[28%] h-[25%] w-[27%]"><b>Corner store</b><small>Open · moderate traffic</small></div>
        <div className="building bottom-[8%] right-[28%] h-[19%] w-[25%]"><b>El Camino</b><small>Delivery work available</small></div>
        <div className="player-marker"><span /><b>You</b></div>
        <div className="absolute bottom-4 left-4 rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-[10px] text-slate-300 backdrop-blur-md">{state.location.streetSegment}</div>
      </div>

      <aside className="glass-panel p-4">
        <span className="eyebrow">Contextual actions</span>
        <div className="mt-4 space-y-2">
          {WORLD_ACTIONS.map(action => (
            <button key={action.id} disabled={busy !== null} onClick={() => onAction(action.id)} className={`action-button action-${action.kind}`}>
              <span><b>{busy === action.id ? 'Resolving…' : action.label}</b><small>{action.description}</small></span><i>→</i>
            </button>
          ))}
        </div>
        {feedback && <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/8 p-3"><b className="text-sm text-amber-100">{feedback.title}</b><p className="mt-1 text-xs leading-5 text-slate-300">{feedback.message}</p></div>}
        <p className="mt-4 text-[10px] leading-4 text-slate-500">No reward is applied in the browser. Each choice is resolved, persisted and versioned by the Node API.</p>
      </aside>
    </section>
  );
}
