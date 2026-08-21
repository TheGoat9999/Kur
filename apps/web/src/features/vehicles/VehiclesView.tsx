import { useEffect, useMemo, useState } from 'react';
import type { BootstrapState } from '@sol-dorado/contracts';
import type { PlayerVehicle, VehicleState } from '@sol-dorado/contracts/vehicles';
import { GameIcon } from '../../components/GameIcon';
import { useNotifications } from '../../components/Notifications';
import { useI18n } from '../../i18n';
import { getBootstrap, getVehicles, purchaseVehicle, runVehicleAction } from '../../lib/api';
import { VehicleArtwork } from './VehicleArtwork';
import './vehicles.css';

export type VehicleViewMode = 'my' | 'dealer';
type VehicleAction = 'select' | 'enter' | 'exit' | 'lock' | 'unlock';

type Props = {
  state: BootstrapState;
  mode: VehicleViewMode;
  onModeChange: (mode: VehicleViewMode) => void;
  onStateChange: (state: BootstrapState) => void;
  onWorld: () => void;
};

export function VehiclesView({ state, mode, onModeChange, onStateChange, onWorld }: Props) {
  const { locale } = useI18n();
  const { push } = useNotifications();
  const [vehicles, setVehicles] = useState<VehicleState | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const copy = locale === 'bg' ? bg : en;

  async function load() {
    setLoadError(false);
    try { setVehicles(await getVehicles()); }
    catch { setLoadError(true); }
  }

  useEffect(() => { void load(); }, []);

  async function act(vehicle: PlayerVehicle, action: VehicleAction) {
    if (busyKey) return;
    setBusyKey(`${vehicle.id}:${action}`);
    try {
      setVehicles(await runVehicleAction(vehicle.id, action));
      push({ tone: 'success', title: copy.updated, message: actionMessage(copy, action, vehicle.model.displayName) });
    } catch (reason) {
      push({ tone: 'error', title: copy.blocked, message: vehicleError(reason instanceof Error ? reason.message : String(reason), copy) });
    } finally { setBusyKey(null); }
  }

  async function buy(stockKey: string, displayName: string) {
    if (busyKey) return;
    setBusyKey(`buy:${stockKey}`);
    try {
      setVehicles(await purchaseVehicle(stockKey));
      onStateChange(await getBootstrap());
      push({ tone: 'success', title: copy.purchased, message: `${displayName} · ${copy.delivery}` });
    } catch (reason) {
      push({ tone: 'error', title: copy.blocked, message: vehicleError(reason instanceof Error ? reason.message : String(reason), copy) });
    } finally { setBusyKey(null); }
  }

  const active = useMemo(() => vehicles?.ownedVehicles.find(vehicle => vehicle.active) ?? null, [vehicles]);

  if (loadError) return <section className="vehicles-screen vehicles-state-screen"><GameIcon name="alert-triangle" size={28} /><h1>{copy.loadFailed}</h1><button onClick={() => void load()}>{copy.retry}</button></section>;
  if (!vehicles) return <section className="vehicles-screen vehicles-state-screen"><span className="vehicles-loader"><GameIcon name="car" size={26} /></span><p>{copy.loading}</p></section>;

  return <section className="vehicles-screen">
    <header className="vehicles-hero">
      <div>
        <span>{copy.mobility}</span>
        <h1>{mode === 'dealer' ? vehicles.dealership.name : copy.myVehicles}</h1>
        <p>{mode === 'dealer' ? copy.dealerLead : copy.ownedLead}</p>
      </div>
      <div className="vehicles-summary">
        <span><small>{copy.owned}</small><b>{vehicles.ownedVehicles.length}</b></span>
        <span><small>{copy.cash}</small><b>{usd(state.hud.cashCents)}</b></span>
        {active && <span><small>{copy.active}</small><b>{active.model.model}</b></span>}
      </div>
    </header>

    <nav className="vehicles-tabs" aria-label={copy.vehicles}>
      <button className={mode === 'my' ? 'active' : ''} onClick={() => onModeChange('my')}><GameIcon name="car" size={17} />{copy.myVehicles}</button>
      <button className={mode === 'dealer' ? 'active' : ''} onClick={() => onModeChange('dealer')}><GameIcon name="store" size={17} />{vehicles.dealership.name}</button>
      <button className="vehicles-world-button" onClick={onWorld}><GameIcon name="world" size={17} />{copy.world}</button>
    </nav>

    {mode === 'my'
      ? <OwnedVehicles vehicles={vehicles} copy={copy} busyKey={busyKey} onAction={act} onDealer={() => onModeChange('dealer')} onWorld={onWorld} />
      : <Dealership vehicles={vehicles} cashCents={state.hud.cashCents} copy={copy} busyKey={busyKey} onBuy={buy} onWorld={onWorld} />}
  </section>;
}

