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
import { GameIcon } from '../../components/GameIcon';
import { useI18n } from '../../i18n';
import { useNotifications } from '../../components/Notifications';
import './inventory.css';

interface Props {
  onStateChange: (state: BootstrapState) => void;
  onClose: () => void;
}

type CategoryFilter = ItemCategory | 'all';

interface InventoryThemeSettings {
  accent: string;
  surface: string;
  panelOpacity: number;
  backdropOpacity: number;
  itemScale: number;
}

interface InventoryModalCopy {
  title: string;
  subtitle: string;
  close: string;
  carried: string;
  nearby: string;
  slots: string;
  occupied: string;
  capacity: string;
  searchPlaceholder: string;
  all: string;
  categories: Record<ItemCategory, string>;
  hoverHint: string;
  clickHint: string;
  quickUseHint: string;
  selected: string;
  preview: string;
  quantity: string;
  stack: string;
  unitWeight: string;
  totalWeight: string;
  value: string;
  condition: string;
  effects: string;
  type: string;
  noDirectUse: string;
  split: string;
  move: string;
  clear: string;
  splitTitle: string;
  splitHelp: string;
  splitAmount: string;
  one: string;
  half: string;
  confirm: string;
  cancel: string;
  accessible: string;
  unavailable: string;
  movedTitle: string;
  movedMessage: string;
  usedTitle: string;
  usedMessage: string;
  splitDoneTitle: string;
  splitDoneMessage: string;
  customize: string;
  appearance: string;
  accent: string;
  surface: string;
  panelOpacity: string;
  backdropOpacity: string;
  itemSize: string;
  reset: string;
  outsideClose: string;
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

const ITEM_ASSET_REV = '20260821-rainmad-2';
const THEME_STORAGE_KEY = 'sd_inventory_theme_v2';
const DEFAULT_THEME: InventoryThemeSettings = {
  accent: '#e7be73',
  surface: '#0b171c',
  panelOpacity: 0.96,
  backdropOpacity: 0.46,
  itemScale: 1
};

const COPY: Record<'bg' | 'en', InventoryModalCopy> = {
  bg: {
    title: 'Инвентар',
    subtitle: 'Клик за действия. Двоен клик използва храна, напитка или медицински предмет веднага.',
    close: 'Затвори инвентара',
    carried: 'Носиш със себе си',
    nearby: 'Контекст',
    slots: 'слота',
    occupied: 'заети',
    capacity: 'Товар',
    searchPlaceholder: 'Търси предмет...',
    all: 'Всички',
    categories: {
      personal: 'Лични', food: 'Храна', drink: 'Напитки', tool: 'Инструменти', material: 'Материали',
      electronics: 'Електроника', medical: 'Медицински', weapon: 'Оръжия'
    },
    hoverHint: 'Задръж курсора върху предмет за информация.',
    clickHint: 'Кликни предмета, за да видиш действията.',
    quickUseHint: 'Двоен клик = бързо използване',
    selected: 'Избран предмет',
    preview: 'Бърз преглед',
    quantity: 'Количество',
    stack: 'Стак',
    unitWeight: 'Тегло / бр.',
    totalWeight: 'Общо тегло',
    value: 'Стойност',
    condition: 'Състояние',
    effects: 'Ефекти',
    type: 'Тип',
    noDirectUse: 'Този предмет няма директно действие от инвентара.',
    split: 'Раздели',
    move: 'Премести',
    clear: 'Откажи избора',
    splitTitle: 'Разделяне на стак',
    splitHelp: 'Избери колко броя да преместиш в нов свободен слот.',
    splitAmount: 'Количество за отделяне',
    one: '1 бр.',
    half: 'Половината',
    confirm: 'Раздели стака',
    cancel: 'Отказ',
    accessible: 'Достъпно',
    unavailable: 'Недостъпно',
    movedTitle: 'Преместено',
    movedMessage: 'Предметът е преместен.',
    usedTitle: 'Използвано',
    usedMessage: 'Предметът е използван.',
    splitDoneTitle: 'Стакът е разделен',
    splitDoneMessage: 'Създаден е отделен стак в свободен слот.',
    customize: 'Персонализирай',
    appearance: 'Външен вид на инвентара',
    accent: 'Акцентен цвят',
    surface: 'Цвят на панела',
    panelOpacity: 'Плътност на панела',
    backdropOpacity: 'Затъмняване на картата',
    itemSize: 'Размер на предметите',
    reset: 'Върни стандартните',
    outsideClose: 'Клик извън прозореца го затваря',
    health: 'Здраве', energy: 'Енергия', satiety: 'Ситост', hydration: 'Хидратация', stress: 'Стрес', policeHeat: 'Police heat'
  },
  en: {
    title: 'Inventory',
    subtitle: 'Click for actions. Double-click food, drinks or medical items for immediate use.',
    close: 'Close inventory',
    carried: 'Carried inventory',
    nearby: 'Context',
    slots: 'slots',
    occupied: 'occupied',
    capacity: 'Load',
    searchPlaceholder: 'Search items...',
    all: 'All',
    categories: {
      personal: 'Personal', food: 'Food', drink: 'Drinks', tool: 'Tools', material: 'Materials',
      electronics: 'Electronics', medical: 'Medical', weapon: 'Weapons'
    },
    hoverHint: 'Hover an item for instant information.',
    clickHint: 'Click an item to show its actions.',
    quickUseHint: 'Double-click = quick use',
    selected: 'Selected item',
    preview: 'Quick preview',
    quantity: 'Quantity',
    stack: 'Stack',
    unitWeight: 'Weight / unit',
    totalWeight: 'Total weight',
    value: 'Value',
    condition: 'Condition',
    effects: 'Effects',
    type: 'Type',
    noDirectUse: 'This item has no direct inventory action.',
    split: 'Split',
    move: 'Move',
    clear: 'Clear selection',
    splitTitle: 'Split stack',
    splitHelp: 'Choose how many units to move into a new free slot.',
    splitAmount: 'Amount to split',
    one: '1 unit',
    half: 'Half',
    confirm: 'Split stack',
    cancel: 'Cancel',
    accessible: 'Accessible',
    unavailable: 'Unavailable',
    movedTitle: 'Moved',
    movedMessage: 'The item was moved.',
    usedTitle: 'Used',
    usedMessage: 'The item was used.',
    splitDoneTitle: 'Stack split',
    splitDoneMessage: 'A separate stack was created in a free slot.',
    customize: 'Customize',
    appearance: 'Inventory appearance',
    accent: 'Accent color',
    surface: 'Panel color',
    panelOpacity: 'Panel opacity',
    backdropOpacity: 'Map dimming',
    itemSize: 'Item size',
    reset: 'Reset defaults',
    outsideClose: 'Click outside the popup to close it',
    health: 'Health', energy: 'Energy', satiety: 'Satiety', hydration: 'Hydration', stress: 'Stress', policeHeat: 'Police heat'
  }
};

export function InventoryView({ onStateChange, onClose }: Props) {
  const { locale, runtime } = useI18n();
  const { push } = useNotifications();
  const copy = COPY[locale];
  const [inventory, setInventory] = useState<InventoryState | null>(null);
  const [catalog, setCatalog] = useState<ItemDefinition[]>([]);
  const [externalKey, setExternalKey] = useState<InventoryContainerKey>('ground');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitQuantity, setSplitQuantity] = useState(1);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [theme, setTheme] = useState<InventoryThemeSettings>(loadTheme);

