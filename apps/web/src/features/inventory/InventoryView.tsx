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

interface Props { onStateChange: (state: BootstrapState) => void; }

export function InventoryView({ onStateChange }: Props) {
  const [inventory, setInventory] = useState<InventoryState | null>(null);
  const [externalKey, setExternalKey] = useState<InventoryContainerKey>('ground');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInventory()
      .then(next => { setInventory(next); setExternalKey(next.selectedExternalKey); })
      .catch(reason => setError(reason instanceof Error ? reason.message : String(reason)));
  }, []);

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
    } catch (reason) {
      setError(humanizeError(reason));
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
    } catch (reason) {
      setError(humanizeError(reason));
    } finally { setBusy(false); }
  }

  if (!inventory || !player || !external) {
    return <section className="glass-panel grid min-h-[420px] place-items-center p-8"><div className="text-center"><GameIcon name="package" size={26} /><p className="mt-3 text-sm text-slate-400">{error ?? 'Loading physical inventory…'}</p></div></section>;
  }

  const source = selected ? inventory.containers.find(container => container.key === selected.containerKey) : null;
  const moveTarget = selected?.containerKey === 'player' ? external : player;
  const usable = selected?.containerKey === 'player' && ['water', 'sandwich'].includes(selected.itemKey);

  return (
    <section className="space-y-4">
      <div className="screen-heading">
        <div>
          <span className="eyebrow">Physical possessions</span>
          <h1>Inventory</h1>
          <p>Every item occupies a real container and slot. Access follows the player, property and vehicle state.</p>
        </div>
        <div className="feature-badge feature-badge-live"><span /> Backend live</div>
      </div>

      <div className="context-switcher" aria-label="External inventory context">
        {inventory.containers.filter(container => container.key !== 'player').map(container => (
          <button
            key={container.key}
            className={container.key === externalKey ? 'context-option context-option-active' : 'context-option'}
            disabled={!container.accessible}
            title={container.accessReason}
            onClick={() => setExternalKey(container.key)}
          >
            <GameIcon name={containerIcon(container.key)} size={16} />
            <span><b>{container.label}</b><small>{container.accessible ? 'Accessible now' : container.accessReason}</small></span>
            {!container.accessible && <GameIcon name="lock" size={13} />}
          </button>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="inventory-layout">
        <ContainerPane container={player} selectedId={selectedId} busy={busy} onSelect={setSelectedId} onMove={move} />
        <div className="inventory-transfer"><GameIcon name="arrow-left-right" size={20} /><small>DRAG</small></div>
        <ContainerPane container={external} selectedId={selectedId} busy={busy} onSelect={setSelectedId} onMove={move} />
      </div>

      <div className="item-inspector">
        {selected && source ? (
          <>
            <div className="item-mark item-mark-large">{selected.symbol}</div>
            <div className="min-w-0 flex-1">
              <span className="eyebrow">Selected item</span>
              <h2>{selected.displayName}</h2>
              <p>{selected.category} · {formatWeight(selected.unitWeightGrams * selected.quantity)} · {source.label}</p>
            </div>
            <div className="item-actions">
              {usable && <button className="primary-button" disabled={busy} onClick={useSelected}>{selected.itemKey === 'water' ? 'Drink' : 'Eat'}</button>}
              {moveTarget?.accessible && <button className="secondary-button" disabled={busy} onClick={() => move(selected.id, moveTarget.key)}>Move to {moveTarget.label}</button>}
              <button className="secondary-button" onClick={() => setSelectedId(null)}>Clear</button>
            </div>
          </>
        ) : <div className="flex items-center gap-3 text-sm text-slate-500"><GameIcon name="mouse-pointer" size={17} /> Select an item to inspect or move it.</div>}
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
        <div><span className="eyebrow">{container.key === 'player' ? 'Player' : 'External'}</span><h2>{container.label}</h2></div>
        <div className="inventory-weight"><b>{formatWeight(container.weightGrams)}</b><small>of {formatWeight(container.capacityGrams)}</small></div>
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
  return <><span className="item-name">{item.displayName}</span><span className="item-mark">{item.symbol}</span>{item.quantity > 1 && <b className="item-quantity">×{item.quantity}</b>}{quickSlot && <small className="quick-slot">{quickSlot}</small>}</>;
}

function containerIcon(key: InventoryContainerKey) {
  if (key === 'home') return 'building' as const;
  if (key === 'vehicle_trunk') return 'car' as const;
  return 'map-pin' as const;
}

function formatWeight(grams: number) { return `${(grams / 1000).toFixed(2)} kg`; }
function humanizeError(reason: unknown) {
  const value = reason instanceof Error ? reason.message : String(reason);
  return value.replaceAll('_', ' ').replace(/^inventory /, '').replace(/^./, letter => letter.toUpperCase());
}
