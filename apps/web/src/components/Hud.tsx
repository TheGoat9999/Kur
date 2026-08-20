import type { HudState } from '@sol-dorado/contracts';

const bars: ReadonlyArray<{ key: keyof HudState; label: string; color: string }> = [
  { key: 'health', label: 'Health', color: 'bg-emerald-400' },
  { key: 'energy', label: 'Energy', color: 'bg-amber-300' },
  { key: 'satiety', label: 'Satiety', color: 'bg-orange-300' },
  { key: 'hydration', label: 'Hydration', color: 'bg-cyan-300' },
  { key: 'stress', label: 'Stress', color: 'bg-violet-400' }
];

export function Hud({ state }: { state: HudState }) {
  return (
    <div className="hud-grid">
      {bars.map(item => (
        <div className="hud-stat" key={item.key}>
          <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.16em] text-slate-400">
            <span>{item.label}</span><strong className="text-slate-100">{state[item.key]}</strong>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
            <div className={`h-full rounded-full ${item.color}`} style={{ width: `${state[item.key]}%` }} />
          </div>
        </div>
      ))}
      {state.policeHeat > 0 && (
        <div className="hud-stat border-red-400/30 bg-red-400/8">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-red-200">
            <span>Police heat</span><strong>{state.policeHeat}</strong>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-red-400" style={{ width: `${state.policeHeat}%` }} /></div>
        </div>
      )}
    </div>
  );
}