  useEffect(() => {
    let active = true;
    Promise.all([getInventory(), getItemCatalog()])
      .then(([nextInventory, nextCatalog]) => {
        if (!active) return;
        setInventory(nextInventory);
        setExternalKey(nextInventory.selectedExternalKey);
        setCatalog(nextCatalog.items);

        const playerContainer = nextInventory.containers.find(container => container.key === 'player');
        const nextMap = new Map(nextCatalog.items.map(item => [item.key, item]));
        const firstUsable = playerContainer?.items.find(item => {
          const definition = resolveDefinition(nextMap, item.itemKey);
          return Boolean(definition && Object.keys(definition.useEffects).length > 0);
        });
        setSelectedId(firstUsable?.id ?? playerContainer?.items[0]?.id ?? null);
      })
      .catch(reason => {
        if (!active) return;
        const message = humanizeError(reason, locale);
        setError(message);
        push({ tone: 'error', title: copy.title, message });
      });
    return () => { active = false; };
  }, [copy.title, locale, push]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (customizeOpen) setCustomizeOpen(false);
        else if (splitOpen) setSplitOpen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [customizeOpen, onClose, splitOpen]);

  const catalogByKey = useMemo(() => new Map(catalog.map(item => [item.key, item])), [catalog]);
  const allInventoryItems = useMemo(
    () => inventory?.containers.flatMap(container => container.items) ?? [],
    [inventory]
  );
  const selected = allInventoryItems.find(item => item.id === selectedId) ?? null;
  const hovered = allInventoryItems.find(item => item.id === hoveredId) ?? null;
  const preview = hovered ?? selected;
  const previewDefinition = preview ? resolveDefinition(catalogByKey, preview.itemKey) : null;
  const selectedDefinition = selected ? resolveDefinition(catalogByKey, selected.itemKey) : null;
  const player = inventory?.containers.find(container => container.key === 'player');
  const external = inventory?.containers.find(container => container.key === externalKey);

