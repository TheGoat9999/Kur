import { useEffect, useMemo, useState, type DragEvent } from 'react';
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
  legality: string;
  effects: string;
  type: string;
  noDirectUse: string;
  use: string;
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

const COPY: Record<'bg' | 'en', InventoryModalCopy> = {
  bg: {
    title: 'Инвентар',
    subtitle: 'Премествай с drag & drop. Двоен клик използва предмета веднага, когато е възможно.',
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
    hoverHint: 'Задръж курсора върху предмет за бърза информация.',
    clickHint: 'Кликни предмет, за да отключиш действията.',
    quickUseHint: 'Двоен клик за бързо използване',
    selected: 'Избран предмет',
    preview: 'Преглед',
    quantity: 'Количество',
    stack: 'Стак',
    unitWeight: 'Тегло / бр.',
    totalWeight: 'Общо тегло',
    value: 'Стойност',
    condition: 'Състояние',
    legality: 'Статус',
    effects: 'Ефекти',
    type: 'Тип',
    noDirectUse: 'Предметът няма директно действие от инвентара.',
    use: 'Използвай',
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
    health: 'Здраве', energy: 'Енергия', satiety: 'Ситост', hydration: 'Хидратация', stress: 'Стрес', policeHeat: 'Police heat'
  },
  en: {
    title: 'Inventory',
    subtitle: 'Drag & drop to move items. Double-click a usable item for immediate use.',
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
    clickHint: 'Click an item to unlock its actions.',
    quickUseHint: 'Double-click for quick use',
    selected: 'Selected item',
    preview: 'Preview',
    quantity: 'Quantity',
    stack: 'Stack',
    unitWeight: 'Weight / unit',
    totalWeight: 'Total weight',
    value: 'Value',
    condition: 'Condition',
    legality: 'Status',
    effects: 'Effects',
    type: 'Type',
    noDirectUse: 'This item has no direct inventory action.',
    use: 'Use',
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

  useEffect(() => {
    let active = true;
    Promise.all([getInventory(), getItemCatalog()])
      .then(([nextInventory, nextCatalog]) => {
        if (!active) return;
        setInventory(nextInventory);
        setExternalKey(nextInventory.selectedExternalKey);
        setCatalog(nextCatalog.items);
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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (splitOpen) setSplitOpen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, splitOpen]);

  const catalogByKey = useMemo(() => new Map(catalog.map(item => [item.key, item])), [catalog]);
  const allInventoryItems = useMemo(
    () => inventory?.containers.flatMap(container => container.items) ?? [],
    [inventory]
  );
  const selected = allInventoryItems.find(item => item.id === selectedId) ?? null;
  const hovered = allInventoryItems.find(item => item.id === hoveredId) ?? null;
  const preview = hovered ?? selected;
  const previewDefinition = preview ? catalogByKey.get(preview.itemKey) ?? null : null;
  const selectedDefinition = selected ? catalogByKey.get(selected.itemKey) ?? null : null;
  const player = inventory?.containers.find(container => container.key === 'player');
  const external = inventory?.containers.find(container => container.key === externalKey);

  const categoryCounts = useMemo(() => {
    const counts = new Map<ItemCategory, number>();
    if (!player) return counts;
    for (const item of player.items) {
      const category = catalogByKey.get(item.itemKey)?.category;
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
      setSelectedId(null);
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
    const definition = catalogByKey.get(item.itemKey) ?? null;
    if (!isUsable(item, definition)) return;
    setBusy(true);
    setError(null);
    try {
      const result = await useInventoryItem(item.id);
      setInventory(result.inventory);
      onStateChange(result.state);
      const stillExists = result.inventory.containers.some(container => container.items.some(next => next.id === item.id));
      if (!stillExists) setSelectedId(current => current === item.id ? null : current);
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

  if (!inventory || !player || !external) {
    return (
      <div className="inventory-modal-layer" role="dialog" aria-modal="true" aria-label={copy.title}>
        <div className="inventory-modal inventory-modal-loading">
          <GameIcon name="package" size={28} />
          <b>{copy.title}</b>
          <span>{error ?? 'Loading...'}</span>
          <button className="inventory-close" onClick={onClose} aria-label={copy.close}><GameIcon name="x" size={18} /></button>
        </div>
      </div>
    );
  }

  const playerWeightPct = Math.min(100, player.weightGrams / player.capacityGrams * 100);
  const selectedSource = selected ? inventory.containers.find(container => container.key === selected.containerKey) ?? null : null;
  const moveTarget = selected?.containerKey === 'player' ? external : player;
  const previewIsSelected = Boolean(preview && selected && preview.id === selected.id);
  const selectedUsable = Boolean(selected && isUsable(selected, selectedDefinition));
  const selectedSplittable = Boolean(selected?.stackable && selected.quantity > 1);

  return (
    <div className="inventory-modal-layer" role="dialog" aria-modal="true" aria-label={copy.title}>
      <section className="inventory-modal">
        <header className="inventory-modal-header">
          <div className="inventory-modal-heading">
            <span className="inventory-modal-icon"><GameIcon name="package" size={20} /></span>
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

          <button className="inventory-close" onClick={onClose} aria-label={copy.close} title={`${copy.close} · Esc`}>
            <GameIcon name="x" size={18} />
          </button>
        </header>

        {error && <div className="inventory-modal-error"><GameIcon name="alert-triangle" size={15} /> {error}</div>}

        <div className="inventory-modal-body">
          <section className="inventory-player-column">
            <div className="inventory-toolbar">
              <label className="inventory-search">
                <GameIcon name="search" size={15} />
                <input value={query} onChange={event => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} />
                {query && <button type="button" onClick={() => setQuery('')} aria-label={copy.clear}><GameIcon name="x" size={13} /></button>}
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
              <span><GameIcon name="mouse-pointer" size={14} /> {copy.hoverHint}</span>
              <span><GameIcon name="sparkles" size={14} /> {copy.quickUseHint}</span>
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
                  <button onClick={() => setSplitOpen(false)} aria-label={copy.cancel}><GameIcon name="x" size={14} /></button>
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
                    <GameIcon name={containerIcon(container.key)} size={14} />
                    <span>{shortContainerLabel(container.key, locale)}</span>
                    {!container.accessible && <GameIcon name="lock" size={11} />}
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
      </section>
    </div>
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
        const definition = item ? catalogByKey.get(item.itemKey) ?? null : null;
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
            aria-label={item?.displayName ?? `Slot ${slotIndex + 1}`}
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
  const { runtime } = useI18n();
  const condition = readCondition(item.metadata);
  return (
    <>
      <span className="inventory-slot-name">{runtime(item.displayName)}</span>
      <ItemThumbnail item={item} definition={definition} />
      {item.quantity > 1 && <b className="inventory-slot-quantity">×{item.quantity}</b>}
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
        <GameIcon name="info" size={20} />
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
        <GameIcon name="map-pin" size={13} />
        <span>{source ? runtime(source.label) : item.containerKey}</span>
      </div>

      {selected ? (
        <div className="inventory-preview-actions">
          {canUse && <button className="primary-button" disabled={busy} onClick={onUse}>{useLabel(definition!, locale)}</button>}
          {canSplit && <button className="secondary-button" disabled={busy} onClick={onSplit}>{copy.split}</button>}
          {moveTarget?.accessible && <button className="secondary-button" disabled={busy} onClick={onMove}>{copy.move} · {runtime(moveTarget.label)}</button>}
          <button className="inventory-clear-selection" disabled={busy} onClick={onClear}>{copy.clear}</button>
        </div>
      ) : (
        <div className="inventory-hover-action-hint"><GameIcon name="mouse-pointer" size={13} /> {copy.clickHint}</div>
      )}
    </section>
  );
}

function ItemThumbnail({ item, definition, large = false }: { item: InventoryItem; definition: ItemDefinition | null; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const src = definition?.image.localPath;
  useEffect(() => setFailed(false), [src]);
  return (
    <span className={large ? 'inventory-item-thumb inventory-item-thumb-large' : 'inventory-item-thumb'}>
      <span className="inventory-item-fallback">{item.symbol}</span>
      {src && !failed && <img src={src} alt="" draggable={false} onError={() => setFailed(true)} />}
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
    return 'Използвай';
  }
  if (definition.category === 'drink') return 'Drink';
  if (definition.category === 'food') return 'Eat';
  return 'Use';
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
