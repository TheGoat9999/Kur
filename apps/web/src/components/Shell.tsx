import { useState, type ReactNode } from 'react';
import type { BootstrapState } from '@sol-dorado/contracts';
import { Hud } from './Hud';
import { GameIcon, type GameIconName } from './GameIcon';
import { useI18n, type TranslationKey } from '../i18n';

export type Screen = 'world' | 'character' | 'inventory' | 'finance' | 'vehicles' | 'property' | 'jobs' | 'hospitality' | 'police';
type FeatureStage = 'live' | 'foundation' | 'migration';

const groups: ReadonlyArray<{
  label: TranslationKey;
  items: ReadonlyArray<{ id: Screen; icon: GameIconName; label: TranslationKey; stage: FeatureStage }>;
}> = [
  { label: 'nav.city', items: [
    { id: 'world', icon: 'world', label: 'nav.world', stage: 'live' },
    { id: 'character', icon: 'user', label: 'nav.character', stage: 'foundation' },
    { id: 'inventory', icon: 'package', label: 'nav.inventory', stage: 'live' }
  ] },
  { label: 'nav.progression', items: [
    { id: 'finance', icon: 'landmark', label: 'nav.finance', stage: 'live' },
    { id: 'jobs', icon: 'briefcase', label: 'nav.jobs', stage: 'migration' }
  ] },
  { label: 'nav.assets', items: [
    { id: 'vehicles', icon: 'car', label: 'nav.vehicles', stage: 'migration' },
    { id: 'property', icon: 'building', label: 'nav.property', stage: 'migration' }
  ] },
  { label: 'nav.institutions', items: [
    { id: 'hospitality', icon: 'utensils', label: 'nav.hospitality', stage: 'migration' },
    { id: 'police', icon: 'shield', label: 'nav.police', stage: 'migration' }
  ] }
];

interface Props {
  state: BootstrapState;
  screen: Screen;
  menuOpen: boolean;
  onScreen: (screen: Screen) => void;
  onMenu: (open: boolean) => void;
  children: ReactNode;
}

export function Shell({ state, screen, menuOpen, onScreen, onMenu, children }: Props) {
  const { locale, setLocale, t, money, runtime } = useI18n();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sd_sidebar_collapsed') === 'true');
  const active = groups.flatMap(group => group.items).find(item => item.id === screen)!;
  const serverTime = new Date(state.serverTime);

  function toggleCollapsed() {
    setCollapsed(value => {
      localStorage.setItem('sd_sidebar_collapsed', String(!value));
      return !value;
    });
  }

  return (
    <div className={`game-shell ${collapsed ? 'game-shell-collapsed' : ''}`}>
      <button aria-label={t('shell.closeNavigation')} className={`nav-scrim ${menuOpen ? 'nav-scrim-open' : ''}`} onClick={() => onMenu(false)} />
      <aside className={`game-sidebar ${menuOpen ? 'game-sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><span>SD</span><i /></div>
          <div className="brand-copy"><b>SOL DORADO</b><small>{t('shell.persistentCity')}</small></div>
          <button className="sidebar-collapse" aria-label={collapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')} onClick={toggleCollapsed}>
            <GameIcon name={collapsed ? 'panel-left-open' : 'panel-left-close'} size={16} />
          </button>
        </div>

        <nav className="game-nav" aria-label={t('shell.navigation')}>
          {groups.map(group => (
            <div className="nav-group" key={group.label}>
              <div className="nav-group-label">{t(group.label)}</div>
              {group.items.map(item => (
                <button
                  key={item.id}
                  className={`game-nav-item ${screen === item.id ? 'game-nav-item-active' : ''}`}
                  title={collapsed ? t(item.label) : undefined}
                  onClick={() => { onScreen(item.id); onMenu(false); }}
                >
                  <span className="nav-icon"><GameIcon name={item.icon} size={18} /></span>
                  <span className="nav-copy"><b>{t(item.label)}</b><small>{stageLabel(item.stage, t)}</small></span>
                  <span className={`stage-dot stage-dot-${item.stage}`} />
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-player">
          <div className="player-avatar">{state.character?.displayName.slice(0, 2).toUpperCase() ?? 'MC'}</div>
          <div className="sidebar-player-copy"><b>{state.character ? runtime(state.character.displayName) : t('shell.noCharacter')}</b><small><span /> {t('shell.sessionOnline')}</small></div>
          <GameIcon name="wifi" size={15} />
        </div>
      </aside>

      <div className="game-stage">
        <header className="game-header">
          <button className="desktop-menu-button" onClick={() => onMenu(true)} aria-label={t('shell.openNavigation')}>☰</button>
          <div className="header-context">
            <span>{t(active.label)}</span>
            <b>{state.location.district}</b>
            <small><GameIcon name="map-pin" size={12} /> {state.location.streetSegment}</small>
          </div>
          <div className="header-spacer" />
          <div className="language-toggle" role="group" aria-label={t('common.language')}>
            <GameIcon name="languages" size={15} />
            {(['bg', 'en'] as const).map(value => <button key={value} className={locale === value ? 'language-option language-option-active' : 'language-option'} onClick={() => setLocale(value)}>{value.toUpperCase()}</button>)}
          </div>
          <div className="header-status"><GameIcon name="clock" size={14} /><span><small>{t('shell.serverTime')}</small><b>{serverTime.toLocaleTimeString(locale === 'bg' ? 'bg-BG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</b></span></div>
          <div className="header-status header-status-online"><GameIcon name="wifi" size={14} /><span><small>{t('shell.shard')}</small><b>Dorado One</b></span></div>
          <div className="cash-balance"><GameIcon name="coins" size={17} /><span><small>{t('shell.cash')}</small><b>{money(state.hud.cashCents)}</b></span></div>
        </header>

        <div className="hud-wrap"><Hud state={state.hud} /></div>
        <main className="game-content">{children}</main>
      </div>
    </div>
  );
}

function stageLabel(stage: FeatureStage, t: (key: TranslationKey) => string) {
  if (stage === 'live') return t('stage.live');
  if (stage === 'foundation') return t('stage.foundation');
  return t('stage.migration');
}
