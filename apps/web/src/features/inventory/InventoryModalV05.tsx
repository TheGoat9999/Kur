import { useEffect, useMemo, useState, type CSSProperties, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react';
import type {
  BootstrapState,
  InventoryContainer,
  InventoryContainerKey,
  InventoryItem,
  InventoryState
} from '@sol-dorado/contracts';
import type { ItemCategory, ItemDefinition } from '@sol-dorado/contracts/items';
import {
  getInventory,
  getItemCatalog,
  moveInventoryItem,
  splitInventoryItem,
  useInventoryItem
} from '../../lib/api';
import { GameIcon, type GameIconName } from '../../components/GameIcon';
import { useI18n } from '../../i18n';
import { useNotifications } from '../../components/Notifications';
import './inventory-v05.css';

interface Props {
  onStateChange: (state: BootstrapState) => void;
  onClose: () => void;
}

type CategoryFilter = ItemCategory | 'all';
type SidebarTab = 'details' | 'storage';

interface HoverSlot {
  containerKey: InventoryContainerKey;
  slotIndex: number;
  itemId: string | null;
}

interface InventoryThemeSettings {
  accent: string;
  surface: string;
  panelOpacity: number;
  backdropOpacity: number;
  itemScale: number;
  modalSize: number;
}

interface Copy {
  title: string;
  subtitle: string;
  close: string;
  carried: string;
  nearby: string;
  groundHelp: string;
  slots: string;
  occupied: string;
  capacity: string;
  search: string;
  all: string;
  categories: Record<ItemCategory, string>;
  details: string;
  storage: string;
  emptySlot: string;
  emptyPlayer: string;
  emptyGround: string;
  hoverHint: string;
  clickHint: string;
  selected: string;
  preview: string;
  quantity: string;
  stack: string;
  unitWeight: string;
  totalWeight: string;
  value: string;
  type: string;
  condition: string;
  noDirectUse: string;
  split: string;
  drop: string;
  take: string;
  moveTo: string;
  clear: string;
  splitTitle: string;
  splitHelp: string;
  splitAmount: string;
  one: string;
  half: string;
  confirm: string;
  cancel: string;
  customize: string;
  appearance: string;
  accent: string;
  surface: string;
  panelOpacity: string;
  backdropOpacity: string;
  itemSize: string;
  modalSize: string;
  reset: string;
  inaccessible: string;
  movedTitle: string;
  movedMessage: string;
  usedTitle: string;
  usedMessage: string;
  splitDoneTitle: string;
  splitDoneMessage: string;
  health: string;
  energy: string;
  satiety: string;
  hydration: string;
  stress: string;
  policeHeat: string;
}

const CATEGORY_ORDER: readonly ItemCategory[] = [
  'personal', 'food', 'drink', 'tool', 'material', 'electronics', 'medical', 'weapon'
];

const LEGACY_ITEM_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  water: 'water_bottle',
  gloves: 'work_gloves'
});

const THEME_STORAGE_KEY = 'sd_inventory_theme_v3';
const ITEM_ASSET_REV = '20260821-inventory-v05';
const DEFAULT_THEME: InventoryThemeSettings = {
  accent: '#e7be73',
  surface: '#0b171c',
  panelOpacity: 0.97,
  backdropOpacity: 0.42,
  itemScale: 1.06,
  modalSize: 97
};

