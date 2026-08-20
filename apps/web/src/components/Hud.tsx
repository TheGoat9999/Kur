import type { HudState } from '@sol-dorado/contracts';
import { GameIcon, type GameIconName } from './GameIcon';
import { useI18n, type TranslationKey } from '../i18n';

const bars: ReadonlyArray<{
  key: 'health' | 'energy' | 'satiety' | 'hydration' | 'stress';
  label: TranslationKey;
  icon: GameIconName;
  tone: string;
}> = [
  { key: 'health', label: 'hud.health', icon: 'heart', tone: 'emerald' },
  { key: 'energy', label: 'hud.energy', icon: 'zap', tone: 'amber' },
  { key: 'satiety', label: 'hud.satiety', icon: 'drumstick', tone: 'orange' },
  { key: 'hydration', label: 'hud.hydration', icon: 'droplet', tone: 'cyan' },
  { key: 'stress', label: 'hud.stress', icon: 'brain', tone: 'violet' }
];

export function Hud({ state }: { state: HudState }) {
  const { t } = useI18n();
  return (
    <div className="hud-strip">
      {bars.map(item => (
        <div className={`hud-meter hud-meter-${item.tone}`} key={item.key}>
          <span className="hud-meter-icon"><GameIcon name={item.icon} size={15} /></span>
          <span className="hud-meter-copy"><small>{t(item.label)}</small><i><b style={{ width: `${state[item.key]}%` }} /></i></span>
          <strong>{state[item.key]}</strong>
        </div>
      ))}
      {state.policeHeat > 0 && (
        <div className="hud-meter hud-meter-red">
          <span className="hud-meter-icon"><GameIcon name="flame" size={15} /></span>
          <span className="hud-meter-copy"><small>{t('hud.policeHeat')}</small><i><b style={{ width: `${state.policeHeat}%` }} /></i></span>
          <strong>{state.policeHeat}</strong>
        </div>
      )}
    </div>
  );
}
