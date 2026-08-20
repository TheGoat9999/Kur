import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { BootstrapState, HudState } from '@sol-dorado/contracts';
import { GameIcon, type GameIconName } from './GameIcon';
import { useI18n, type TranslationKey } from '../i18n';

type StatKey = 'health' | 'energy' | 'satiety' | 'hydration' | 'stress';
type WidgetKey = StatKey | 'policeHeat' | 'location' | 'cash';
type HudPreset = 'dorado' | 'compact' | 'minimal' | 'dynamic';
type HudAnchor = 'bottom-left' | 'bottom-center' | 'top-left';

interface HudPreferences {
  preset: HudPreset;
  anchor: HudAnchor;
  scale: number;
  opacity: number;
  showValues: boolean;
  widgets: Record<WidgetKey, boolean>;
}

const STORAGE_KEY = 'sd_hud_settings_v3';

const DEFAULT_PREFERENCES: HudPreferences = {
  preset: 'dorado',
  anchor: 'bottom-left',
  scale: 1,
  opacity: 0.98,
  showValues: true,
  widgets: {
    health: true,
    energy: true,
    satiety: true,
    hydration: true,
    stress: true,
    policeHeat: true,
    location: true,
    cash: true
  }
};

const stats: ReadonlyArray<{
  key: StatKey;
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

const dynamicThresholds: Record<StatKey, number> = {
  health: 100,
  energy: 76,
  satiety: 71,
  hydration: 71,
  stress: 20
};

export function Hud({ state, location, worldMode = false }: { state: HudState; location: BootstrapState['location']; worldMode?: boolean }) {
  const { t, locale } = useI18n();
  const [preferences, setPreferences] = useState<HudPreferences>(readPreferences);
  const [editorOpen, setEditorOpen] = useState(false);
  const [cashDelta, setCashDelta] = useState<number | null>(null);
  const previousCash = useRef(state.cashCents);

  const copy = locale === 'bg'
    ? {
        customize: 'Настрой HUD', close: 'Затвори', title: 'HUD настройки', subtitle: 'Персонален изглед, запазен на това устройство.',
        preset: 'Изглед', scale: 'Размер', opacity: 'Прозрачност', values: 'Покажи стойности', widgets: 'Елементи', position: 'Позиция',
        reset: 'Върни по подразбиране', dorado: 'Dorado', compact: 'Компактен', minimal: 'Минимален', dynamic: 'Динамичен',
        bottomLeft: 'Долу ляво', bottomCenter: 'Долу център', topLeft: 'Горе ляво', cash: 'Пари', location: 'Локация'
      }
    : {
        customize: 'Customize HUD', close: 'Close', title: 'HUD settings', subtitle: 'Personal layout saved on this device.',
        preset: 'Preset', scale: 'Scale', opacity: 'Opacity', values: 'Show values', widgets: 'Widgets', position: 'Position',
        reset: 'Reset defaults', dorado: 'Dorado', compact: 'Compact', minimal: 'Minimal', dynamic: 'Dynamic',
        bottomLeft: 'Bottom left', bottomCenter: 'Bottom center', topLeft: 'Top left', cash: 'Cash', location: 'Location'
      };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    if (previousCash.current === state.cashCents) return;
    const delta = state.cashCents - previousCash.current;
    previousCash.current = state.cashCents;
    setCashDelta(delta);
    const timer = window.setTimeout(() => setCashDelta(null), 2600);
    return () => window.clearTimeout(timer);
  }, [state.cashCents]);

  const frameStyle = {
    opacity: preferences.opacity,
    transform: `scale(${preferences.scale})`
  } as CSSProperties;

  function patch<K extends keyof HudPreferences>(key: K, value: HudPreferences[K]) {
    setPreferences(current => ({ ...current, [key]: value }));
  }

  function toggleWidget(key: WidgetKey) {
    setPreferences(current => ({
      ...current,
      widgets: { ...current.widgets, [key]: !current.widgets[key] }
    }));
  }

  function shouldShowStat(key: StatKey) {
    if (!preferences.widgets[key]) return false;
    const value = state[key];
    if (preferences.preset === 'minimal') {
      if (key === 'health') return value < 100;
      if (key === 'energy') return value < 55;
      if (key === 'satiety' || key === 'hydration') return value < 45;
      return value > 45;
    }
    if (preferences.preset !== 'dynamic') return true;
    return key === 'stress' ? value > dynamicThresholds[key] : value < dynamicThresholds[key];
  }

  const visibleStats = stats.filter(item => shouldShowStat(item.key));
  const policeVisible = preferences.widgets.policeHeat && state.policeHeat > 0;

  return (
    <div className={`player-hud ${worldMode ? 'player-hud-world' : ''} hud-anchor-${preferences.anchor} hud-preset-${preferences.preset}`}>
      <div className="player-hud-frame" style={frameStyle}>
        <div className="hud-main-row">
          {preferences.widgets.location && (
            <div className="hud-location-card" key={`${location.district}-${location.streetSegment}`}>
              <span><GameIcon name="map-pin" size={15} /> {location.district}</span>
              <b>{location.streetSegment}</b>
            </div>
          )}

          {(visibleStats.length > 0 || policeVisible) && (
            <div className="hud-vitals-cluster" aria-label="Player status">
              {visibleStats.map(item => {
                const value = state[item.key];
                const progress = Math.max(0, Math.min(100, value));
                const danger = item.key === 'stress' ? value >= 75 : value <= 25;
                const attention = !danger && (item.key === 'stress' ? value >= 50 : value <= 50);
                return (
                  <div
                    className={`hud-stat hud-stat-${item.tone} ${attention ? 'hud-stat-attention' : ''} ${danger ? 'hud-stat-danger' : ''}`}
                    key={item.key}
                    title={`${t(item.label)}: ${value}`}
                    aria-label={`${t(item.label)}: ${value}`}
                    style={{ '--hud-progress': `${progress}%` } as CSSProperties}
                  >
                    <span className="hud-stat-icon"><GameIcon name={item.icon} size={18} /></span>
                    <span className="hud-stat-body">
                      <small>{t(item.label)}</small>
                      <i><b style={{ width: `${progress}%` }} /></i>
                    </span>
                    {preferences.showValues && <strong>{value}</strong>}
                  </div>
                );
              })}

              {policeVisible && (
                <div
                  className={`hud-stat hud-stat-red hud-police ${state.policeHeat >= 35 ? 'hud-stat-attention' : ''} ${state.policeHeat >= 70 ? 'hud-stat-danger' : ''}`}
                  title={`${t('hud.policeHeat')}: ${state.policeHeat}`}
                  aria-label={`${t('hud.policeHeat')}: ${state.policeHeat}`}
                  style={{ '--hud-progress': `${Math.max(0, Math.min(100, state.policeHeat))}%` } as CSSProperties}
                >
                  <span className="hud-stat-icon"><GameIcon name="flame" size={18} /></span>
                  <span className="hud-stat-body">
                    <small>{t('hud.policeHeat')}</small>
                    <i><b style={{ width: `${Math.max(0, Math.min(100, state.policeHeat))}%` }} /></i>
                  </span>
                  {preferences.showValues && <strong>{state.policeHeat}</strong>}
                </div>
              )}
            </div>
          )}

          {preferences.widgets.cash && (
            <div className="hud-cash-card">
              <span className="hud-cash-icon"><GameIcon name="coins" size={18} /></span>
              <span><small>{copy.cash}</small><b>{formatUsd(state.cashCents)}</b></span>
              {cashDelta !== null && cashDelta !== 0 && (
                <em className={cashDelta > 0 ? 'hud-cash-delta-positive' : 'hud-cash-delta-negative'} aria-live="polite">
                  {cashDelta > 0 ? '+' : '-'}{formatUsd(Math.abs(cashDelta))}
                </em>
              )}
            </div>
          )}

          <button className={`hud-edit-button ${editorOpen ? 'hud-edit-button-active' : ''}`} onClick={() => setEditorOpen(open => !open)} title={copy.customize} aria-label={copy.customize}>
            <GameIcon name="sparkles" size={17} />
            <span>HUD</span>
          </button>
        </div>
      </div>

      {editorOpen && (
        <section className="hud-editor" aria-label={copy.title}>
          <header>
            <div><small>SOL DORADO</small><b>{copy.title}</b><p>{copy.subtitle}</p></div>
            <button onClick={() => setEditorOpen(false)} aria-label={copy.close}><GameIcon name="x" size={15} /></button>
          </header>

          <div className="hud-editor-section">
            <label>{copy.preset}</label>
            <div className="hud-preset-grid">
              {(['dorado', 'compact', 'minimal', 'dynamic'] as HudPreset[]).map(preset => (
                <button key={preset} className={preferences.preset === preset ? 'hud-choice-active' : ''} onClick={() => patch('preset', preset)}>
                  {copy[preset]}
                </button>
              ))}
            </div>
          </div>

          <div className="hud-editor-section">
            <label>{copy.position}</label>
            <div className="hud-anchor-grid">
              {([
                ['bottom-left', copy.bottomLeft],
                ['bottom-center', copy.bottomCenter],
                ['top-left', copy.topLeft]
              ] as Array<[HudAnchor, string]>).map(([anchor, label]) => (
                <button key={anchor} className={preferences.anchor === anchor ? 'hud-choice-active' : ''} onClick={() => patch('anchor', anchor)}>{label}</button>
              ))}
            </div>
          </div>

          <div className="hud-slider-row">
            <label>{copy.scale}<strong>{Math.round(preferences.scale * 100)}%</strong></label>
            <input type="range" min="0.85" max="1.3" step="0.05" value={preferences.scale} onChange={event => patch('scale', Number(event.target.value))} />
          </div>
          <div className="hud-slider-row">
            <label>{copy.opacity}<strong>{Math.round(preferences.opacity * 100)}%</strong></label>
            <input type="range" min="0.65" max="1" step="0.05" value={preferences.opacity} onChange={event => patch('opacity', Number(event.target.value))} />
          </div>

          <div className="hud-editor-section">
            <label>{copy.widgets}</label>
            <div className="hud-widget-grid">
              {stats.map(item => (
                <button key={item.key} className={preferences.widgets[item.key] ? 'hud-toggle-active' : ''} onClick={() => toggleWidget(item.key)}>
                  <GameIcon name={item.icon} size={14} /><span>{t(item.label)}</span><i />
                </button>
              ))}
              <button className={preferences.widgets.policeHeat ? 'hud-toggle-active' : ''} onClick={() => toggleWidget('policeHeat')}><GameIcon name="flame" size={14} /><span>{t('hud.policeHeat')}</span><i /></button>
              <button className={preferences.widgets.location ? 'hud-toggle-active' : ''} onClick={() => toggleWidget('location')}><GameIcon name="map-pin" size={14} /><span>{copy.location}</span><i /></button>
              <button className={preferences.widgets.cash ? 'hud-toggle-active' : ''} onClick={() => toggleWidget('cash')}><GameIcon name="coins" size={14} /><span>{copy.cash}</span><i /></button>
            </div>
          </div>

          <div className="hud-editor-footer">
            <label className="hud-value-toggle"><input type="checkbox" checked={preferences.showValues} onChange={event => patch('showValues', event.target.checked)} /><span />{copy.values}</label>
            <button onClick={() => setPreferences(DEFAULT_PREFERENCES)}>{copy.reset}</button>
          </div>
        </section>
      )}
    </div>
  );
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(cents / 100);
}

function readPreferences(): HudPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<HudPreferences>;
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      widgets: { ...DEFAULT_PREFERENCES.widgets, ...(parsed.widgets ?? {}) }
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}