const COPY: Record<'bg' | 'en', Copy> = {
  bg: {
    title: 'Инвентар',
    subtitle: 'Предметите и земята са в един работен изглед. Drag & drop, двоен клик за бързо използване.',
    close: 'Затвори инвентара',
    carried: 'Носиш със себе си',
    nearby: 'Наблизо / Земя',
    groundHelp: 'Пусни предмет върху свободен слот долу или използвай „Остави на земята“.',
    slots: 'слота',
    occupied: 'заети',
    capacity: 'Товар',
    search: 'Търси предмет...',
    all: 'Всички',
    categories: {
      personal: 'Лични', food: 'Храна', drink: 'Напитки', tool: 'Инструменти', material: 'Материали',
      electronics: 'Електроника', medical: 'Медицински', weapon: 'Оръжия'
    },
    details: 'Детайли',
    storage: 'Складове',
    emptySlot: 'Празен слот',
    emptyPlayer: 'Тук няма предмет. Пусни предмет върху този слот, за да го преместиш в раницата.',
    emptyGround: 'Тук няма предмет. Пусни предмет върху този слот, за да го оставиш на земята.',
    hoverHint: 'Задръж курсора върху слот за моментна информация.',
    clickHint: 'Кликни предмет, за да заключиш избора и да видиш действията.',
    selected: 'Избран предмет',
    preview: 'Бърз преглед',
    quantity: 'Количество',
    stack: 'Стак',
    unitWeight: 'Тегло / бр.',
    totalWeight: 'Общо тегло',
    value: 'Стойност',
    type: 'Тип',
    condition: 'Състояние',
    noDirectUse: 'Този предмет няма директно действие от инвентара.',
    split: 'Раздели',
    drop: 'Остави на земята',
    take: 'Вземи',
    moveTo: 'Премести в',
    clear: 'Откажи избора',
    splitTitle: 'Разделяне на стак',
    splitHelp: 'Колко броя да бъдат отделени в нов свободен слот?',
    splitAmount: 'Количество',
    one: '1 бр.',
    half: 'Половината',
    confirm: 'Раздели',
    cancel: 'Отказ',
    customize: 'Персонализирай',
    appearance: 'Външен вид на инвентара',
    accent: 'Акцентен цвят',
    surface: 'Цвят на панела',
    panelOpacity: 'Плътност на панела',
    backdropOpacity: 'Затъмняване на картата',
    itemSize: 'Размер на предметите',
    modalSize: 'Размер на прозореца',
    reset: 'Стандартни настройки',
    inaccessible: 'Недостъпно от текущото местоположение',
    movedTitle: 'Преместено',
    movedMessage: 'Предметът е преместен.',
    usedTitle: 'Използвано',
    usedMessage: 'Предметът е използван.',
    splitDoneTitle: 'Стакът е разделен',
    splitDoneMessage: 'Създаден е нов стак.',
    health: 'Здраве', energy: 'Енергия', satiety: 'Ситост', hydration: 'Хидратация', stress: 'Стрес', policeHeat: 'Полицейско внимание'
  },
  en: {
    title: 'Inventory',
    subtitle: 'Carried items and ground share one workspace. Drag & drop, double-click for quick use.',
    close: 'Close inventory',
    carried: 'Carried inventory',
    nearby: 'Nearby / Ground',
    groundHelp: 'Drop an item onto a free slot below or use “Drop to ground”.',
    slots: 'slots',
    occupied: 'occupied',
    capacity: 'Load',
    search: 'Search items...',
    all: 'All',
    categories: {
      personal: 'Personal', food: 'Food', drink: 'Drinks', tool: 'Tools', material: 'Materials',
      electronics: 'Electronics', medical: 'Medical', weapon: 'Weapons'
    },
    details: 'Details',
    storage: 'Storage',
    emptySlot: 'Empty slot',
    emptyPlayer: 'There is no item here. Drop an item onto this slot to move it into your carried inventory.',
    emptyGround: 'There is no item here. Drop an item onto this slot to leave it on the ground.',
    hoverHint: 'Hover any slot for instant information.',
    clickHint: 'Click an item to lock the selection and show its actions.',
    selected: 'Selected item',
    preview: 'Quick preview',
    quantity: 'Quantity',
    stack: 'Stack',
    unitWeight: 'Weight / unit',
    totalWeight: 'Total weight',
    value: 'Value',
    type: 'Type',
    condition: 'Condition',
    noDirectUse: 'This item has no direct inventory action.',
    split: 'Split',
    drop: 'Drop to ground',
    take: 'Take',
    moveTo: 'Move to',
    clear: 'Clear selection',
    splitTitle: 'Split stack',
    splitHelp: 'How many units should be moved into a new free slot?',
    splitAmount: 'Amount',
    one: '1 unit',
    half: 'Half',
    confirm: 'Split',
    cancel: 'Cancel',
    customize: 'Customize',
    appearance: 'Inventory appearance',
    accent: 'Accent color',
    surface: 'Panel color',
    panelOpacity: 'Panel opacity',
    backdropOpacity: 'Map dimming',
    itemSize: 'Item size',
    modalSize: 'Window size',
    reset: 'Reset defaults',
    inaccessible: 'Unavailable from your current location',
    movedTitle: 'Moved',
    movedMessage: 'The item was moved.',
    usedTitle: 'Used',
    usedMessage: 'The item was used.',
    splitDoneTitle: 'Stack split',
    splitDoneMessage: 'A new stack was created.',
    health: 'Health', energy: 'Energy', satiety: 'Satiety', hydration: 'Hydration', stress: 'Stress', policeHeat: 'Police heat'
  }
};

