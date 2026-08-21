import { useEffect, useState, type ReactNode } from 'react';
import type { BootstrapState } from '@sol-dorado/contracts';
import { Hud } from './Hud';
import { GameIcon, type GameIconName } from './GameIcon';
import { useI18n, type TranslationKey } from '../i18n';

export type Screen = 'world' | 'character' | 'inventory' | 'finance' | 'vehicles' | 'property' | 'jobs' | 'hospitality' | 'police';
type FeatureStage = 'live' | 'foundation' | 'migration';
type RightNavDensity = 'compact' | 'comfortable' | 'large';

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
    { id: 'property', icon: 'building', label: 'nav.property', stage: 'live' }
  ] },
  { label: 'nav.institutions', items: [
    { id: 'hospitality', icon: 'utensils', label: 'nav.hospitality', stage: 'migration' },
    { id: 'police', icon: 'shield', label: 'nav.police', stage: 'migration' }
  ] }
];

const navItems = groups.flatMap(group => group.items);
const defaultRightOrder = navItems.map(item => item.id);
const RIGHT_NAV_STORAGE = 'sd_right_nav_settings_v1';

interface RightNavPreferences {
  order: Screen[];
  visible: Record<Screen, boolean>;
  density: RightNavDensity;
  showStages: boolean;
}

const DEFAULT_RIGHT_NAV: RightNavPreferences = {
  order: [...defaultRightOrder],
  visible: {
    world: true,
    character: true,
    inventory: true,
    finance: true,
    vehicles: false,
    property: true,
    jobs: true,
    hospitality: true,
    police: true
  },
  density: 'comfortable',
  showStages: true
};

interface Props {
  state: BootstrapState;
  screen: Screen;
  inventoryOpen: boolean;
  menuOpen: boolean;
  onScreen: (screen: Screen) => void;
  onMenu: (open: boolean) => void;
  children: ReactNode;
}

