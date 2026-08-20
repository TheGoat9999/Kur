import { useState, type ReactNode } from 'react';
import type { BootstrapState } from '@sol-dorado/contracts';
import { Hud } from './Hud';
import { GameIcon, type GameIconName } from './GameIcon';

export type Screen = 'world' | 'character' | 'inventory' | 'finance' | 'vehicles' | 'property' | 'jobs' | 'hospitality' | 'police';
type FeatureStage = 'live' | 'foundation' | 'migration';

const groups: ReadonlyArray<{
  label: string;
  items: ReadonlyArray<{ id: Screen; icon: GameIconName; label: string; stage: FeatureStage }>;
}> = [
  { label: 'City', items: [
    { id: 'world', icon: 'world', label: 'World', stage: 'live' },
    { id: 'character', icon: 'user', label: 'Character', stage: 'foundation' },
    { id: 'inventory', icon: 'package', label: 'Inventory', stage: 'live' }
  ] },
  { label: 'Progression', items: [
    { id: 'finance', icon: 'landmark', label: 'Finance', stage: 'migration' },
    { id: 'jobs', icon: 'briefcase', label: 'Jobs & Careers', stage: 'migration' }
  ] },
  { label: 'Assets', items: [
    { id: 'vehicles', icon: 'car', label: 'My Vehicles', stage: 'migration' },
    { id: 'property', icon: 'building', label: 'Real Estate', stage: 'migration' }
  ] },
  { label: 'Institutions', items: [
    { id: 'hospitality', icon: 'utensils', label: 'Hospitality', stage: 'migration' },
    { id: 'police', icon: 'shield', label: 'Police', stage: 'migration' }
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
      <button aria-label="Close navigation" className={`nav-scrim ${menuOpen ? 'nav-scrim-open' : ''}`} onClick={() => onMenu(false)} />
      <aside className={`game-sidebar ${menuOpen ? 'game-sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><span>SD</span><i /></div>
          <div className="brand-copy"><b>SOL DORADO</b><small>Persistent city</small></div>
          <button className="sidebar-collapse" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={toggleCollapsed}>
            <GameIcon name={collapsed ? 'panel-left-open' : 'panel-left-close'} size={16} />
          </button>
        </div>

        <nav className="game-nav" aria-label="Game navigation">
          {groups.map(group => (
            <div className="nav-group" key={group.label}>
              <div className="nav-group-label">{group.label}</div>
              {group.items.map(item => (
                <button
                  key={item.id}
                  className={`game-nav-item ${screen === item.id ? 'game-nav-item-active' : ''}`}
                  title={collapsed ? item.label : undefined}
                  onClick={() => { onScreen(item.id); onMenu(false); }}
                >
                  <span className="nav-icon"><GameIcon name={item.icon} size={18} /></span>
                  <span className="nav-copy"><b>{item.label}</b><small>{stageLabel(item.stage)}</small></span>
                  <span className={`stage-dot stage-dot-${item.stage}`} />
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-player">
          <div className="player-avatar">{state.character?.displayName.slice(0, 2).toUpperCase() ?? 'MC'}</div>
          <div className="sidebar-player-copy"><b>{state.character?.displayName ?? 'No active character'}</b><small><span /> Session online</small></div>
          <GameIcon name="wifi" size={15} />
        </div>
      </aside>

      <div className="game-stage">
        <header className="game-header">
          <button className="desktop-menu-button" onClick={() => onMenu(true)} aria-label="Open navigation">☰</button>
          <div className="header-context">
            <span>{active.label}</span>
            <b>{state.location.district}</b>
            <small><GameIcon name="map-pin" size={12} /> {state.location.streetSegment}</small>
          </div>
          <div className="header-spacer" />
          <div className="header-status"><GameIcon name="clock" size={14} /><span><small>Server time</small><b>{serverTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</b></span></div>
          <div className="header-status header-status-online"><GameIcon name="wifi" size={14} /><span><small>Shard</small><b>Dorado One</b></span></div>
          <div className="cash-balance"><GameIcon name="coins" size={17} /><span><small>Cash</small><b>${(state.hud.cashCents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}</b></span></div>
        </header>

        <div className="hud-wrap"><Hud state={state.hud} /></div>
        <main className="game-content">{children}</main>
      </div>
    </div>
  );
}

function stageLabel(stage: FeatureStage) {
  if (stage === 'live') return 'Playable';
  if (stage === 'foundation') return 'Foundation';
  return 'Prototype migration';
}