export function InventoryModalV05({ onStateChange, onClose }: Props) {
  const { locale, runtime } = useI18n();
  const { push } = useNotifications();
  const copy = COPY[locale];
  const [inventory, setInventory] = useState<InventoryState | null>(null);
  const [catalog, setCatalog] = useState<ItemDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<HoverSlot | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitQuantity, setSplitQuantity] = useState(1);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('details');
  const [storageKey, setStorageKey] = useState<InventoryContainerKey>('home');
  const [theme, setTheme] = useState<InventoryThemeSettings>(loadTheme);

  useEffect(() => {
    let active = true;
    Promise.all([getInventory(), getItemCatalog()])
      .then(([nextInventory, nextCatalog]) => {
        if (!active) return;
        setInventory(nextInventory);
        setCatalog(nextCatalog.items);
        const player = nextInventory.containers.find(container => container.key === 'player');
        const map = new Map(nextCatalog.items.map(item => [item.key, item]));
        const firstUsable = player?.items.find(item => {
          const definition = resolveDefinition(map, item.itemKey);
          return Boolean(definition && Object.keys(definition.useEffects).length > 0);
        });
        setSelectedId(firstUsable?.id ?? player?.items[0]?.id ?? null);
      })
      .catch(reason => reportError(reason));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (customizeOpen) setCustomizeOpen(false);
      else if (splitOpen) setSplitOpen(false);
      else onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [customizeOpen, splitOpen, onClose]);

  const catalogByKey = useMemo(() => new Map(catalog.map(item => [item.key, item])), [catalog]);
  const allItems = useMemo(() => inventory?.containers.flatMap(container => container.items) ?? [], [inventory]);
  const selected = allItems.find(item => item.id === selectedId) ?? null;
  const hoveredItem = hoveredSlot?.itemId ? allItems.find(item => item.id === hoveredSlot.itemId) ?? null : null;
  const preview = hoveredSlot ? hoveredItem : selected;
  const emptyHover = Boolean(hoveredSlot && hoveredSlot.itemId === null);
  const previewDefinition = preview ? resolveDefinition(catalogByKey, preview.itemKey) : null;
  const selectedDefinition = selected ? resolveDefinition(catalogByKey, selected.itemKey) : null;
  const player = inventory?.containers.find(container => container.key === 'player') ?? null;
  const ground = inventory?.containers.find(container => container.key === 'ground') ?? null;
  const storage = inventory?.containers.find(container => container.key === storageKey) ?? null;

  const categoryCounts = useMemo(() => {
    const counts = new Map<ItemCategory, number>();
    if (!player) return counts;
    for (const item of player.items) {
      const category = resolveDefinition(catalogByKey, item.itemKey)?.category;
      if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return counts;
  }, [catalogByKey, player]);

  function reportError(reason: unknown) {
    const message = humanizeError(reason, locale);
    setError(message);
    push({ tone: 'error', title: copy.title, message });
  }

  function selectItem(id: string | null) {
    setSelectedId(id);
    setSplitOpen(false);
    if (id) setSidebarTab('details');
  }

  function matchesFilter(item: InventoryItem, definition: ItemDefinition | null) {
    if (categoryFilter !== 'all' && definition?.category !== categoryFilter) return false;
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;
    return [runtime(item.displayName), item.itemKey, definition?.displayName ?? '', definition?.subcategory ?? '']
      .join(' ')
      .toLowerCase()
      .includes(normalized);
  }

  async function move(itemId: string, target: InventoryContainerKey, slot?: number) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = await moveInventoryItem(itemId, target, slot);
      setInventory(next);
      setSelectedId(next.containers.some(container => container.items.some(item => item.id === itemId)) ? itemId : null);
      setHoveredSlot(null);
      setSplitOpen(false);
      setSidebarTab('details');
      push({ tone: 'info', title: copy.movedTitle, message: copy.movedMessage });
    } catch (reason) {
      reportError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function useItem(item: InventoryItem) {
    if (busy || item.containerKey !== 'player') return;
    const definition = resolveDefinition(catalogByKey, item.itemKey);
    if (!isUsable(item, definition)) return;
    setBusy(true);
    setError(null);
    try {
      const result = await useInventoryItem(item.id);
      setInventory(result.inventory);
      onStateChange(result.state);
      const stillExists = result.inventory.containers.some(container => container.items.some(next => next.id === item.id));
      if (!stillExists) setSelectedId(result.inventory.containers.find(container => container.key === 'player')?.items[0]?.id ?? null);
      setHoveredSlot(null);
      push({ tone: 'success', title: copy.usedTitle, message: copy.usedMessage });
    } catch (reason) {
      reportError(reason);
    } finally {
      setBusy(false);
    }
  }

  function beginSplit() {
    if (!selected || !selected.stackable || selected.quantity <= 1) return;
    setSplitQuantity(Math.max(1, Math.floor(selected.quantity / 2)));
    setSplitOpen(true);
    setCustomizeOpen(false);
  }

  async function confirmSplit() {
    if (!selected || busy || !selected.stackable || selected.quantity <= 1) return;
    const quantity = Math.max(1, Math.min(selected.quantity - 1, Math.floor(splitQuantity)));
    setBusy(true);
    setError(null);
    try {
      setInventory(await splitInventoryItem(selected.id, quantity));
      setSplitOpen(false);
      setHoveredSlot(null);
      push({ tone: 'success', title: copy.splitDoneTitle, message: copy.splitDoneMessage });
    } catch (reason) {
      reportError(reason);
    } finally {
      setBusy(false);
    }
  }

  function closeFromBackdrop(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  const themeStyle = {
    '--inventory-accent': theme.accent,
    '--inventory-surface-rgb': hexToRgbTriplet(theme.surface),
    '--inventory-panel-opacity': String(theme.panelOpacity),
    '--inventory-backdrop-opacity': String(theme.backdropOpacity),
    '--inventory-item-scale': String(theme.itemScale),
    '--inventory-modal-size': `${theme.modalSize}%`
  } as CSSProperties;

  if (!inventory || !player || !ground) {
    return (
      <div className="inventory-v05-layer" style={themeStyle} role="dialog" aria-modal="true" aria-label={copy.title} onMouseDown={closeFromBackdrop}>
        <section className="inventory-v05 inventory-v05-loading" onMouseDown={event => event.stopPropagation()}>
          <GameIcon name="package" size={32} />
          <b>{copy.title}</b>
          <span>{error ?? 'Loading...'}</span>
          <button className="inventory-v05-close" onClick={onClose} aria-label={copy.close}><GameIcon name="x" size={19} /></button>
        </section>
      </div>
    );
  }

  const playerWeightPct = capacityPercent(player);
  const selectedUsable = Boolean(selected && isUsable(selected, selectedDefinition));
  const selectedSplittable = Boolean(selected?.stackable && selected.quantity > 1);
  const selectedSource = selected ? inventory.containers.find(container => container.key === selected.containerKey) ?? null : null;
  const selectedTarget = selected?.containerKey === 'player' ? ground : player;
  const previewIsSelected = Boolean(preview && selected && preview.id === selected.id && !hoveredSlot);
  const hoveredIsSelected = Boolean(preview && selected && preview.id === selected.id);

  return (
    <div className="inventory-v05-layer" style={themeStyle} role="dialog" aria-modal="true" aria-label={copy.title} onMouseDown={closeFromBackdrop}>
      <section className="inventory-v05" onMouseDown={event => event.stopPropagation()}>
        <header className="inventory-v05-header">
          <div className="inventory-v05-heading">
            <span className="inventory-v05-logo"><GameIcon name="package" size={23} /></span>
            <div><span className="eyebrow">SOL DORADO</span><h1>{copy.title}</h1><p>{copy.subtitle}</p></div>
          </div>
          <div className="inventory-v05-stats">
            <Stat label={copy.capacity} value={`${formatWeight(player.weightGrams)} / ${formatWeight(player.capacityGrams)}`} progress={playerWeightPct} />
            <Stat label={copy.carried} value={`${player.items.length} / ${player.slotCount} ${copy.slots}`} />
          </div>
          <div className="inventory-v05-header-actions">
            <button className={customizeOpen ? 'inventory-v05-customize active' : 'inventory-v05-customize'} onClick={() => { setCustomizeOpen(value => !value); setSplitOpen(false); }}>
              <GameIcon name="sparkles" size={16} /><span>{copy.customize}</span>
            </button>
            <button className="inventory-v05-close" onClick={onClose} aria-label={copy.close} title={`${copy.close} · Esc`}><GameIcon name="x" size={19} /></button>
          </div>
          {customizeOpen && <ThemeControls copy={copy} theme={theme} onChange={setTheme} onReset={() => setTheme(DEFAULT_THEME)} />}
        </header>

        {error && <div className="inventory-v05-error"><GameIcon name="alert-triangle" size={16} />{error}</div>}

        <div className="inventory-v05-body">
          <main className="inventory-v05-workspace">
            <div className="inventory-v05-toolbar">
              <label className="inventory-v05-search"><GameIcon name="search" size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={copy.search} />{query && <button onClick={() => setQuery('')}><GameIcon name="x" size={13} /></button>}</label>
              <div className="inventory-v05-filters">
                <button className={categoryFilter === 'all' ? 'active' : ''} onClick={() => setCategoryFilter('all')}>{copy.all}<b>{player.items.length}</b></button>
                {CATEGORY_ORDER.map(category => {
                  const count = categoryCounts.get(category) ?? 0;
                  return <button key={category} className={categoryFilter === category ? 'active' : ''} disabled={count === 0} onClick={() => setCategoryFilter(category)}>{copy.categories[category]}<b>{count}</b></button>;
                })}
              </div>
            </div>

            <section className="inventory-v05-player-section">
              <SectionHeading eyebrow={copy.carried} title={runtime(player.label)} meta={`${player.items.length} ${copy.occupied} · ${player.slotCount} ${copy.slots}`} />
              <div className="inventory-v05-player-scroll">
                <ContainerGrid
                  container={player}
                  variant="player"
                  selectedId={selectedId}
                  busy={busy}
                  catalogByKey={catalogByKey}
                  isVisible={matchesFilter}
                  onSelect={selectItem}
                  onHover={setHoveredSlot}
                  onMove={move}
                  onQuickUse={item => void useItem(item)}
                  quickSlots
                />
              </div>
            </section>

            <section className="inventory-v05-ground">
              <div className="inventory-v05-ground-head">
                <div className="inventory-v05-ground-title"><span className="inventory-v05-ground-icon"><GameIcon name="map-pin" size={17} /></span><div><span className="eyebrow">TRANSFER</span><b>{copy.nearby}</b><small>{copy.groundHelp}</small></div></div>
                <div className="inventory-v05-ground-meta"><b>{ground.items.length} / {ground.slotCount}</b><span>{formatWeight(ground.weightGrams)} / {formatWeight(ground.capacityGrams)}</span></div>
              </div>
              <div className="inventory-v05-ground-scroll">
                <ContainerGrid
                  container={ground}
                  variant="ground"
                  selectedId={selectedId}
                  busy={busy}
                  catalogByKey={catalogByKey}
                  isVisible={() => true}
                  onSelect={selectItem}
                  onHover={setHoveredSlot}
                  onMove={move}
                  onQuickUse={() => undefined}
                />
              </div>
            </section>

            <div className="inventory-v05-help"><span><GameIcon name="mouse-pointer" size={14} />{copy.hoverHint}</span><span><GameIcon name="arrow-left-right" size={14} />Drag & drop: {copy.carried} ↔ {copy.nearby}</span></div>
          </main>

          <aside className="inventory-v05-sidebar">
            <nav className="inventory-v05-side-nav" aria-label="Inventory panel navigation">
              <button className={sidebarTab === 'details' ? 'active' : ''} onClick={() => setSidebarTab('details')}><GameIcon name="info" size={17} /><span>{copy.details}</span></button>
              <button className={sidebarTab === 'storage' ? 'active' : ''} onClick={() => setSidebarTab('storage')}><GameIcon name="building" size={17} /><span>{copy.storage}</span></button>
            </nav>

            {sidebarTab === 'details' ? (
              <div className="inventory-v05-detail-stack">
                <ItemPreview
                  item={preview}
                  definition={previewDefinition}
                  source={preview ? inventory.containers.find(container => container.key === preview.containerKey) ?? null : null}
                  emptySlot={emptyHover ? hoveredSlot : null}
                  selected={Boolean(preview && selected && preview.id === selected.id)}
                  copy={copy}
                  locale={locale}
                  busy={busy}
                  canUse={selectedUsable && hoveredIsSelected}
                  canSplit={selectedSplittable && hoveredIsSelected}
                  moveTarget={hoveredIsSelected ? selectedTarget : null}
                  onUse={() => selected && void useItem(selected)}
                  onSplit={beginSplit}
                  onMove={() => selected && void move(selected.id, selectedTarget.key)}
                  onClear={() => selectItem(null)}
                />
                {splitOpen && selected && <SplitPanel copy={copy} item={selected} quantity={splitQuantity} busy={busy} onQuantity={setSplitQuantity} onClose={() => setSplitOpen(false)} onConfirm={() => void confirmSplit()} />}
              </div>
            ) : (
              <StoragePanel
                copy={copy}
                locale={locale}
                containers={inventory.containers}
                storageKey={storageKey}
                storage={storage}
                selectedId={selectedId}
                busy={busy}
                catalogByKey={catalogByKey}
                onStorageKey={setStorageKey}
                onSelect={selectItem}
                onHover={setHoveredSlot}
                onMove={move}
              />
            )}
          </aside>
        </div>

        <footer className="inventory-v05-footer"><span>{copy.carried}: <b>{formatWeight(player.weightGrams)} / {formatWeight(player.capacityGrams)}</b></span><span><kbd>I</kbd> / <kbd>Esc</kbd> {locale === 'bg' ? 'затваря' : 'closes'}</span></footer>
      </section>
    </div>
  );
}

function Stat({ label, value, progress }: { label: string; value: string; progress?: number }) {
  return <div className="inventory-v05-stat"><small>{label}</small><b>{value}</b>{progress !== undefined && <i><span style={{ width: `${progress}%` }} /></i>}</div>;
}

function SectionHeading({ eyebrow, title, meta }: { eyebrow: string; title: string; meta: string }) {
  return <div className="inventory-v05-section-heading"><div><span className="eyebrow">{eyebrow}</span><b>{title}</b></div><small>{meta}</small></div>;
}

function ThemeControls({ copy, theme, onChange, onReset }: { copy: Copy; theme: InventoryThemeSettings; onChange: (next: InventoryThemeSettings) => void; onReset: () => void }) {
  const patch = (next: Partial<InventoryThemeSettings>) => onChange({ ...theme, ...next });
  return (
    <div className="inventory-v05-theme">
      <div className="inventory-v05-theme-head"><div><span className="eyebrow">UI</span><b>{copy.appearance}</b></div><button onClick={onReset}>{copy.reset}</button></div>
      <div className="inventory-v05-theme-colors">
        <label><span>{copy.accent}</span><input type="color" value={theme.accent} onChange={event => patch({ accent: event.target.value })} /></label>
        <label><span>{copy.surface}</span><input type="color" value={theme.surface} onChange={event => patch({ surface: event.target.value })} /></label>
      </div>
      <Range label={copy.modalSize} value={theme.modalSize} min={82} max={99} suffix="%" onChange={modalSize => patch({ modalSize })} />
      <Range label={copy.itemSize} value={Math.round(theme.itemScale * 100)} min={90} max={125} suffix="%" onChange={value => patch({ itemScale: value / 100 })} />
      <Range label={copy.panelOpacity} value={Math.round(theme.panelOpacity * 100)} min={72} max={100} suffix="%" onChange={value => patch({ panelOpacity: value / 100 })} />
      <Range label={copy.backdropOpacity} value={Math.round(theme.backdropOpacity * 100)} min={8} max={72} suffix="%" onChange={value => patch({ backdropOpacity: value / 100 })} />
    </div>
  );
}

function Range({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void }) {
  return <label className="inventory-v05-range"><span><b>{label}</b><em>{value}{suffix}</em></span><input type="range" min={min} max={max} value={value} onChange={event => onChange(Number(event.target.value))} /></label>;
}

interface GridProps {
  container: InventoryContainer;
  variant: 'player' | 'ground' | 'storage';
  selectedId: string | null;
  busy: boolean;
  catalogByKey: Map<string, ItemDefinition>;
  isVisible: (item: InventoryItem, definition: ItemDefinition | null) => boolean;
  onSelect: (id: string | null) => void;
  onHover: (slot: HoverSlot | null) => void;
  onMove: (itemId: string, target: InventoryContainerKey, slot?: number) => void;
  onQuickUse: (item: InventoryItem) => void;
  quickSlots?: boolean;
}

function ContainerGrid({ container, variant, selectedId, busy, catalogByKey, isVisible, onSelect, onHover, onMove, onQuickUse, quickSlots = false }: GridProps) {
  const { locale, runtime } = useI18n();
  const slots = Array.from({ length: container.slotCount }, (_, slotIndex) => container.items.find(item => item.slotIndex === slotIndex) ?? null);
  function drop(event: DragEvent<HTMLButtonElement>, slotIndex: number) {
    event.preventDefault();
    const itemId = event.dataTransfer.getData('application/x-sol-dorado-item');
    if (itemId) onMove(itemId, container.key, slotIndex);
  }
  return (
    <div className={`inventory-v05-grid inventory-v05-grid-${variant}`}>
      {slots.map((item, slotIndex) => {
        const definition = item ? resolveDefinition(catalogByKey, item.itemKey) : null;
        const filteredOut = Boolean(item && !isVisible(item, definition));
        const usable = Boolean(item && isUsable(item, definition));
        return (
          <button
            key={slotIndex}
            type="button"
            className={[
              'inventory-v05-slot',
              item ? 'filled' : 'empty',
              item?.id === selectedId ? 'selected' : '',
              filteredOut ? 'filtered' : '',
              usable && variant === 'player' ? 'usable' : ''
            ].filter(Boolean).join(' ')}
            disabled={busy}
            draggable={Boolean(item)}
            onClick={() => onSelect(item?.id ?? null)}
            onDoubleClick={() => item && onQuickUse(item)}
            onMouseEnter={() => onHover({ containerKey: container.key, slotIndex, itemId: item?.id ?? null })}
            onMouseLeave={() => onHover(null)}
            onDragStart={event => {
              if (!item) return;
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('application/x-sol-dorado-item', item.id);
            }}
            onDragEnd={() => onHover(null)}
            onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}
            onDrop={event => drop(event, slotIndex)}
            aria-label={item ? runtime(item.displayName) : `${locale === 'bg' ? 'Празен слот' : 'Empty slot'} ${slotIndex + 1}`}
          >
            <span className="inventory-v05-slot-index">{String(slotIndex + 1).padStart(2, '0')}</span>
            {item && <SlotContents item={item} definition={definition} />}
            {quickSlots && slotIndex < 5 && <span className="inventory-v05-hotkey">{slotIndex + 1}</span>}
          </button>
        );
      })}
    </div>
  );
}

function SlotContents({ item, definition }: { item: InventoryItem; definition: ItemDefinition | null }) {
  const { locale, runtime } = useI18n();
  const condition = readCondition(item.metadata);
  return <>
    <span className="inventory-v05-slot-name">{runtime(item.displayName)}</span>
    <ItemThumbnail item={item} definition={definition} />
    <span className="inventory-v05-slot-bottom">
      {isUsable(item, definition) && definition ? <span className="inventory-v05-use-hint">{useLabel(definition, locale)}</span> : <span />}
      {item.quantity > 1 && <b>×{item.quantity}</b>}
    </span>
    {condition !== null && <span className="inventory-v05-condition"><i style={{ width: `${condition}%` }} /></span>}
  </>;
}

function ItemPreview({ item, definition, source, emptySlot, selected, copy, locale, busy, canUse, canSplit, moveTarget, onUse, onSplit, onMove, onClear }: {
  item: InventoryItem | null;
  definition: ItemDefinition | null;
  source: InventoryContainer | null;
  emptySlot: HoverSlot | null;
  selected: boolean;
  copy: Copy;
  locale: 'bg' | 'en';
  busy: boolean;
  canUse: boolean;
  canSplit: boolean;
  moveTarget: InventoryContainer | null;
  onUse: () => void;
  onSplit: () => void;
  onMove: () => void;
  onClear: () => void;
}) {
  const { runtime } = useI18n();
  if (emptySlot) {
    const isGround = emptySlot.containerKey === 'ground';
    return <section className="inventory-v05-preview inventory-v05-preview-empty-slot"><span className="inventory-v05-empty-icon"><GameIcon name={isGround ? 'map-pin' : 'package'} size={28} /></span><span className="eyebrow">{String(emptySlot.slotIndex + 1).padStart(2, '0')}</span><h2>{copy.emptySlot}</h2><p>{isGround ? copy.emptyGround : copy.emptyPlayer}</p></section>;
  }
  if (!item) {
    return <section className="inventory-v05-preview inventory-v05-preview-neutral"><GameIcon name="info" size={25} /><b>{copy.hoverHint}</b><span>{copy.clickHint}</span></section>;
  }
  const condition = readCondition(item.metadata);
  const moveLabel = item.containerKey === 'player' ? copy.drop : item.containerKey === 'ground' ? copy.take : `${copy.moveTo} ${moveTarget ? runtime(moveTarget.label) : ''}`;
  return (
    <section className={selected ? 'inventory-v05-preview selected' : 'inventory-v05-preview'}>
      <div className="inventory-v05-preview-top"><ItemThumbnail item={item} definition={definition} large /><div><span className="eyebrow">{selected ? copy.selected : copy.preview}</span><h2>{runtime(item.displayName)}</h2><div className="inventory-v05-chips">{definition && <span>{copy.categories[definition.category]}</span>}{definition && <LegalityBadge legality={definition.legality} locale={locale} />}</div></div></div>
      {canUse && definition && <button className="inventory-v05-primary" disabled={busy} onClick={onUse}><GameIcon name={definition.category === 'drink' ? 'droplet' : definition.category === 'food' ? 'utensils' : 'sparkles'} size={18} /><span><b>{useLabel(definition, locale)}</b><small>{effectSummary(definition, copy)}</small></span></button>}
      <div className="inventory-v05-meta"><Meta label={copy.quantity} value={String(item.quantity)} /><Meta label={copy.stack} value={definition ? `${item.quantity} / ${definition.maxStack}` : item.stackable ? 'Stackable' : 'Single'} /><Meta label={copy.unitWeight} value={formatWeight(item.unitWeightGrams)} /><Meta label={copy.totalWeight} value={formatWeight(item.unitWeightGrams * item.quantity)} />{definition && <Meta label={copy.value} value={formatMoney(definition.basePriceCents)} />}{definition && <Meta label={copy.type} value={titleCase(definition.subcategory)} />}</div>
      {condition !== null && <div className="inventory-v05-preview-condition"><span><small>{copy.condition}</small><b>{condition}%</b></span><i><b style={{ width: `${condition}%` }} /></i></div>}
      {definition && <EffectList definition={definition} copy={copy} />}
      {!definition?.useEffects || Object.keys(definition.useEffects).length === 0 ? <p className="inventory-v05-passive">{copy.noDirectUse}</p> : null}
      <div className="inventory-v05-location"><GameIcon name={item.containerKey === 'ground' ? 'map-pin' : 'package'} size={14} /><span>{source ? runtime(source.label) : item.containerKey}</span></div>
      {selected ? <div className="inventory-v05-actions">{moveTarget?.accessible && <button className="inventory-v05-transfer" disabled={busy} onClick={onMove}><GameIcon name={item.containerKey === 'player' ? 'arrow-down-left' : 'arrow-up-right'} size={16} />{moveLabel}</button>}{canSplit && <button className="secondary-button" disabled={busy} onClick={onSplit}>{copy.split}</button>}<button className="inventory-v05-clear" disabled={busy} onClick={onClear}>{copy.clear}</button></div> : <div className="inventory-v05-hover-hint"><GameIcon name="mouse-pointer" size={14} />{copy.clickHint}</div>}
    </section>
  );
}

function StoragePanel({ copy, locale, containers, storageKey, storage, selectedId, busy, catalogByKey, onStorageKey, onSelect, onHover, onMove }: {
  copy: Copy;
  locale: 'bg' | 'en';
  containers: InventoryContainer[];
  storageKey: InventoryContainerKey;
  storage: InventoryContainer | null;
  selectedId: string | null;
  busy: boolean;
  catalogByKey: Map<string, ItemDefinition>;
  onStorageKey: (key: InventoryContainerKey) => void;
  onSelect: (id: string | null) => void;
  onHover: (slot: HoverSlot | null) => void;
  onMove: (itemId: string, target: InventoryContainerKey, slot?: number) => void;
}) {
  const { runtime } = useI18n();
  const storageContainers = containers.filter(container => container.key === 'home' || container.key === 'vehicle_trunk');
  return <section className="inventory-v05-storage"><div className="inventory-v05-storage-tabs">{storageContainers.map(container => <button key={container.key} className={storageKey === container.key ? 'active' : ''} onClick={() => onStorageKey(container.key)}><GameIcon name={container.key === 'home' ? 'building' : 'car'} size={17} /><span>{shortContainerLabel(container.key, locale)}</span>{!container.accessible && <GameIcon name="lock" size={12} />}</button>)}</div>{storage && <><div className="inventory-v05-storage-title"><div><span className="eyebrow">{copy.storage}</span><b>{runtime(storage.label)}</b></div><small>{storage.items.length} / {storage.slotCount}</small></div>{storage.accessible ? <div className="inventory-v05-storage-grid"><ContainerGrid container={storage} variant="storage" selectedId={selectedId} busy={busy} catalogByKey={catalogByKey} isVisible={() => true} onSelect={onSelect} onHover={onHover} onMove={onMove} onQuickUse={() => undefined} /></div> : <div className="inventory-v05-locked"><GameIcon name="lock" size={28} /><b>{copy.inaccessible}</b><span>{runtime(storage.accessReason)}</span></div>}</>}</section>;
}

function SplitPanel({ copy, item, quantity, busy, onQuantity, onClose, onConfirm }: { copy: Copy; item: InventoryItem; quantity: number; busy: boolean; onQuantity: (value: number) => void; onClose: () => void; onConfirm: () => void }) {
  const { runtime } = useI18n();
  return <section className="inventory-v05-split"><div className="inventory-v05-split-head"><div><span className="eyebrow">{copy.splitTitle}</span><b>{runtime(item.displayName)}</b></div><button onClick={onClose}><GameIcon name="x" size={14} /></button></div><p>{copy.splitHelp}</p><label><span>{copy.splitAmount}</span><input type="number" min={1} max={Math.max(1, item.quantity - 1)} value={quantity} onChange={event => onQuantity(Number(event.target.value))} /></label><div className="inventory-v05-split-shortcuts"><button onClick={() => onQuantity(1)}>{copy.one}</button><button onClick={() => onQuantity(Math.max(1, Math.floor(item.quantity / 2)))}>{copy.half}</button></div><div className="inventory-v05-split-actions"><button className="secondary-button" onClick={onClose}>{copy.cancel}</button><button className="primary-button" disabled={busy} onClick={onConfirm}>{copy.confirm}</button></div></section>;
}

function ItemThumbnail({ item, definition, large = false }: { item: InventoryItem; definition: ItemDefinition | null; large?: boolean }) {
  const canonicalKey = canonicalItemKey(item.itemKey);
  const sources = uniqueStrings([
    definition?.image.localPath,
    `/assets/items/${canonicalKey}.png`,
    canonicalKey === 'water_bottle' || canonicalKey === 'large_water_bottle' ? '/assets/items/sparkling_water.png' : null
  ]).map(path => `${path}?v=${ITEM_ASSET_REV}`);
  const sourceKey = sources.join('|');
  const [sourceIndex, setSourceIndex] = useState(0);
  useEffect(() => setSourceIndex(0), [sourceKey]);
  const src = sources[sourceIndex] ?? null;
  const icon = categoryIcon(definition?.category, item.category, canonicalKey);
  return <span className={large ? 'inventory-v05-thumb large' : 'inventory-v05-thumb'}><span className="inventory-v05-vector-fallback"><GameIcon name={icon} size={large ? 38 : 27} /></span>{src && <img key={src} src={src} alt="" draggable={false} decoding="async" onError={() => setSourceIndex(index => index + 1)} />}</span>;
}

function LegalityBadge({ legality, locale }: { legality: ItemDefinition['legality']; locale: 'bg' | 'en' }) {
  const labels = locale === 'bg' ? { legal: 'Легален', restricted: 'Ограничен', regulated: 'Регулиран', illegal: 'Нелегален' } : { legal: 'Legal', restricted: 'Restricted', regulated: 'Regulated', illegal: 'Illegal' };
  return <span className={`inventory-v05-legality ${legality}`}>{labels[legality]}</span>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="inventory-v05-meta-item"><small>{label}</small><b>{value}</b></div>;
}

function EffectList({ definition, copy }: { definition: ItemDefinition; copy: Copy }) {
  const labels: Record<keyof ItemDefinition['useEffects'], string> = { health: copy.health, energy: copy.energy, satiety: copy.satiety, hydration: copy.hydration, stress: copy.stress, policeHeat: copy.policeHeat };
  const entries = Object.entries(definition.useEffects) as Array<[keyof ItemDefinition['useEffects'], number]>;
  if (!entries.length) return null;
  return <div className="inventory-v05-effects">{entries.map(([key, value]) => <span key={key} className={value >= 0 ? 'positive' : 'negative'}>{labels[key]} {value > 0 ? '+' : ''}{value}</span>)}</div>;
}

function canonicalItemKey(itemKey: string) {
  return LEGACY_ITEM_ALIASES[itemKey] ?? itemKey;
}

function resolveDefinition(catalogByKey: Map<string, ItemDefinition>, itemKey: string): ItemDefinition | null {
  return catalogByKey.get(itemKey) ?? catalogByKey.get(canonicalItemKey(itemKey)) ?? null;
}

function isUsable(item: InventoryItem, definition: ItemDefinition | null) {
  return item.containerKey === 'player' && Boolean(definition && Object.keys(definition.useEffects).length > 0);
}

function categoryIcon(category: ItemCategory | undefined, legacyCategory: string, itemKey: string): GameIconName {
  if (itemKey.includes('water')) return 'droplet';
  const normalized = category ?? legacyCategory.toLowerCase();
  if (normalized === 'drink' || normalized.includes('consumable')) return 'droplet';
  if (normalized === 'food') return 'utensils';
  if (normalized === 'medical') return 'heart';
  if (normalized === 'electronics' || normalized.includes('device')) return 'smartphone';
  if (normalized === 'weapon') return 'shield';
  if (normalized === 'personal' || normalized.includes('clothing')) return 'user';
  if (normalized === 'tool') return 'briefcase';
  return 'package';
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function readCondition(metadata: Record<string, unknown>) {
  const value = typeof metadata.condition === 'number' ? metadata.condition : typeof metadata.durability === 'number' ? metadata.durability : null;
  if (value === null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function useLabel(definition: ItemDefinition, locale: 'bg' | 'en') {
  if (locale === 'bg') return definition.category === 'drink' ? 'Изпий' : definition.category === 'food' ? 'Изяж' : 'Използвай';
  return definition.category === 'drink' ? 'Drink' : definition.category === 'food' ? 'Eat' : 'Use';
}

function effectSummary(definition: ItemDefinition, copy: Copy) {
  const labels: Partial<Record<keyof ItemDefinition['useEffects'], string>> = { health: copy.health, energy: copy.energy, satiety: copy.satiety, hydration: copy.hydration, stress: copy.stress, policeHeat: copy.policeHeat };
  const first = (Object.entries(definition.useEffects) as Array<[keyof ItemDefinition['useEffects'], number]>)[0];
  if (!first) return '';
  const [key, value] = first;
  return `${labels[key] ?? key} ${value > 0 ? '+' : ''}${value}`;
}

function shortContainerLabel(key: InventoryContainerKey, locale: 'bg' | 'en') {
  const bg: Record<InventoryContainerKey, string> = { player: 'Играч', ground: 'Земя', home: 'Дом', vehicle_trunk: 'Багажник' };
  const en: Record<InventoryContainerKey, string> = { player: 'Player', ground: 'Ground', home: 'Home', vehicle_trunk: 'Trunk' };
  return (locale === 'bg' ? bg : en)[key];
}

function capacityPercent(container: InventoryContainer) {
  return Math.min(100, container.capacityGrams > 0 ? container.weightGrams / container.capacityGrams * 100 : 0);
}

function formatWeight(grams: number) {
  if (grams >= 1000) return `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 1)} kg`;
  return `${grams} g`;
}

function formatMoney(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function titleCase(value: string) {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function loadTheme(): InventoryThemeSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? 'null') as Partial<InventoryThemeSettings> | null;
    if (!stored) return DEFAULT_THEME;
    return {
      accent: isHexColor(stored.accent) ? stored.accent : DEFAULT_THEME.accent,
      surface: isHexColor(stored.surface) ? stored.surface : DEFAULT_THEME.surface,
      panelOpacity: clampNumber(stored.panelOpacity, 0.72, 1, DEFAULT_THEME.panelOpacity),
      backdropOpacity: clampNumber(stored.backdropOpacity, 0.08, 0.72, DEFAULT_THEME.backdropOpacity),
      itemScale: clampNumber(stored.itemScale, 0.9, 1.25, DEFAULT_THEME.itemScale),
      modalSize: clampNumber(stored.modalSize, 82, 99, DEFAULT_THEME.modalSize)
    };
  } catch {
    return DEFAULT_THEME;
  }
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function hexToRgbTriplet(hex: string) {
  const clean = hex.replace('#', '');
  return `${parseInt(clean.slice(0, 2), 16)} ${parseInt(clean.slice(2, 4), 16)} ${parseInt(clean.slice(4, 6), 16)}`;
}

function humanizeError(reason: unknown, locale: 'bg' | 'en') {
  const raw = reason instanceof Error ? reason.message : String(reason);
  const bg: Record<string, string> = {
    inventory_container_not_accessible: 'Този контейнер не е достъпен от текущото ти местоположение.',
    inventory_item_not_found: 'Предметът вече не е наличен.',
    inventory_container_not_found: 'Контейнерът не е намерен.',
    inventory_container_full: 'Няма свободен слот.',
    inventory_capacity_exceeded: 'Теглото надвишава капацитета.',
    inventory_item_not_carried: 'Предметът трябва да е в твоя инвентар, за да го използваш.',
    inventory_item_not_usable: 'Този предмет няма директно действие.',
    inventory_item_not_splittable: 'Този предмет не може да бъде разделян.',
    inventory_split_quantity_invalid: 'Избери валидно количество.',
    inventory_slot_occupied: 'Избраният слот вече е зает.'
  };
  const en: Record<string, string> = {
    inventory_container_not_accessible: 'That container is not accessible from your current location.',
    inventory_item_not_found: 'The item is no longer available.',
    inventory_container_not_found: 'The container could not be found.',
    inventory_container_full: 'There is no free slot.',
    inventory_capacity_exceeded: 'The weight capacity would be exceeded.',
    inventory_item_not_carried: 'The item must be carried before it can be used.',
    inventory_item_not_usable: 'That item has no direct use action.',
    inventory_item_not_splittable: 'That item cannot be split.',
    inventory_split_quantity_invalid: 'Choose a valid amount.',
    inventory_slot_occupied: 'That slot is already occupied.'
  };
  return (locale === 'bg' ? bg : en)[raw] ?? raw.replaceAll('_', ' ');
}