  const categoryCounts = useMemo(() => {
    const counts = new Map<ItemCategory, number>();
    if (!player) return counts;
    for (const item of player.items) {
      const category = resolveDefinition(catalogByKey, item.itemKey)?.category;
      if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return counts;
  }, [catalogByKey, player]);

  function matchesFilter(item: InventoryItem, definition: ItemDefinition | null) {
    if (categoryFilter !== 'all' && definition?.category !== categoryFilter) return false;
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;
    const haystack = [runtime(item.displayName), item.itemKey, definition?.displayName ?? '', definition?.subcategory ?? '']
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalized);
  }

  function selectItem(id: string) {
    setSelectedId(id);
    setSplitOpen(false);
  }

  async function move(itemId: string, target: InventoryContainerKey, slot?: number) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = await moveInventoryItem(itemId, target, slot);
      setInventory(next);
      setSelectedId(next.containers.find(container => container.key === 'player')?.items[0]?.id ?? null);
      setHoveredId(null);
      setSplitOpen(false);
      push({ tone: 'info', title: copy.movedTitle, message: copy.movedMessage });
    } catch (reason) {
      const message = humanizeError(reason, locale);
      setError(message);
      push({ tone: 'error', title: copy.title, message });
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
      const carried = result.inventory.containers.find(container => container.key === 'player');
      const stillExists = carried?.items.some(next => next.id === item.id) ?? false;
      if (!stillExists) setSelectedId(carried?.items[0]?.id ?? null);
      setHoveredId(null);
      push({ tone: 'success', title: copy.usedTitle, message: copy.usedMessage });
    } catch (reason) {
      const message = humanizeError(reason, locale);
      setError(message);
      push({ tone: 'error', title: copy.title, message });
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
      setHoveredId(null);
      push({ tone: 'success', title: copy.splitDoneTitle, message: copy.splitDoneMessage });
    } catch (reason) {
      const message = humanizeError(reason, locale);
      setError(message);
      push({ tone: 'error', title: copy.title, message });
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
    '--inventory-item-scale': String(theme.itemScale)
  } as CSSProperties;

  if (!inventory || !player || !external) {
    return (
      <div className="inventory-modal-layer" style={themeStyle} role="dialog" aria-modal="true" aria-label={copy.title} onMouseDown={closeFromBackdrop}>
        <div className="inventory-modal inventory-modal-loading">
          <GameIcon name="package" size={30} />
          <b>{copy.title}</b>
          <span>{error ?? 'Loading...'}</span>
          <button className="inventory-close" onClick={onClose} aria-label={copy.close}><GameIcon name="x" size={19} /></button>
        </div>
      </div>
    );
  }

  const playerWeightPct = Math.min(100, player.weightGrams / player.capacityGrams * 100);
  const moveTarget = selected?.containerKey === 'player' ? external : player;
  const previewIsSelected = Boolean(preview && selected && preview.id === selected.id);
  const selectedUsable = Boolean(selected && isUsable(selected, selectedDefinition));
  const selectedSplittable = Boolean(selected?.stackable && selected.quantity > 1);

  return (
    <div className="inventory-modal-layer" style={themeStyle} role="dialog" aria-modal="true" aria-label={copy.title} onMouseDown={closeFromBackdrop}>
      <section className="inventory-modal" onMouseDown={event => event.stopPropagation()}>
        <header className="inventory-modal-header">
          <div className="inventory-modal-heading">
            <span className="inventory-modal-icon"><GameIcon name="package" size={22} /></span>
            <div>
              <span className="eyebrow">SOL DORADO</span>
              <h1>{copy.title}</h1>
              <p>{copy.subtitle}</p>
            </div>
          </div>

          <div className="inventory-modal-stats">
            <div className="inventory-stat">
              <small>{copy.capacity}</small>
              <b>{formatWeight(player.weightGrams)} <span>/ {formatWeight(player.capacityGrams)}</span></b>
              <i><span style={{ width: `${playerWeightPct}%` }} /></i>
            </div>
            <div className="inventory-stat inventory-stat-slots">
              <small>{copy.carried}</small>
              <b>{player.items.length} <span>/ {player.slotCount} {copy.slots}</span></b>
            </div>
          </div>

          <div className="inventory-header-actions">
            <button
              className={`inventory-customize-button ${customizeOpen ? 'inventory-customize-button-active' : ''}`}
              onClick={() => { setCustomizeOpen(value => !value); setSplitOpen(false); }}
              aria-expanded={customizeOpen}
            >
              <GameIcon name="sparkles" size={16} />
              <span>{copy.customize}</span>
            </button>
            <button className="inventory-close" onClick={onClose} aria-label={copy.close} title={`${copy.close} · Esc`}>
              <GameIcon name="x" size={19} />
            </button>
          </div>

          {customizeOpen && (
            <ThemeControls
              copy={copy}
              theme={theme}
              onChange={setTheme}
              onReset={() => setTheme(DEFAULT_THEME)}
            />
          )}
        </header>

        {error && <div className="inventory-modal-error"><GameIcon name="alert-triangle" size={16} /> {error}</div>}

        <div className="inventory-modal-body">
          <section className="inventory-player-column">
            <div className="inventory-toolbar">
              <label className="inventory-search">
                <GameIcon name="search" size={16} />
                <input value={query} onChange={event => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} />
                {query && <button type="button" onClick={() => setQuery('')} aria-label={copy.clear}><GameIcon name="x" size={14} /></button>}
              </label>

              <div className="inventory-filterbar" aria-label="Item categories">
                <button className={categoryFilter === 'all' ? 'inventory-filter inventory-filter-active' : 'inventory-filter'} onClick={() => setCategoryFilter('all')}>
                  {copy.all}<b>{player.items.length}</b>
                </button>
                {CATEGORY_ORDER.map(category => {
                  const count = categoryCounts.get(category) ?? 0;
                  return (
                    <button
                      key={category}
                      className={categoryFilter === category ? 'inventory-filter inventory-filter-active' : 'inventory-filter'}
                      disabled={count === 0}
                      onClick={() => setCategoryFilter(category)}
                    >
                      {copy.categories[category]}<b>{count}</b>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="inventory-grid-heading">
              <div>
                <span className="eyebrow">{copy.carried}</span>
                <b>{runtime(player.label)}</b>
              </div>
              <small>{player.items.length} {copy.occupied} · {player.slotCount} {copy.slots}</small>
            </div>

            <div className="inventory-grid-scroll inventory-grid-scroll-player">
              <ContainerGrid
                container={player}
                selectedId={selectedId}
                busy={busy}
                catalogByKey={catalogByKey}
                isVisible={matchesFilter}
                onSelect={selectItem}
                onHover={setHoveredId}
                onMove={move}
                onQuickUse={item => void useItem(item)}
                quickSlots
              />
            </div>

            <div className="inventory-grid-footer">
              <span><GameIcon name="mouse-pointer" size={15} /> {copy.hoverHint}</span>
              <span><GameIcon name="sparkles" size={15} /> {copy.quickUseHint}</span>
            </div>
          </section>

          <aside className="inventory-context-column">
            <ItemPreview
              item={preview}
              definition={previewDefinition}
              source={preview ? inventory.containers.find(container => container.key === preview.containerKey) ?? null : null}
              selected={previewIsSelected}
              copy={copy}
              locale={locale}
              busy={busy}
              canUse={selectedUsable && previewIsSelected}
              canSplit={selectedSplittable && previewIsSelected}
              moveTarget={previewIsSelected ? moveTarget : null}
              onUse={() => selected && void useItem(selected)}
              onSplit={beginSplit}
              onMove={() => selected && moveTarget?.accessible && void move(selected.id, moveTarget.key)}
              onClear={() => { setSelectedId(null); setSplitOpen(false); }}
            />

            {splitOpen && selected && (
              <div className="inventory-split-panel">
                <div className="inventory-split-heading">
                  <div><span className="eyebrow">{copy.splitTitle}</span><b>{runtime(selected.displayName)}</b></div>
                  <button onClick={() => setSplitOpen(false)} aria-label={copy.cancel}><GameIcon name="x" size={15} /></button>
                </div>
                <p>{copy.splitHelp}</p>
                <label>
                  <span>{copy.splitAmount}</span>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, selected.quantity - 1)}
                    value={splitQuantity}
                    onChange={event => setSplitQuantity(Number(event.target.value))}
                  />
                </label>
                <div className="inventory-split-shortcuts">
                  <button onClick={() => setSplitQuantity(1)}>{copy.one}</button>
                  <button onClick={() => setSplitQuantity(Math.max(1, Math.floor(selected.quantity / 2)))}>{copy.half}</button>
                </div>
                <div className="inventory-split-actions">
                  <button className="secondary-button" onClick={() => setSplitOpen(false)}>{copy.cancel}</button>
                  <button className="primary-button" disabled={busy} onClick={() => void confirmSplit()}>{copy.confirm}</button>
                </div>
              </div>
            )}

            <section className="inventory-external-panel">
              <div className="inventory-context-title">
                <div><span className="eyebrow">{copy.nearby}</span><b>{runtime(external.label)}</b></div>
                <small>{external.items.length} / {external.slotCount}</small>
              </div>

              <div className="inventory-context-switcher">
                {inventory.containers.filter(container => container.key !== 'player').map(container => (
                  <button
                    key={container.key}
                    className={container.key === externalKey ? 'inventory-context-tab inventory-context-tab-active' : 'inventory-context-tab'}
                    disabled={!container.accessible}
                    title={runtime(container.accessReason)}
                    onClick={() => { setExternalKey(container.key); setSelectedId(null); setHoveredId(null); setSplitOpen(false); }}
                  >
                    <GameIcon name={containerIcon(container.key)} size={15} />
                    <span>{shortContainerLabel(container.key, locale)}</span>
                    {!container.accessible && <GameIcon name="lock" size={12} />}
                  </button>
                ))}
              </div>

              <div className="inventory-external-capacity">
                <span>{formatWeight(external.weightGrams)} / {formatWeight(external.capacityGrams)}</span>
                <i><b style={{ width: `${Math.min(100, external.weightGrams / external.capacityGrams * 100)}%` }} /></i>
              </div>

              <div className="inventory-grid-scroll inventory-grid-scroll-external">
                <ContainerGrid
                  container={external}
                  selectedId={selectedId}
                  busy={busy}
                  catalogByKey={catalogByKey}
                  isVisible={() => true}
                  onSelect={selectItem}
                  onHover={setHoveredId}
                  onMove={move}
                  onQuickUse={() => undefined}
                />
              </div>
            </section>
          </aside>
        </div>

        <footer className="inventory-modal-footer">
          <span>{copy.outsideClose}</span>
          <span><kbd>I</kbd> {locale === 'bg' ? 'затваря' : 'closes'} · <kbd>Esc</kbd> {locale === 'bg' ? 'затваря' : 'closes'}</span>
        </footer>
      </section>
    </div>
  );
}

function ThemeControls({
  copy,
  theme,
  onChange,
  onReset
}: {
  copy: InventoryModalCopy;
  theme: InventoryThemeSettings;
  onChange: (next: InventoryThemeSettings) => void;
  onReset: () => void;
}) {
  function patch(next: Partial<InventoryThemeSettings>) {
    onChange({ ...theme, ...next });
  }

  return (
    <div className="inventory-theme-panel">
      <div className="inventory-theme-heading">
        <div><span className="eyebrow">UI</span><b>{copy.appearance}</b></div>
        <button onClick={onReset}>{copy.reset}</button>
      </div>
      <div className="inventory-theme-colors">
        <label>
          <span>{copy.accent}</span>
          <input type="color" value={theme.accent} onChange={event => patch({ accent: event.target.value })} />
        </label>
        <label>
          <span>{copy.surface}</span>
          <input type="color" value={theme.surface} onChange={event => patch({ surface: event.target.value })} />
        </label>
      </div>
      <ThemeRange label={copy.panelOpacity} value={Math.round(theme.panelOpacity * 100)} min={72} max={100} suffix="%" onChange={value => patch({ panelOpacity: value / 100 })} />
      <ThemeRange label={copy.backdropOpacity} value={Math.round(theme.backdropOpacity * 100)} min={10} max={72} suffix="%" onChange={value => patch({ backdropOpacity: value / 100 })} />
      <ThemeRange label={copy.itemSize} value={Math.round(theme.itemScale * 100)} min={90} max={125} suffix="%" onChange={value => patch({ itemScale: value / 100 })} />
    </div>
  );
}

function ThemeRange({
  label,
  value,
  min,
  max,
  suffix,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="inventory-theme-range">
      <span><b>{label}</b><em>{value}{suffix}</em></span>
      <input type="range" min={min} max={max} value={value} onChange={event => onChange(Number(event.target.value))} />
    </label>
  );
}

interface ContainerGridProps {
  container: InventoryContainer;
  selectedId: string | null;
  busy: boolean;
  catalogByKey: Map<string, ItemDefinition>;
  isVisible: (item: InventoryItem, definition: ItemDefinition | null) => boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onMove: (itemId: string, target: InventoryContainerKey, slot?: number) => void;
  onQuickUse: (item: InventoryItem) => void;
  quickSlots?: boolean;
}

function ContainerGrid({
  container,
  selectedId,
  busy,
  catalogByKey,
  isVisible,
  onSelect,
  onHover,
  onMove,
  onQuickUse,
  quickSlots = false
}: ContainerGridProps) {
  const { runtime } = useI18n();
  const slots = Array.from({ length: container.slotCount }, (_, slotIndex) =>
    container.items.find(item => item.slotIndex === slotIndex) ?? null
  );

  function drop(event: DragEvent<HTMLButtonElement>, slotIndex: number) {
    event.preventDefault();
    const itemId = event.dataTransfer.getData('application/x-sol-dorado-item');
    if (itemId) onMove(itemId, container.key, slotIndex);
  }

  return (
    <div className={container.key === 'player' ? 'inventory-slot-grid inventory-slot-grid-player' : 'inventory-slot-grid inventory-slot-grid-external'}>
      {slots.map((item, slotIndex) => {
        const definition = item ? resolveDefinition(catalogByKey, item.itemKey) : null;
        const filteredOut = Boolean(item && !isVisible(item, definition));
        const usable = Boolean(item && isUsable(item, definition));
        return (
          <button
            key={slotIndex}
            type="button"
            className={[
              'inventory-modal-slot',
              item ? 'inventory-modal-slot-filled' : '',
              item?.id === selectedId ? 'inventory-modal-slot-selected' : '',
              filteredOut ? 'inventory-modal-slot-filtered' : '',
              usable && container.key === 'player' ? 'inventory-modal-slot-usable' : ''
            ].filter(Boolean).join(' ')}
            disabled={busy}
            draggable={Boolean(item)}
            onClick={() => item && onSelect(item.id)}
            onDoubleClick={() => item && onQuickUse(item)}
            onMouseEnter={() => item && onHover(item.id)}
            onMouseLeave={() => item && onHover(null)}
            onDragStart={event => {
              if (!item) return;
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('application/x-sol-dorado-item', item.id);
            }}
            onDragEnd={() => onHover(null)}
            onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}
            onDrop={event => drop(event, slotIndex)}
            aria-label={item ? runtime(item.displayName) : `Slot ${slotIndex + 1}`}
          >
            <span className="inventory-slot-index">{String(slotIndex + 1).padStart(2, '0')}</span>
            {item && <SlotContents item={item} definition={definition} />}
            {quickSlots && slotIndex < 5 && <span className="inventory-hotkey">{slotIndex + 1}</span>}
          </button>
        );
      })}
    </div>
  );
}

