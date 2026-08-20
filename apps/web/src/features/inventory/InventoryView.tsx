import { useEffect, useMemo, useState, type DragEvent } from 'react';
import type {
  BootstrapState,
  InventoryContainer,
  InventoryContainerKey,
  InventoryItem,
  InventoryState
} from '@sol-dorado/contracts';
import type { ItemCategory, ItemDefinition } from '@sol-dorado/contracts/items';
import { getInventory, getItemCatalog, moveInventoryItem, useInventoryItem } from '../../lib/api';
import { GameIcon } from '../../components/GameIcon';
import { useI18n } from '../../i18n';
import { useNotifications } from '../../components/Notifications';
import './inventory.css';

interface Props { onStateChange: (state: BootstrapState) => void; }
type CategoryFilter = ItemCategory | 'all';

const CATEGORY_ORDER: readonly ItemCategory[] = [
  'personal', 'food', 'drink', 'tool', 'material', 'electronics', 'medical', 'weapon'
];

export function InventoryView({ onStateChange }: Props) {
  const { locale, t, runtime } = useI18n();
  const { push } = useNotifications();
  const copy = INVENTORY_V02_COPY[locale];
  const [inventory, setInventory] = useState<InventoryState | null>(null);
  const [catalog, setCatalog] = useState<ItemDefinition[]>([]);
  const [externalKey, setExternalKey] = useState<InventoryContainerKey>('ground');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getInventory(), getItemCatalog()])
      .then(([nextInventory, nextCatalog]) => {
        setInventory(nextInventory);
        setExternalKey(nextInventory.selectedExternalKey);
        setCatalog(nextCatalog.items);
      })
      .catch(reason => {
        const message = humanizeError(reason, locale);
        setError(message);
        push({ tone: 'error', title: t('common.actionBlocked'), message });
      });
  }, [locale, push, t]);

  const catalogByKey = useMemo(() => new Map(catalog.map(item => [item.key, item])), [catalog]);
  const selected = useMemo(
    () => inventory?.containers.flatMap(container => container.items).find(item => item.id === selectedId) ?? null,
    [inventory, selectedId]
  );
  const selectedDefinition = selected ? catalogByKey.get(selected.itemKey) ?? null : null;
  const player = inventory?.containers.find(container => container.key === 'player');
  const external = inventory?.containers.find(container => container.key === externalKey);

  const categoryCounts = useMemo(() => {
    const counts = new Map<ItemCategory, number>();
    if (!player || !external) return counts;
    for (const item of [...player.items, ...external.items]) {
      const category = catalogByKey.get(item.itemKey)?.category;
      if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return counts;
  }, [catalogByKey, external, player]);

  async function move(itemId: string, target: InventoryContainerKey, slot?: number) {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      setInventory(await moveInventoryItem(itemId, target, slot));
      setSelectedId(null);
      push({ tone: 'info', title: t('inventory.movedTitle'), message: t('inventory.movedMessage') });
    } catch (reason) {
      const message = humanizeError(reason, locale);
      setError(message);
      push({ tone: 'error', title: t('common.actionBlocked'), message });
    } finally { setBusy(false); }
  }

  async function useSelected() {
    if (!selected || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await useInventoryItem(selected.id);
      setInventory(result.inventory);
      onStateChange(result.state);
      setSelectedId(null);
      push({ tone: 'success', title: t('inventory.usedTitle'), message: t('inventory.usedMessage') });
    } catch (reason) {
      const message = humanizeError(reason, locale);
      setError(message);
      push({ tone: 'error', title: t('common.actionBlocked'), message });
    } finally { setBusy(false); }
  }

  if (!inventory || !player || !external) {
    return <section className="glass-panel grid min-h-[420px] place-items-center p-8"><div className="text-center"><GameIcon name="package" size={26} /><p className="mt-3 text-sm text-slate-400">{error ?? t('inventory.loading')}</p></div></section>;
  }

  const source = selected ? inventory.containers.find(container => container.key === selected.containerKey) : null;
  const moveTarget = selected?.containerKey === 'player' ? external : player;
  const usable = Boolean(
    selected?.containerKey === 'player' &&
    selectedDefinition &&
    Object.keys(selectedDefinition.useEffects).length > 0
  );

  return (
    <section className="space-y-4 inventory-v02">
      <div className="screen-heading">
        <div>
          <span className="eyebrow">{t('inventory.eyebrow')}</span>
          <h1>{t('inventory.title')}</h1>
          <p>{t('inventory.description')}</p>
        </div>
        <div className="feature-badge feature-badge-live"><span /> {copy.catalogLive} · {catalog.length}</div>
      </div>

      <div className="context-switcher" aria-label={t('inventory.context')}>
        {inventory.containers.filter(container => container.key !== 'player').map(container => (
          <button
            key={container.key}
            className={container.key === externalKey ? 'context-option context-option-active' : 'context-option'}
            disabled={!container.accessible}
            title={runtime(container.accessReason)}
            onClick={() => { setExternalKey(container.key); setSelectedId(null); }}
          >
            <GameIcon name={containerIcon(container.key)} size={16} />
            <span><b>{runtime(container.label)}</b><small>{container.accessible ? t('inventory.accessible') : runtime(container.accessReason)}</small></span>
            {!container.accessible && <GameIcon name="lock" size={13} />}
          </button>
        ))}
      </div>

      <div className="inventory-filterbar" aria-label={copy.categoryFilter}>
        <button
          className={categoryFilter === 'all' ? 'inventory-filter inventory-filter-active' : 'inventory-filter'}
          onClick={() => setCategoryFilter('all')}
        >
          {copy.all} <b>{player.items.length + external.items.length}</b>
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
              {copy.categories[category]} <b>{count}</b>
            </button>
          );
        })}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="inventory-layout">
        <ContainerPane
          container={player}
          selectedId={selectedId}
          busy={busy}
          catalogByKey={catalogByKey}
          categoryFilter={categoryFilter}
          onSelect={setSelectedId}
          onMove={move}
        />
        <div className="inventory-transfer"><GameIcon name="arrow-left-right" size={20} /><small>{t('inventory.drag')}</small></div>
        <ContainerPane
          container={external}
          selectedId={selectedId}
          busy={busy}
          catalogByKey={catalogByKey}
          categoryFilter={categoryFilter}
          onSelect={setSelectedId}
          onMove={move}
        />
      </div>

      <div className="item-inspector item-inspector-v02">
        {selected && source ? (
          <>
            <ItemThumbnail item={selected} definition={selectedDefinition} large />
            <div className="item-inspector-main">
              <div className="item-inspector-title-row">
                <div className="min-w-0">
                  <span className="eyebrow">{t('inventory.selected')}</span>
                  <h2>{runtime(selected.displayName)}</h2>
                </div>
                {selectedDefinition && <LegalityBadge legality={selectedDefinition.legality} locale={locale} />}
              </div>

              <div className="item-meta-grid">
                <Meta label={copy.category} value={selectedDefinition ? copy.categories[selectedDefinition.category] : runtime(selected.category)} />
                <Meta label={copy.weight} value={formatWeight(selected.unitWeightGrams * selected.quantity)} />
                <Meta label={copy.quantity} value={`${selected.quantity}${selectedDefinition ? ` / ${selectedDefinition.maxStack}` : ''}`} />
                <Meta label={copy.location} value={runtime(source.label)} />
                {selectedDefinition && <Meta label={copy.value} value={formatMoney(selectedDefinition.basePriceCents)} />}
                {selectedDefinition && <Meta label={copy.type} value={titleCase(selectedDefinition.subcategory)} />}
              </div>

              <ConditionBlock item={selected} copy={copy} />
              {selectedDefinition && <EffectList definition={selectedDefinition} copy={copy} />}
            </div>

            <div className="item-actions item-actions-v02">
              {usable && <button className="primary-button" disabled={busy} onClick={useSelected}>{useLabel(selectedDefinition!, locale)}</button>}
              {moveTarget?.accessible && <button className="secondary-button" disabled={busy} onClick={() => move(selected.id, moveTarget.key)}>{t('inventory.moveTo', { target: runtime(moveTarget.label) })}</button>}
              <button className="secondary-button" onClick={() => setSelectedId(null)}>{t('common.clear')}</button>
            </div>
          </>
        ) : <div className="flex items-center gap-3 text-sm text-slate-500"><GameIcon name="mouse-pointer" size={17} /> {t('inventory.selectHint')}</div>}
      </div>
    </section>
  );
}

