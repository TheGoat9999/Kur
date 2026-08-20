import type { HudState } from '@sol-dorado/contracts';
import { GameIcon, type GameIconName } from './GameIcon';

const bars: ReadonlyArray<{
  key: 'health' | 'energy' | 'satiety' | 'hydration' | 'stress';
  label: string;
  icon: GameIconName;
  tone: string;
}> = [
  { key: 'health', label: 'Health', icon: 'heart', tone: 'emerald' },
  { key: 'energy', label: 'Energy', icon: 'zap', tone: 'amber' },
  { key: 'satiety', label: 'Satiety', icon: 'drumstick', tone: 'orange' },
  { key: 'hydration', label: 'Hydration', icon: 'droplet', tone: 'cyan' },
  { key: 'stress', label: 'Stress', icon: 'brain', tone: 'violet' }
];

export function Hud({ state }: { state: HudState }) {
  return (
    <div className="hud-strip">
      {bars.map(item => (
        <div className={`hud-meter hud-meter-${item.tone}`} key={item.key}>
          <span className="hud-meter-icon"><GameIcon name={item.icon} size={15} /></span>
          <span className="hud-meter-copy"><small>{item.label}</small><i><b style={{ width: `${state[item.key]}%` }} /></i></span>
          <strong>{state[item.key]}</strong>
        </div>
      ))}
      {state.policeHeat > 0 && (
        <div className="hud-meter hud-meter-red">
          <span className="hud-meter-icon"><GameIcon name="flame" size={15} /></span>
          <span className="hud-meter-copy"><small>Police heat</small><i><b style={{ width: `${state.policeHeat}%` }} /></i></span>
          <strong>{state.policeHeat}</strong>
        </div>
      )}
    </div>
  );
}