function SlotContents({ item, definition }: { item: InventoryItem; definition: ItemDefinition | null }) {
  const { locale, runtime } = useI18n();
  const condition = readCondition(item.metadata);
  const usable = isUsable(item, definition);
  return (
    <>
      <span className="inventory-slot-name">{runtime(item.displayName)}</span>
      <ItemThumbnail item={item} definition={definition} />
      <span className="inventory-slot-bottom">
        {usable && definition ? <span className="inventory-slot-use-hint">{useLabel(definition, locale)}</span> : <span />}
        {item.quantity > 1 && <b className="inventory-slot-quantity">×{item.quantity}</b>}
      </span>
      {definition && definition.legality !== 'legal' && <span className={`inventory-legality-dot inventory-legality-dot-${definition.legality}`} />}
      {condition !== null && <span className="inventory-slot-condition"><i style={{ width: `${condition}%` }} /></span>}
    </>
  );
}

function ItemPreview({
  item,
  definition,
  source,
  selected,
  copy,
  locale,
  busy,
  canUse,
  canSplit,
  moveTarget,
  onUse,
  onSplit,
  onMove,
  onClear
}: {
  item: InventoryItem | null;
  definition: ItemDefinition | null;
  source: InventoryContainer | null;
  selected: boolean;
  copy: InventoryModalCopy;
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
  if (!item) {
    return (
      <section className="inventory-preview inventory-preview-empty">
        <GameIcon name="info" size={24} />
        <b>{copy.hoverHint}</b>
        <span>{copy.clickHint}</span>
      </section>
    );
  }

  const condition = readCondition(item.metadata);
  return (
    <section className={`inventory-preview ${selected ? 'inventory-preview-selected' : ''}`}>
      <div className="inventory-preview-top">
        <ItemThumbnail item={item} definition={definition} large />
        <div className="inventory-preview-heading">
          <span className="eyebrow">{selected ? copy.selected : copy.preview}</span>
          <h2>{runtime(item.displayName)}</h2>
          <div className="inventory-preview-chips">
            {definition && <span>{copy.categories[definition.category]}</span>}
            {definition && <LegalityBadge legality={definition.legality} locale={locale} />}
          </div>
        </div>
      </div>

      {canUse && definition && (
        <button className="inventory-primary-action" disabled={busy} onClick={onUse}>
          <GameIcon name="sparkles" size={17} />
          <span><b>{useLabel(definition, locale)}</b><small>{useEffectSummary(definition, copy)}</small></span>
        </button>
      )}

      <div className="inventory-preview-meta">
        <Meta label={copy.quantity} value={String(item.quantity)} />
        <Meta label={copy.stack} value={definition ? `${item.quantity} / ${definition.maxStack}` : item.stackable ? 'Stackable' : 'Single'} />
        <Meta label={copy.unitWeight} value={formatWeight(item.unitWeightGrams)} />
        <Meta label={copy.totalWeight} value={formatWeight(item.unitWeightGrams * item.quantity)} />
        {definition && <Meta label={copy.value} value={formatMoney(definition.basePriceCents)} />}
        {definition && <Meta label={copy.type} value={titleCase(definition.subcategory)} />}
      </div>

      {condition !== null && (
        <div className="inventory-preview-condition">
          <span><small>{copy.condition}</small><b>{condition}%</b></span>
          <i><b style={{ width: `${condition}%` }} /></i>
        </div>
      )}

      {definition && <EffectList definition={definition} copy={copy} />}
      {!definition?.useEffects || Object.keys(definition.useEffects).length === 0 ? <p className="inventory-passive-note">{copy.noDirectUse}</p> : null}

      <div className="inventory-preview-location">
        <GameIcon name="map-pin" size={14} />
        <span>{source ? runtime(source.label) : item.containerKey}</span>
      </div>

      {selected ? (
        <div className="inventory-preview-actions">
          {canSplit && <button className="secondary-button" disabled={busy} onClick={onSplit}>{copy.split}</button>}
          {moveTarget?.accessible && <button className="secondary-button" disabled={busy} onClick={onMove}>{copy.move} · {runtime(moveTarget.label)}</button>}
          <button className="inventory-clear-selection" disabled={busy} onClick={onClear}>{copy.clear}</button>
        </div>
      ) : (
        <div className="inventory-hover-action-hint"><GameIcon name="mouse-pointer" size={14} /> {copy.clickHint}</div>
      )}
    </section>
  );
}

function ItemThumbnail({ item, definition, large = false }: { item: InventoryItem; definition: ItemDefinition | null; large?: boolean }) {
  const baseSrc = definition?.image.localPath;
  const src = baseSrc ? `${baseSrc}?v=${ITEM_ASSET_REV}` : null;
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>(src ? 'loading' : 'failed');

  useEffect(() => setStatus(src ? 'loading' : 'failed'), [src]);

  return (
    <span className={large ? 'inventory-item-thumb inventory-item-thumb-large' : 'inventory-item-thumb'}>
      {status !== 'loaded' && <span className="inventory-item-fallback">{item.symbol}</span>}
      {src && status !== 'failed' && (
        <img
          className={status === 'loaded' ? 'inventory-item-image-loaded' : ''}
          src={src}
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('failed')}
        />
      )}
    </span>
  );
}