interface ContainerPaneProps {
  container: InventoryContainer;
  selectedId: string | null;
  busy: boolean;
  catalogByKey: Map<string, ItemDefinition>;
  categoryFilter: CategoryFilter;
  onSelect: (id: string) => void;
  onMove: (itemId: string, target: InventoryContainerKey, slot?: number) => void;
}

function ContainerPane({ container, selectedId, busy, catalogByKey, categoryFilter, onSelect, onMove }: ContainerPaneProps) {
  const { t, runtime } = useI18n();
  const slots = Array.from({ length: container.slotCount }, (_, slotIndex) =>
    container.items.find(item => item.slotIndex === slotIndex) ?? null
  );
  const weightPercentage = Math.min(100, container.weightGrams / container.capacityGrams * 100);

  function drop(event: DragEvent<HTMLButtonElement>, slotIndex: number) {
    event.preventDefault();
    const itemId = event.dataTransfer.getData('application/x-sol-dorado-item');
    if (itemId) onMove(itemId, container.key, slotIndex);
  }

  return (
    <article className="inventory-pane">
      <header>
        <div><span className="eyebrow">{container.key === 'player' ? t('inventory.player') : t('inventory.external')}</span><h2>{runtime(container.label)}</h2></div>
        <div className="inventory-weight"><b>{formatWeight(container.weightGrams)}</b><small>{t('inventory.of', { weight: formatWeight(container.capacityGrams) })}</small></div>
      </header>
      <div className="capacity-track"><i style={{ width: `${weightPercentage}%` }} /></div>
      <div className="slot-grid">
        {slots.map((item, slotIndex) => {
          const definition = item ? catalogByKey.get(item.itemKey) ?? null : null;
          const filteredOut = Boolean(item && categoryFilter !== 'all' && definition?.category !== categoryFilter);
          return (
            <button
              key={slotIndex}
              className={`inventory-slot ${item ? 'inventory-slot-filled' : ''} ${item?.id === selectedId ? 'inventory-slot-selected' : ''} ${filteredOut ? 'inventory-slot-filtered-out' : ''}`}
              disabled={busy}
              draggable={Boolean(item)}
              onClick={() => item && onSelect(item.id)}
              onDragStart={event => {
                if (!item) return;
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('application/x-sol-dorado-item', item.id);
              }}
              onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}
              onDrop={event => drop(event, slotIndex)}
            >
              {item && <ItemContents item={item} definition={definition} quickSlot={container.key === 'player' && slotIndex < 4 ? slotIndex + 1 : null} />}
              {!item && <span className="slot-number">{String(slotIndex + 1).padStart(2, '0')}</span>}
            </button>
          );
        })}
      </div>
    </article>
  );
}