export function Shell({ state, screen, inventoryOpen, menuOpen, onScreen, onMenu, children }: Props) {
  const { locale, setLocale, t, runtime } = useI18n();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sd_sidebar_collapsed') === 'true');
  const [rightNav, setRightNav] = useState<RightNavPreferences>(readRightNavPreferences);
  const [rightNavEditorOpen, setRightNavEditorOpen] = useState(false);
  const activeLabel = navItems.find(item => item.id === screen)?.label ?? (screen === 'vehicles' ? 'nav.vehicles' : 'nav.world');
  const serverTime = new Date(state.serverTime);
  const rightCopy = locale === 'bg'
    ? {
        customize: 'Настрой дясната навигация', title: 'Дясна навигация', subtitle: 'Избери кои секции да виждаш и в какъв ред.',
        density: 'Размер', compact: 'Компактна', comfortable: 'Стандартна', large: 'Голяма', stages: 'Покажи статусите',
        reset: 'Нулирай', close: 'Затвори', up: 'Нагоре', down: 'Надолу', visible: 'Покажи'
      }
    : {
        customize: 'Customize right navigation', title: 'Right navigation', subtitle: 'Choose which sections stay visible and in what order.',
        density: 'Size', compact: 'Compact', comfortable: 'Comfortable', large: 'Large', stages: 'Show stage indicators',
        reset: 'Reset', close: 'Close', up: 'Move up', down: 'Move down', visible: 'Show'
      };
  const legalCopy = locale === 'bg'
    ? { copyright: '© 2026 SOL DORADO', note: 'Независима браузър игра' }
    : { copyright: '© 2026 SOL DORADO', note: 'Independent browser game' };

  useEffect(() => {
    localStorage.setItem(RIGHT_NAV_STORAGE, JSON.stringify(rightNav));
  }, [rightNav]);

  function toggleCollapsed() {
    setCollapsed(value => {
      localStorage.setItem('sd_sidebar_collapsed', String(!value));
      return !value;
    });
  }

  function navigate(next: Screen) {
    onScreen(next);
    onMenu(false);
  }

  function toggleRightItem(id: Screen) {
    setRightNav(current => ({ ...current, visible: { ...current.visible, [id]: !current.visible[id] } }));
  }

  function moveRightItem(id: Screen, direction: -1 | 1) {
    setRightNav(current => {
      const index = current.order.indexOf(id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.order.length) return current;
      const order = [...current.order];
      [order[index], order[target]] = [order[target], order[index]];
      return { ...current, order };
    });
  }

  function isNavItemActive(id: Screen) {
    return id === 'inventory' ? inventoryOpen : screen === id && !inventoryOpen;
  }

  const orderedRightItems = rightNav.order
    .map(id => navItems.find(item => item.id === id))
    .filter((item): item is (typeof navItems)[number] => Boolean(item));

  return (
    <div className={`game-shell ${collapsed ? 'game-shell-collapsed' : ''}`}>
      <button aria-label={t('shell.closeNavigation')} className={`nav-scrim ${menuOpen ? 'nav-scrim-open' : ''}`} onClick={() => onMenu(false)} />

      <header className="game-header">
        <button className="desktop-menu-button" onClick={() => onMenu(true)} aria-label={t('shell.openNavigation')}>☰</button>
        <div className="header-context header-context-screen">
          <span>SOL DORADO</span>
          <b>{t(activeLabel)}</b>
        </div>
        <div className="header-spacer" />
        <div className="language-toggle" role="group" aria-label={t('common.language')}>
          <GameIcon name="languages" size={15} />
          {(['bg', 'en'] as const).map(value => <button key={value} className={locale === value ? 'language-option language-option-active' : 'language-option'} onClick={() => setLocale(value)}>{value.toUpperCase()}</button>)}
        </div>
        <div className="header-status"><GameIcon name="clock" size={14} /><span><small>{t('shell.serverTime')}</small><b>{serverTime.toLocaleTimeString(locale === 'bg' ? 'bg-BG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</b></span></div>
        <div className="header-status header-status-online"><GameIcon name="wifi" size={14} /><span><small>{t('shell.shard')}</small><b>Dorado One</b></span></div>
      </header>

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
                  className={`game-nav-item ${isNavItemActive(item.id) ? 'game-nav-item-active' : ''}`}
                  title={item.id === 'inventory' ? `${t(item.label)} · I` : collapsed ? t(item.label) : undefined}
                  onClick={() => navigate(item.id)}
                >
                  <span className="nav-icon"><GameIcon name={item.icon} size={18} /></span>
                  <span className="nav-copy"><b>{t(item.label)}</b><small>{item.id === 'inventory' ? `${stageLabel(item.stage, t)} · I` : stageLabel(item.stage, t)}</small></span>
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
        <div className="sidebar-legal" title={`${legalCopy.copyright} · ${legalCopy.note}`}>
          <span>{legalCopy.copyright}</span>
          <small>{legalCopy.note}</small>
        </div>
      </aside>

      <div className={`game-stage game-stage-${screen}`}>
        <Hud state={state.hud} location={state.location} worldMode={screen === 'world'} />
        <main className="game-content">{children}</main>
      </div>

      <nav className={`right-nav-rail right-nav-density-${rightNav.density}`} aria-label={t('shell.navigation')}>
        <div className="right-nav-items">
          {orderedRightItems.filter(item => rightNav.visible[item.id]).map(item => (
            <button
              key={item.id}
              className={`right-nav-item ${isNavItemActive(item.id) ? 'right-nav-item-active' : ''}`}
              onClick={() => navigate(item.id)}
              aria-label={t(item.label)}
              title={t(item.label)}
            >
              <GameIcon name={item.icon} size={rightNav.density === 'large' ? 21 : rightNav.density === 'compact' ? 17 : 19} />
              {rightNav.showStages && <span className={`right-nav-stage right-nav-stage-${item.stage}`} />}
              <span className="right-nav-tooltip">{t(item.label)}</span>
            </button>
          ))}
        </div>
        <button className={`right-nav-customize ${rightNavEditorOpen ? 'right-nav-customize-active' : ''}`} onClick={() => setRightNavEditorOpen(open => !open)} title={rightCopy.customize} aria-label={rightCopy.customize}>
          <GameIcon name="sparkles" size={16} />
        </button>
      </nav>

      {rightNavEditorOpen && (
        <section className="right-nav-editor" aria-label={rightCopy.title}>
          <header>
            <div><small>SOL DORADO</small><b>{rightCopy.title}</b><p>{rightCopy.subtitle}</p></div>
            <button onClick={() => setRightNavEditorOpen(false)} aria-label={rightCopy.close}><GameIcon name="x" size={15} /></button>
          </header>

          <div className="right-nav-editor-section">
            <label>{rightCopy.density}</label>
            <div className="right-nav-density-grid">
              {(['compact', 'comfortable', 'large'] as RightNavDensity[]).map(value => (
                <button key={value} className={rightNav.density === value ? 'right-nav-choice-active' : ''} onClick={() => setRightNav(current => ({ ...current, density: value }))}>{rightCopy[value]}</button>
              ))}
            </div>
          </div>

          <div className="right-nav-editor-list">
            {orderedRightItems.map((item, index) => (
              <div className="right-nav-editor-row" key={item.id}>
                <span className="right-nav-editor-icon"><GameIcon name={item.icon} size={16} /></span>
                <span className="right-nav-editor-copy"><b>{t(item.label)}</b><small>{stageLabel(item.stage, t)}</small></span>
                <button className={`right-nav-visibility ${rightNav.visible[item.id] ? 'right-nav-visibility-active' : ''}`} onClick={() => toggleRightItem(item.id)} aria-label={`${rightCopy.visible}: ${t(item.label)}`}><span /></button>
                <button disabled={index === 0} onClick={() => moveRightItem(item.id, -1)} aria-label={`${rightCopy.up}: ${t(item.label)}`}>↑</button>
                <button disabled={index === orderedRightItems.length - 1} onClick={() => moveRightItem(item.id, 1)} aria-label={`${rightCopy.down}: ${t(item.label)}`}>↓</button>
              </div>
            ))}
          </div>

          <footer>
            <label className="right-nav-stage-toggle"><input type="checkbox" checked={rightNav.showStages} onChange={event => setRightNav(current => ({ ...current, showStages: event.target.checked }))} /> <span>{rightCopy.stages}</span></label>
            <button onClick={() => setRightNav(DEFAULT_RIGHT_NAV)}>{rightCopy.reset}</button>
          </footer>
        </section>
      )}
    </div>
  );
}

function readRightNavPreferences(): RightNavPreferences {
  try {
    const raw = localStorage.getItem(RIGHT_NAV_STORAGE);
    if (!raw) return DEFAULT_RIGHT_NAV;
    const parsed = JSON.parse(raw) as Partial<RightNavPreferences>;
    const validScreens = new Set(defaultRightOrder);
    const parsedOrder = Array.isArray(parsed.order) ? parsed.order.filter((id): id is Screen => validScreens.has(id as Screen)) : [];
    const order = [...parsedOrder, ...defaultRightOrder.filter(id => !parsedOrder.includes(id))];
    const density: RightNavDensity = parsed.density === 'compact' || parsed.density === 'large' ? parsed.density : 'comfortable';
    return {
      order,
      visible: { ...DEFAULT_RIGHT_NAV.visible, ...(parsed.visible ?? {}), vehicles: false },
      density,
      showStages: typeof parsed.showStages === 'boolean' ? parsed.showStages : true
    };
  } catch {
    return DEFAULT_RIGHT_NAV;
  }
}

function stageLabel(stage: FeatureStage, t: (key: TranslationKey) => string) {
  if (stage === 'live') return t('stage.live');
  if (stage === 'foundation') return t('stage.foundation');
  return t('stage.migration');
}