function LegalityBadge({ legality, locale }: { legality: ItemDefinition['legality']; locale: 'bg' | 'en' }) {
  const labels = locale === 'bg'
    ? { legal: 'Легален', restricted: 'Ограничен', regulated: 'Регулиран', illegal: 'Нелегален' }
    : { legal: 'Legal', restricted: 'Restricted', regulated: 'Regulated', illegal: 'Illegal' };
  return <span className={`inventory-legality inventory-legality-${legality}`}>{labels[legality]}</span>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="inventory-meta"><small>{label}</small><b>{value}</b></div>;
}

function EffectList({ definition, copy }: { definition: ItemDefinition; copy: InventoryModalCopy }) {
  const labels: Record<keyof ItemDefinition['useEffects'], string> = {
    health: copy.health,
    energy: copy.energy,
    satiety: copy.satiety,
    hydration: copy.hydration,
    stress: copy.stress,
    policeHeat: copy.policeHeat
  };
  const entries = Object.entries(definition.useEffects) as Array<[keyof ItemDefinition['useEffects'], number]>;
  if (!entries.length) return null;
  return (
    <div className="inventory-effects" aria-label={copy.effects}>
      {entries.map(([key, value]) => (
        <span key={key} className={value >= 0 ? 'inventory-effect-positive' : 'inventory-effect-negative'}>
          {labels[key]} {value > 0 ? '+' : ''}{value}
        </span>
      ))}
    </div>
  );
}