function ItemContents({ item, definition, quickSlot }: { item: InventoryItem; definition: ItemDefinition | null; quickSlot: number | null }) {
  const { runtime } = useI18n();
  const condition = readCondition(item.metadata);
  return (
    <>
      <span className="item-name">{runtime(item.displayName)}</span>
      <ItemThumbnail item={item} definition={definition} />
      {item.quantity > 1 && <b className="item-quantity">×{item.quantity}</b>}
      {quickSlot && <small className="quick-slot">{quickSlot}</small>}
      {condition !== null && <span className="slot-condition"><i style={{ width: `${condition}%` }} /></span>}
      {definition?.legality !== 'legal' && <span className={`slot-legality slot-legality-${definition?.legality}`} />}
    </>
  );
}

function ItemThumbnail({ item, definition, large = false }: { item: InventoryItem; definition: ItemDefinition | null; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const src = definition?.image.localPath;
  useEffect(() => setFailed(false), [src]);
  return (
    <span className={large ? 'item-thumb item-thumb-large' : 'item-thumb'}>
      <span className="item-thumb-fallback">{item.symbol}</span>
      {src && !failed && <img src={src} alt="" draggable={false} onError={() => setFailed(true)} />}
    </span>
  );
}

function LegalityBadge({ legality, locale }: { legality: ItemDefinition['legality']; locale: 'bg' | 'en' }) {
  const labels = locale === 'bg'
    ? { legal: 'Легален', restricted: 'Ограничен', regulated: 'Регулиран', illegal: 'Нелегален' }
    : { legal: 'Legal', restricted: 'Restricted', regulated: 'Regulated', illegal: 'Illegal' };
  return <span className={`item-legality item-legality-${legality}`}>{labels[legality]}</span>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="item-meta"><small>{label}</small><b>{value}</b></div>;
}

function ConditionBlock({ item, copy }: { item: InventoryItem; copy: (typeof INVENTORY_V02_COPY)['en'] }) {
  const condition = readCondition(item.metadata);
  if (condition === null) return null;
  return (
    <div className="item-condition-row">
      <span><small>{copy.condition}</small><b>{condition}%</b></span>
      <i><b style={{ width: `${condition}%` }} /></i>
    </div>
  );
}

function EffectList({ definition, copy }: { definition: ItemDefinition; copy: (typeof INVENTORY_V02_COPY)['en'] }) {
  const effects = Object.entries(definition.useEffects).filter(([, value]) => typeof value === 'number' && value !== 0);
  if (effects.length === 0) return <p className="item-passive-note">{copy.noDirectUse}</p>;
  return (
    <div className="item-effects">
      {effects.map(([key, value]) => (
        <span key={key} className={Number(value) >= 0 ? 'item-effect-positive' : 'item-effect-negative'}>
          {effectLabel(key, copy)} {Number(value) > 0 ? '+' : ''}{value}
        </span>
      ))}
    </div>
  );
}

function effectLabel(key: string, copy: (typeof INVENTORY_V02_COPY)['en']) {
  const labels: Record<string, string> = {
    health: copy.health,
    energy: copy.energy,
    satiety: copy.satiety,
    hydration: copy.hydration,
    stress: copy.stress,
    policeHeat: copy.policeHeat
  };
  return labels[key] ?? titleCase(key);
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

function readCondition(metadata: Record<string, unknown>) {
  const value = metadata.condition ?? metadata.durability;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function containerIcon(key: InventoryContainerKey) {
  if (key === 'home') return 'building' as const;
  if (key === 'vehicle_trunk') return 'car' as const;
  return 'map-pin' as const;
}

function formatWeight(grams: number) { return `${(grams / 1000).toFixed(2)} kg`; }
function formatMoney(cents: number) { return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`; }
function titleCase(value: string) { return value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase()); }

const INVENTORY_V02_COPY = {
  en: {
    catalogLive: 'Item catalog live', categoryFilter: 'Filter inventory by category', all: 'All', category: 'Category',
    weight: 'Weight', quantity: 'Stack', location: 'Location', value: 'Base value', type: 'Type', condition: 'Condition',
    noDirectUse: 'No direct use action. This item is used by another game system or interaction.',
    health: 'Health', energy: 'Energy', satiety: 'Satiety', hydration: 'Hydration', stress: 'Stress', policeHeat: 'Heat',
    categories: { personal: 'Personal', food: 'Food', drink: 'Drinks', tool: 'Tools', material: 'Materials', electronics: 'Electronics', medical: 'Medical', weapon: 'Weapons' }
  },
  bg: {
    catalogLive: 'Активен каталог', categoryFilter: 'Филтър по категория', all: 'Всички', category: 'Категория',
    weight: 'Тегло', quantity: 'Стак', location: 'Местоположение', value: 'Базова стойност', type: 'Тип', condition: 'Състояние',
    noDirectUse: 'Няма директно действие. Предметът се използва от друга система или интеракция.',
    health: 'Здраве', energy: 'Енергия', satiety: 'Ситост', hydration: 'Хидратация', stress: 'Стрес', policeHeat: 'Издирване',
    categories: { personal: 'Лични', food: 'Храна', drink: 'Напитки', tool: 'Инструменти', material: 'Материали', electronics: 'Електроника', medical: 'Медицински', weapon: 'Оръжия' }
  }
} as const;

function humanizeError(reason: unknown, locale: 'bg' | 'en') {
  const value = reason instanceof Error ? reason.message : String(reason);
  const messages: Record<string, { en: string; bg: string }> = {
    inventory_container_not_accessible: { en: 'This container is not accessible from your current location.', bg: 'Този контейнер не е достъпен от текущото ти местоположение.' },
    inventory_item_not_found: { en: 'The item could not be found.', bg: 'Предметът не беше намерен.' },
    inventory_container_not_found: { en: 'The target container could not be found.', bg: 'Целевият контейнер не беше намерен.' },
    inventory_container_full: { en: 'The target container is full.', bg: 'Целевият контейнер е пълен.' },
    inventory_capacity_exceeded: { en: 'The target container cannot carry this weight.', bg: 'Целевият контейнер не може да поеме това тегло.' },
    inventory_item_not_carried: { en: 'Carry the item before using it.', bg: 'Трябва да носиш предмета, преди да го използваш.' },
    inventory_item_not_usable: { en: 'This item cannot be used yet.', bg: 'Този предмет все още не може да бъде използван.' }
  };
  if (messages[value]) return messages[value][locale];
  return value.replaceAll('_', ' ').replace(/^inventory /, '').replace(/^./, letter => letter.toUpperCase());
}