function OwnedVehicles({ vehicles, copy, busyKey, onAction, onDealer, onWorld }: {
  vehicles: VehicleState;
  copy: Copy;
  busyKey: string | null;
  onAction: (vehicle: PlayerVehicle, action: VehicleAction) => void;
  onDealer: () => void;
  onWorld: () => void;
}) {
  if (!vehicles.ownedVehicles.length) return <div className="vehicles-empty">
    <span><GameIcon name="car" size={32} /></span>
    <div><small>{copy.noVehicleEyebrow}</small><h2>{copy.noVehicle}</h2><p>{copy.noVehicleDetail}</p></div>
    <button onClick={onDealer}><GameIcon name="store" size={16} />{copy.findDealer}</button>
  </div>;

  return <>
    <div className="vehicle-help-strip">
      <GameIcon name="info" size={18} />
      <div><b>{copy.howToUseTitle}</b><span>{copy.howToUse}</span></div>
      <button onClick={onWorld}><GameIcon name="world" size={16} />{copy.openWorld}</button>
    </div>
    <div className="owned-vehicle-list">
      {vehicles.ownedVehicles.map(vehicle => <article className={`owned-vehicle ${vehicle.active ? 'owned-vehicle-active' : ''}`} key={vehicle.id}>
        <div className="owned-vehicle-visual">
          <VehicleArtwork model={vehicle.model} />
          <div className="vehicle-visual-badges">
            {vehicle.active && <span>{copy.active}</span>}
            {vehicle.occupied && <span>{copy.inVehicle}</span>}
            <span className={vehicle.locked ? 'danger' : 'safe'}>{vehicle.locked ? copy.locked : copy.unlocked}</span>
          </div>
        </div>

        <div className="owned-vehicle-content">
          <div className="owned-vehicle-heading">
            <div>
              <span>{vehicle.model.year} · {vehicle.model.vehicleClass}</span>
              <h2>{vehicle.model.brand} {vehicle.model.model}</h2>
              <p><GameIcon name="map-pin" size={14} /> {vehicle.parkedDisplayName}</p>
            </div>
            <div className={`vehicle-presence ${vehicle.atPlayerLocation ? 'here' : ''}`}>
              <small>{copy.locationState}</small>
              <b>{vehicle.atPlayerLocation ? copy.besideYou : copy.parkedElsewhere}</b>
            </div>
          </div>

          <div className="vehicle-key-stats">
            <StrongStat label={copy.fuel} value={`${Math.round(vehicle.fuelPercent)}%`} />
            <StrongStat label={copy.condition} value={`${condition(vehicle)}%`} />
            <StrongStat label={copy.mileage} value={`${vehicle.mileageKm.toLocaleString()} km`} />
            <StrongStat label={copy.cargo} value={`${vehicle.model.cargoKg} kg`} />
          </div>

          <div className="vehicle-metrics">
            <Metric label={copy.engine} value={vehicle.engineCondition} suffix="%" />
            <Metric label={copy.tires} value={vehicle.tireCondition} suffix="%" />
            <Metric label={copy.body} value={vehicle.bodyCondition} suffix="%" />
            <Metric label={copy.reliability} value={vehicle.model.reliability} suffix="/100" />
          </div>

          <div className="vehicle-actions">
            {!vehicle.active && <button disabled={!vehicle.atPlayerLocation || Boolean(busyKey)} onClick={() => onAction(vehicle, 'select')}><GameIcon name="check" size={15} />{copy.select}</button>}
            {vehicle.occupied
              ? <button className="primary" disabled={Boolean(busyKey)} onClick={() => onAction(vehicle, 'exit')}><GameIcon name="door-open" size={15} />{copy.exit}</button>
              : <button className="primary" disabled={!vehicle.atPlayerLocation || vehicle.locked || Boolean(busyKey)} onClick={() => onAction(vehicle, 'enter')}><GameIcon name="car" size={15} />{copy.enter}</button>}
            <button disabled={!vehicle.atPlayerLocation || vehicle.occupied || Boolean(busyKey)} onClick={() => onAction(vehicle, vehicle.locked ? 'unlock' : 'lock')}><GameIcon name="lock" size={15} />{vehicle.locked ? copy.unlock : copy.lock}</button>
            <button onClick={onWorld}><GameIcon name="map-pin" size={15} />{copy.findInWorld}</button>
          </div>
          {!vehicle.atPlayerLocation && <p className="vehicle-action-hint">{copy.travelToCarHint}</p>}
          {vehicle.atPlayerLocation && vehicle.locked && <p className="vehicle-action-hint">{copy.unlockHint}</p>}
          {vehicle.occupied && <p className="vehicle-action-hint vehicle-action-hint-good">{copy.driveHint}</p>}
        </div>
      </article>)}
    </div>
  </>;
}

