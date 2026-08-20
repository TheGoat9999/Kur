import { useEffect, useMemo, useState, type DragEvent } from 'react';
import type {
  BootstrapState,
  InventoryContainer,
  InventoryContainerKey,
  InventoryItem,
  InventoryState
} from '@sol-dorado/contracts';
import { getInventory, moveInventoryItem, useInventoryItem } from '../../lib/api';
import { GameIcon } from '../../components/GameIcon';
import { useI18n } from '../../i18n';
import { useNotifications } from '../../components/Notifications';

interface Props { onStateChange: (state: BootstrapState) => void; }

export function InventoryView({ onStateChange }: Props) {
  const { locale, t, runtime } = useI18n();
  const { push } = useNotifications();
  const [inventory, setInventory] = useState<InventoryState | null>(null);
  const [externalKey, setExternalKey] = useState<InventoryContainerKey>('ground');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInventory()
      .then(next => { setInventory(next); setExternalKey(next.selectedExternalKey); })
      .catch(reason => {
        const message = humanizeError(reason, locale);
        setError(message);
        push({ tone: 'error', title: t('common.actionBlocked'), message });
      });
  }, [locale, push, t]);

  const selected = useMemo(
    () => inventory?.containers.flatMap(container => container.items).find(item => item.id === selectedId) ?? null,
    [inventory, selectedId]
  );
  const player = inventory?.containers.find(container => container.key === 'player');
  const external = inventory?.containers.find(container => container.key === externalKey);

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
  const usable = selected?.containerKey === 'player' && ['water', 'sandwich'].includes(selected.itemKey);

  return (
    <section className="space-y-4">
      <div className="screen-heading">
        <div>
          <span className="eyebrow">{t('inventory.eyebrow')}</span>
          <h1>{t('inventory.title')}</h1>
          <p>{t('inventory.description')}</p>
        </div>
        <div className="feature-badge feature-badge-live"><span /> {t('common.backendLive')}</div>
      </div>

      <div className="context-switcher" aria-label={t('inventory.context')}>
        {inventory.containers.filter(container => container.key !== 'player').map(container => (
          <button
            key={container.key}
            className={container.key === externalKey ? 'context-option context-option-active' : 'context-option'}
            disabled={!container.accessible}
            title={runtime(container.accessReason)}
            onClick={() => setExternalKey(container.key)}
          >
            <GameIcon name={containerIcon(container.key)} size={16} />
            <span><b>{runtime(container.label)}</b><small>{container.accessible ? t('inventory.accessible') : runtime(container.accessReason)}</small></span>
            {!container.accessible && <GameIcon name="lock" size={13} />}
          </button>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="inventory-layout">
        <ContainerPane container={player} selectedId={selectedId} busy={busy} onSelect={setSelectedId} onMove={move} />
        <div className="inventory-transfer"><GameIcon name="arrow-left-right" size={20} /><small>{t('inventory.drag')}</small></div>
        <ContainerPane container={external} selectedId={selectedId} busy={busy} onSelect={setSelectedId} onMove={move} />
      </div>

      <div className="item-inspector">
        {selected && source ? (
          <>
            <div className="item-mark item-mark-large">{selected.symbol}</div>
            <div className="min-w-0 flex-1">
              <span className="eyebrow">{t('inventory.selected')}</span>
              <h2>{runtime(selected.displayName)}</h2>
              <p>{runtime(selected.category)} · {formatWeight(selected.unitWeightGrams * selected.quantity)} · {runtime(source.label)}</p>
            </div>
            <div className="item-actions">
              {usable && <button className="primary-button" disabled={busy} onClick={useSelected}>{selected.itemKey === 'water' ? t('inventory.drink') : t('inventory.eat')}</button>}
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
  onSelect: (id: string) => void;
  onMove: (itemId: string, target: InventoryContainerKey, slot?: number) => void;
}

function ContainerPane({ container, selectedId, busy, onSelect, onMove }: ContainerPaneProps) {
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
        {slots.map((item, slotIndex) => (
          <button
            key={slotIndex}
            className={`inventory-slot ${item ? 'inventory-slot-filled' : ''} ${item?.id === selectedId ? 'inventory-slot-selected' : ''}`}
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
            {item && <ItemContents item={item} quickSlot={container.key === 'player' && slotIndex < 4 ? slotIndex + 1 : null} />}
            {!item && <span className="slot-number">{String(slotIndex + 1).padStart(2, '0')}</span>}
          </button>
        ))}
      </div>
    </article>
  );
}

function ItemContents({ item, quickSlot }: { item: InventoryItem; quickSlot: number | null }) {
  const { runtime } = useI18n();
  return <><span className="item-name">{runtime(item.displayName)}</span><span className="item-mark">{item.symbol}</span>{item.quantity > 1 && <b className="item-quantity">×{item.quantity}</b>}{quickSlot && <small className="quick-slot">{quickSlot}</small>}</>;
}

function containerIcon(key: InventoryContainerKey) {
  if (key === 'home') return 'building' as const;
  if (key === 'vehicle_trunk') return 'car' as const;
  return 'map-pin' as const;
}

function formatWeight(grams: number) { return `${(grams / 1000).toFixed(2)} kg`; }
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