function resolveDefinition(catalogByKey: Map<string, ItemDefinition>, itemKey: string): ItemDefinition | null {
  return catalogByKey.get(itemKey) ?? catalogByKey.get(LEGACY_ITEM_ALIASES[itemKey] ?? '') ?? null;
}

function isUsable(item: InventoryItem, definition: ItemDefinition | null) {
  return item.containerKey === 'player' && Boolean(definition && Object.keys(definition.useEffects).length > 0);
}

function readCondition(metadata: Record<string, unknown>) {
  const value = typeof metadata.condition === 'number' ? metadata.condition : typeof metadata.durability === 'number' ? metadata.durability : null;
  if (value === null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function useLabel(definition: ItemDefinition, locale: 'bg' | 'en') {
  if (locale === 'bg') {
    if (definition.category === 'drink') return 'Изпий';
    if (definition.category === 'food') return 'Изяж';
    if (definition.category === 'medical') return 'Използвай';
    return 'Използвай';
  }
  if (definition.category === 'drink') return 'Drink';
  if (definition.category === 'food') return 'Eat';
  return 'Use';
}

function useEffectSummary(definition: ItemDefinition, copy: InventoryModalCopy) {
  const labels: Partial<Record<keyof ItemDefinition['useEffects'], string>> = {
    health: copy.health,
    energy: copy.energy,
    satiety: copy.satiety,
    hydration: copy.hydration,
    stress: copy.stress
  };
  const first = (Object.entries(definition.useEffects) as Array<[keyof ItemDefinition['useEffects'], number]>)[0];
  if (!first) return '';
  const [key, value] = first;
  return `${labels[key] ?? key} ${value > 0 ? '+' : ''}${value}`;
}

function containerIcon(key: InventoryContainerKey) {
  if (key === 'ground') return 'map-pin' as const;
  if (key === 'home') return 'building' as const;
  if (key === 'vehicle_trunk') return 'car' as const;
  return 'package' as const;
}

function shortContainerLabel(key: InventoryContainerKey, locale: 'bg' | 'en') {
  const bg: Record<InventoryContainerKey, string> = { player: 'Играч', ground: 'Наблизо', home: 'Дом', vehicle_trunk: 'Багажник' };
  const en: Record<InventoryContainerKey, string> = { player: 'Player', ground: 'Nearby', home: 'Home', vehicle_trunk: 'Trunk' };
  return (locale === 'bg' ? bg : en)[key];
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
      backdropOpacity: clampNumber(stored.backdropOpacity, 0.1, 0.72, DEFAULT_THEME.backdropOpacity),
      itemScale: clampNumber(stored.itemScale, 0.9, 1.25, DEFAULT_THEME.itemScale)
    };
  } catch {
    return DEFAULT_THEME;
  }
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function hexToRgbTriplet(hex: string) {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);
  if (!Number.isFinite(value)) return '11 23 28';
  return `${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255}`;
}