function Dealership({ vehicles, cashCents, copy, busyKey, onBuy, onWorld }: {
  vehicles: VehicleState;
  cashCents: number;
  copy: Copy;
  busyKey: string | null;
  onBuy: (stockKey: string, displayName: string) => void;
  onWorld: () => void;
}) {
  const dealer = vehicles.dealership;
  if (!dealer.accessible) return <div className="dealership-locked">
    <div className="dealership-location-icon"><GameIcon name="map-pin" size={30} /></div>
    <div><small>{copy.physicalDealer}</small><h2>{dealer.name}</h2><p>{dealer.segmentDisplayName}</p><strong>{copy.visitDealerDetail}</strong></div>
    <button onClick={onWorld}><GameIcon name="world" size={16} />{copy.backToWorld}</button>
  </div>;

  return <>
    <div className="dealership-access-banner">
      <div><span>{copy.youAreHere}</span><b><GameIcon name="map-pin" size={15} /> {dealer.segmentDisplayName}</b></div>
      <p>{copy.purchaseRule}</p>
    </div>
    {dealer.stock.length ? <div className="dealership-stock">
      {dealer.stock.map(listing => <article className="dealer-vehicle" key={listing.stockKey}>
        <div className="dealer-vehicle-art"><VehicleArtwork model={listing.model} /></div>
        <div className="dealer-vehicle-content">
          <div className="dealer-vehicle-heading">
            <div><span>{listing.model.year} · {listing.model.vehicleClass}</span><h2>{listing.model.brand} {listing.model.model}</h2><p>{listing.mileageKm.toLocaleString()} km · {copy.usedStock}</p></div>
            <strong>{usd(listing.priceCents)}</strong>
          </div>
          <div className="dealer-key-stats">
            <StrongStat label={copy.condition} value={`${Math.round((listing.engineCondition + listing.bodyCondition + listing.tireCondition) / 3)}%`} />
            <StrongStat label={copy.cargo} value={`${listing.model.cargoKg} kg`} />
            <StrongStat label={copy.tank} value={`${listing.model.tankLiters} L`} />
          </div>
          <div className="dealer-specs">
            <Spec label={copy.reliability} value={listing.model.reliability} />
            <Spec label={copy.performance} value={listing.model.performance} />
            <Spec label={copy.comfort} value={listing.model.comfort} />
            <Spec label={copy.economy} value={listing.model.economy} />
          </div>
          <button className="dealer-buy" disabled={Boolean(busyKey) || cashCents < listing.priceCents} onClick={() => onBuy(listing.stockKey, listing.model.displayName)}>
            {cashCents < listing.priceCents ? copy.notEnoughCash : busyKey === `buy:${listing.stockKey}` ? copy.buying : copy.buy}
            <GameIcon name="arrow-right" size={16} />
          </button>
        </div>
      </article>)}
    </div> : <div className="vehicles-empty"><span><GameIcon name="store" size={32} /></span><div><small>{copy.stock}</small><h2>{copy.soldOut}</h2><p>{copy.soldOutDetail}</p></div></div>}
  </>;
}

