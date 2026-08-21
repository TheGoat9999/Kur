import { useEffect, useMemo, useState } from 'react';
import type { InventoryItem, InventoryState } from '@sol-dorado/contracts';
import type { ItemDefinition } from '@sol-dorado/contracts/items';
import type { CraftingState, WeaponAction } from '@sol-dorado/contracts/weapons-crafting';
import { GameIcon } from '../../components/GameIcon';
import { useI18n } from '../../i18n';
import { useNotifications } from '../../components/Notifications';
import { craftRecipe, getCraftingState, runWeaponInventoryAction } from './weapons-crafting-api';
import './inventory-weapons-crafting.css';

export function InventoryCraftingPanel({
  catalogByKey,
  onInventory,
  onError
}: {
  catalogByKey: Map<string, ItemDefinition>;
  onInventory: (inventory: InventoryState) => void;
  onError: (reason: unknown) => void;
}) {
  const { locale, runtime } = useI18n();
  const { push } = useNotifications();
  const [state, setState] = useState<CraftingState | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'all' | 'ready' | 'weapon' | 'ammunition'>('all');

  useEffect(() => {
    let active = true;
    getCraftingState()
      .then(next => {
        if (!active) return;
        setState(next);
        setSelectedKey(current => current ?? next.recipes.find(recipe => recipe.canCraft)?.key ?? next.recipes[0]?.key ?? null);
      })
      .catch(onError);
    return () => { active = false; };
  }, []);

  const recipes = useMemo(() => state?.recipes.filter(recipe => {
    if (filter === 'ready') return recipe.canCraft;
    if (filter === 'weapon') return recipe.category === 'weapon' || recipe.category === 'weapon_part' || recipe.category === 'maintenance';
    if (filter === 'ammunition') return recipe.category === 'ammunition';
    return true;
  }) ?? [], [state, filter]);
  const selected = state?.recipes.find(recipe => recipe.key === selectedKey) ?? recipes[0] ?? null;

  async function craft() {
    if (!selected?.canCraft || busy) return;
    setBusy(true);
    try {
      const result = await craftRecipe(selected.key);
      onInventory(result.inventory);
      setState(result.crafting);
      push({ tone: 'success', title: locale === 'bg' ? 'Изработено' : 'Crafted', message: runtime(result.notice.message) });
    } catch (reason) {
      onError(reason);
    } finally {
      setBusy(false);
    }
  }

  if (!state) return <section className="sd-crafting sd-crafting-loading"><GameIcon name="sparkles" size={24} /><b>{locale === 'bg' ? 'Зареждане на работилницата…' : 'Loading workshop…'}</b></section>;

  return (
    <section className="sd-crafting">
      <header className="sd-crafting-head">
        <div><span className="eyebrow">SOL DORADO CRAFTING</span><h2>{locale === 'bg' ? 'Изработка' : 'Crafting'}</h2></div>
        <span>{state.recipes.filter(recipe => recipe.canCraft).length} {locale === 'bg' ? 'готови' : 'ready'}</span>
      </header>
      <p className="sd-crafting-intro">{locale === 'bg' ? 'Рецептите използват предмети, които реално носиш. Материалите се проверяват и консумират от сървъра.' : 'Recipes use items you actually carry. Materials are validated and consumed by the server.'}</p>
      <div className="sd-crafting-filters">
        {(['all', 'ready', 'weapon', 'ammunition'] as const).map(key => <button key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{filterLabel(key, locale)}</button>)}
      </div>
      <div className="sd-crafting-layout">
        <div className="sd-crafting-list">
          {recipes.map(recipe => {
            const output = catalogByKey.get(recipe.outputItemKey);
            return <button key={recipe.key} className={`${selected?.key === recipe.key ? 'active ' : ''}${recipe.canCraft ? 'ready' : 'blocked'}`} onClick={() => setSelectedKey(recipe.key)}>
              <span className="sd-crafting-icon"><GameIcon name={recipe.category === 'ammunition' ? 'package' : recipe.category === 'weapon' ? 'shield' : 'sparkles'} size={18} /></span>
              <span><b>{runtime(output?.displayName ?? recipe.displayName)}</b><small>{recipe.outputQuantity > 1 ? `×${recipe.outputQuantity} · ` : ''}{recipe.durationSeconds}s</small></span>
              <em>{recipe.canCraft ? (locale === 'bg' ? 'ГОТОВО' : 'READY') : `${recipe.missing.length} ${locale === 'bg' ? 'липси' : 'missing'}`}</em>
            </button>;
          })}
          {!recipes.length && <div className="sd-crafting-empty">{locale === 'bg' ? 'Няма рецепти в този филтър.' : 'No recipes in this filter.'}</div>}
        </div>
        {selected && <div className="sd-crafting-detail">
          <div className="sd-crafting-output"><span className="eyebrow">{locale === 'bg' ? 'РЕЗУЛТАТ' : 'OUTPUT'}</span><b>{runtime(catalogByKey.get(selected.outputItemKey)?.displayName ?? selected.displayName)} {selected.outputQuantity > 1 ? `×${selected.outputQuantity}` : ''}</b><small>{riskLabel(selected.riskClass, locale)} · {selected.durationSeconds}s</small></div>
          <div className="sd-crafting-ingredients">
            {selected.ingredients.map(ingredient => {
              const owned = selected.owned[ingredient.itemKey] ?? 0;
              const enough = owned >= ingredient.quantity;
              return <div key={ingredient.itemKey} className={enough ? 'enough' : 'missing'}><span>{runtime(catalogByKey.get(ingredient.itemKey)?.displayName ?? titleCase(ingredient.itemKey))}</span><b>{owned} / {ingredient.quantity}</b></div>;
            })}
          </div>
          <button className="sd-crafting-action" disabled={!selected.canCraft || busy} onClick={() => void craft()}><GameIcon name="sparkles" size={17} />{busy ? (locale === 'bg' ? 'Изработване…' : 'Crafting…') : selected.canCraft ? (locale === 'bg' ? 'Изработи' : 'Craft') : (locale === 'bg' ? 'Липсват материали' : 'Missing materials')}</button>
          <small className="sd-crafting-note">{locale === 'bg' ? 'Crafting-ът е абстрактна gameplay система и не представя реални инструкции за производство.' : 'Crafting is an abstract gameplay system and does not represent real-world manufacturing instructions.'}</small>
        </div>}
      </div>
    </section>
  );
}