function humanizeError(reason: unknown, locale: 'bg' | 'en') {
  const raw = reason instanceof Error ? reason.message : String(reason);
  const bg: Record<string, string> = {
    inventory_container_not_accessible: 'Този контейнер не е достъпен от текущото ти местоположение.',
    inventory_item_not_found: 'Предметът вече не е наличен.',
    inventory_container_not_found: 'Контейнерът не е намерен.',
    inventory_container_full: 'Няма свободен слот.',
    inventory_capacity_exceeded: 'Теглото надвишава капацитета на контейнера.',
    inventory_item_not_carried: 'Предметът трябва да е в твоя инвентар, за да го използваш.',
    inventory_item_not_usable: 'Този предмет няма директно действие.',
    inventory_item_not_splittable: 'Този предмет не може да бъде разделян.',
    inventory_split_quantity_invalid: 'Избери количество между 1 и количеството в стака минус 1.',
    inventory_slot_occupied: 'Избраният слот вече е зает.'
  };
  const en: Record<string, string> = {
    inventory_container_not_accessible: 'That container is not accessible from your current location.',
    inventory_item_not_found: 'The item is no longer available.',
    inventory_container_not_found: 'The container could not be found.',
    inventory_container_full: 'There is no free slot.',
    inventory_capacity_exceeded: 'The container weight capacity would be exceeded.',
    inventory_item_not_carried: 'The item must be carried before it can be used.',
    inventory_item_not_usable: 'That item has no direct use action.',
    inventory_item_not_splittable: 'That item cannot be split.',
    inventory_split_quantity_invalid: 'Choose an amount between 1 and the stack quantity minus 1.',
    inventory_slot_occupied: 'That slot is already occupied.'
  };
  return (locale === 'bg' ? bg : en)[raw] ?? raw.replaceAll('_', ' ');
}