function StrongStat({ label, value }: { label: string; value: string }) {
  return <div className="vehicle-strong-stat"><small>{label}</small><b>{value}</b></div>;
}

function Metric({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return <div className="vehicle-metric"><span><small>{label}</small><b>{Math.round(value)}{suffix}</b></span><i><em style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></i></div>;
}

function Spec({ label, value }: { label: string; value: number }) {
  return <div><span>{label}</span><i><em style={{ width: `${value}%` }} /></i><b>{value}</b></div>;
}

function condition(vehicle: PlayerVehicle) { return Math.round((vehicle.engineCondition + vehicle.bodyCondition + vehicle.tireCondition) / 3); }
function usd(cents: number) { return `$${Math.round(cents / 100).toLocaleString('en-US')}`; }

function actionMessage(copy: Copy, action: VehicleAction, name: string) {
  const messages = { select: copy.selected, enter: copy.entered, exit: copy.exited, lock: copy.locked, unlock: copy.unlocked };
  return `${name} · ${messages[action]}`;
}

function vehicleError(code: string, copy: Copy) {
  if (code.includes('vehicle_dealership_not_accessible')) return copy.visitDealerDetail;
  if (code.includes('vehicle_not_enough_cash')) return copy.notEnoughCash;
  if (code.includes('vehicle_not_at_player_location')) return copy.vehicleElsewhere;
  if (code.includes('vehicle_locked')) return copy.vehicleLocked;
  if (code.includes('vehicle_exit_before_locking')) return copy.exitBeforeLock;
  if (code.includes('vehicle_stock_not_available')) return copy.stockUnavailable;
  return copy.genericError;
}

const en = {
  mobility: 'CITY MOBILITY', myVehicles: 'My Vehicles', vehicles: 'Vehicles', world: 'World', ownedLead: 'Your cars are physical world assets. See where they are, walk to them, unlock them, enter and drive.', dealerLead: 'Dorado Motors is a physical dealership in Las Palmas West. You must actually be there to browse stock.',
  owned: 'Owned', cash: 'Cash', active: 'Active', inVehicle: 'In vehicle', mileage: 'Mileage', fuel: 'Fuel', engine: 'Engine', tires: 'Tires', body: 'Body', reliability: 'Reliability', cargo: 'Cargo', locationState: 'World state', condition: 'Condition',
  select: 'Make active', enter: 'Enter vehicle', exit: 'Exit vehicle', lock: 'Lock', unlock: 'Unlock', locked: 'Locked', unlocked: 'Unlocked', besideYou: 'Here with you', parkedElsewhere: 'Parked elsewhere',
  noVehicleEyebrow: 'NO OWNED VEHICLE', noVehicle: 'You do not own a vehicle yet', noVehicleDetail: 'Cars are bought from physical dealerships. Dorado Motors is marked on the district map.', findDealer: 'Dorado Motors',
  physicalDealer: 'PHYSICAL WORLD SERVICE', visitDealerDetail: 'Travel to Dorado Motors on Cypress Avenue / Market Corner to browse or buy vehicles.', backToWorld: 'Back to world', youAreHere: 'YOU ARE AT DORADO MOTORS', purchaseRule: 'Purchased cars stay in the dealership parking area. They do not teleport with you.',
  performance: 'Performance', comfort: 'Comfort', economy: 'Economy', tank: 'Tank', buy: 'Buy vehicle', buying: 'Purchasing…', notEnoughCash: 'Not enough cash', stock: 'DEALERSHIP STOCK', soldOut: 'No vehicles currently available', soldOutDetail: 'The dealership stock is persistent. New inventory can be introduced later without replacing owned cars.', usedStock: 'used vehicle',
  howToUseTitle: 'Vehicles now exist in the world', howToUse: 'Open the world map to see your car marker. Reach the same street to unlock/enter it. Once inside, use the map to drive to another reachable street.', openWorld: 'Open world', findInWorld: 'Find in world', travelToCarHint: 'This car is on another street. Open the world map and travel to its location first.', unlockHint: 'The car is here, but locked. Unlock it before entering.', driveHint: 'You are inside this car. Open the world map to drive to another car-accessible street.',
  updated: 'Vehicle updated', selected: 'Selected', entered: 'Entered', exited: 'Exited', purchased: 'Vehicle purchased', delivery: 'Parked at Dorado Motors', blocked: 'Action blocked', vehicleElsewhere: 'You need to travel back to the vehicle first.', vehicleLocked: 'Unlock the vehicle before entering.', exitBeforeLock: 'Exit the vehicle before locking it.', stockUnavailable: 'That vehicle is no longer available.', genericError: 'The vehicle action could not be completed.',
  loading: 'Loading vehicles…', loadFailed: 'Vehicles could not be loaded', retry: 'Retry'
};
type Copy = typeof en;
const bg: Copy = {
  mobility: 'ГРАДСКА МОБИЛНОСТ', myVehicles: 'Моите автомобили', vehicles: 'Автомобили', world: 'Свят', ownedLead: 'Колите ти са физически активи в света. Виж къде са, стигни до тях, отключи, влез и карай.', dealerLead: 'Dorado Motors е физическа автокъща в Las Palmas West. Трябва реално да си там, за да разглеждаш наличностите.',
  owned: 'Притежавани', cash: 'В брой', active: 'Активен', inVehicle: 'В колата', mileage: 'Пробег', fuel: 'Гориво', engine: 'Двигател', tires: 'Гуми', body: 'Купе', reliability: 'Надеждност', cargo: 'Товар', locationState: 'Състояние в света', condition: 'Състояние',
  select: 'Направи активен', enter: 'Влез в колата', exit: 'Излез от колата', lock: 'Заключи', unlock: 'Отключи', locked: 'Заключена', unlocked: 'Отключена', besideYou: 'Тук е при теб', parkedElsewhere: 'Паркирана другаде',
  noVehicleEyebrow: 'НЯМАШ АВТОМОБИЛ', noVehicle: 'Все още нямаш собствен автомобил', noVehicleDetail: 'Автомобилите се купуват от физически автокъщи. Dorado Motors е отбелязана на картата на района.', findDealer: 'Dorado Motors',
  physicalDealer: 'ФИЗИЧЕСКА УСЛУГА В СВЕТА', visitDealerDetail: 'Отиди до Dorado Motors на Cypress Avenue / Market Corner, за да разглеждаш или купуваш автомобили.', backToWorld: 'Обратно към света', youAreHere: 'ТИ СИ В DORADO MOTORS', purchaseRule: 'Купените коли остават на паркинга на автокъщата. Не се телепортират с теб.',
  performance: 'Динамика', comfort: 'Комфорт', economy: 'Икономичност', tank: 'Резервоар', buy: 'Купи автомобила', buying: 'Покупка…', notEnoughCash: 'Недостатъчно пари', stock: 'НАЛИЧНОСТИ', soldOut: 'В момента няма налични автомобили', soldOutDetail: 'Наличностите са постоянни. Нови автомобили могат да се добавят по-късно, без да се засягат вече купените.', usedStock: 'употребяван автомобил',
  howToUseTitle: 'Автомобилите вече са част от света', howToUse: 'Отвори картата, за да видиш маркера на колата си. Стигни до същата улица, отключи и влез. Когато си вътре, използвай картата, за да караш.', openWorld: 'Отвори света', findInWorld: 'Намери в света', travelToCarHint: 'Колата е на друга улица. Отвори картата и първо стигни до нея.', unlockHint: 'Колата е тук, но е заключена. Отключи я, преди да влезеш.', driveHint: 'В момента си в тази кола. Отвори картата и избери достъпна улица, до която да караш.',
  updated: 'Автомобилът е обновен', selected: 'Избран', entered: 'Влезе в автомобила', exited: 'Излезе от автомобила', purchased: 'Автомобилът е купен', delivery: 'Паркиран в Dorado Motors', blocked: 'Действието е блокирано', vehicleElsewhere: 'Първо трябва да се върнеш при автомобила.', vehicleLocked: 'Отключи автомобила, преди да влезеш.', exitBeforeLock: 'Излез от автомобила, преди да го заключиш.', stockUnavailable: 'Този автомобил вече не е наличен.', genericError: 'Действието с автомобила не можа да бъде изпълнено.',
  loading: 'Зареждане на автомобилите…', loadFailed: 'Автомобилите не можаха да се заредят', retry: 'Опитай отново'
};