export function InventoryWeaponActions({ item, onInventory, onError }: {
  item: InventoryItem | null;
  onInventory: (inventory: InventoryState) => void;
  onError: (reason: unknown) => void;
}) {
  const { locale, runtime } = useI18n();
  const { push } = useNotifications();
  const [busy, setBusy] = useState(false);
  if (!item || item.category !== 'weapon' || item.containerKey !== 'player') return null;

  const equipped = item.metadata.equipped === true;
  const loadedRounds = typeof item.metadata.loadedRounds === 'number' ? Math.max(0, Math.floor(item.metadata.loadedRounds)) : 0;
  const condition = typeof item.metadata.condition === 'number' ? Math.max(0, Math.min(100, Math.round(item.metadata.condition))) : 100;
  const hasMagazineState = typeof item.metadata.loadedRounds === 'number';

  async function act(action: WeaponAction) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await runWeaponInventoryAction(item.id, action);
      onInventory(result.inventory);
      push({ tone: 'success', title: runtime(result.notice.title), message: runtime(result.notice.message) });
    } catch (reason) {
      onError(reason);
    } finally {
      setBusy(false);
    }
  }

  return <section className="sd-weapon-actions">
    <div className="sd-weapon-head"><span><GameIcon name="shield" size={17} /><b>{locale === 'bg' ? 'Състояние на оръжието' : 'Weapon state'}</b></span><em className={equipped ? 'equipped' : ''}>{equipped ? (locale === 'bg' ? 'ЕКИПИРАНО' : 'EQUIPPED') : (locale === 'bg' ? 'ПРИБРАНО' : 'STOWED')}</em></div>
    <div className="sd-weapon-stats"><span><small>{locale === 'bg' ? 'Състояние' : 'Condition'}</small><b>{condition}%</b></span>{hasMagazineState && <span><small>{locale === 'bg' ? 'Заредени' : 'Loaded'}</small><b>{loadedRounds}</b></span>}</div>
    <div className="sd-weapon-buttons"><button disabled={busy} onClick={() => void act(equipped ? 'unequip' : 'equip')}>{equipped ? (locale === 'bg' ? 'Прибери' : 'Unequip') : (locale === 'bg' ? 'Екипирай' : 'Equip')}</button><button disabled={busy || !hasMagazineState} onClick={() => void act('reload')}>{locale === 'bg' ? 'Презареди' : 'Reload'}</button></div>
    <small>{locale === 'bg' ? 'Стрелба и попадения се извършват само през world/combat interaction, не от инвентара.' : 'Firing and hits happen only through world/combat interaction, never from the inventory.'}</small>
  </section>;
}

function filterLabel(key: 'all' | 'ready' | 'weapon' | 'ammunition', locale: 'bg' | 'en') {
  const bg = { all: 'Всички', ready: 'Готови', weapon: 'Оръжия', ammunition: 'Боеприпаси' };
  const en = { all: 'All', ready: 'Ready', weapon: 'Weapons', ammunition: 'Ammo' };
  return (locale === 'bg' ? bg : en)[key];
}

function riskLabel(value: 'standard' | 'controlled' | 'restricted', locale: 'bg' | 'en') {
  const bg = { standard: 'Стандартно', controlled: 'Контролирано', restricted: 'Ограничено' };
  const en = { standard: 'Standard', controlled: 'Controlled', restricted: 'Restricted' };
  return (locale === 'bg' ? bg : en)[value];
}

function titleCase(value: string) {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}
