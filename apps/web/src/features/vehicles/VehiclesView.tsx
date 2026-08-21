import { useEffect, useMemo, useState } from 'react';
import type { BootstrapState } from '@sol-dorado/contracts';
import type { PlayerVehicle, VehicleState, VehicleWorldLocation } from '@sol-dorado/contracts/vehicles';
import { GameIcon } from '../../components/GameIcon';
import { useNotifications } from '../../components/Notifications';
import { useI18n } from '../../i18n';
import { getBootstrap, getVehicles, purchaseVehicle, runVehicleAction } from '../../lib/api';
import { VehicleArtwork } from './VehicleArtwork';
import './vehicles.css';
import './vehicles-v03.css';

export type VehicleViewMode = 'my' | 'dealer';
type VehicleAction = 'select' | 'enter' | 'exit' | 'lock' | 'unlock';

type Props = {
  state: BootstrapState;
  mode: VehicleViewMode;
  onModeChange: (mode: VehicleViewMode) => void;
  onStateChange: (state: BootstrapState) => void;
  onWorld: () => void;
  onLocateVehicle: (vehicleId: string) => void;
};

export function VehiclesView({ state, mode, onModeChange, onStateChange, onWorld, onLocateVehicle }: Props) {
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

  return <section className="vehicles-screen vehicles-screen-v03">
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
      ? <OwnedVehicles vehicles={vehicles} copy={copy} busyKey={busyKey} onAction={act} onDealer={() => onModeChange('dealer')} onWorld={onWorld} onLocateVehicle={onLocateVehicle} />
      : <Dealership vehicles={vehicles} cashCents={state.hud.cashCents} copy={copy} busyKey={busyKey} onBuy={buy} onWorld={onWorld} />}
  </section>;
}

function OwnedVehicles({ vehicles, copy, busyKey, onAction, onDealer, onWorld, onLocateVehicle }: {
  vehicles: VehicleState;
  copy: Copy;
  busyKey: string | null;
  onAction: (vehicle: PlayerVehicle, action: VehicleAction) => void;
  onDealer: () => void;
  onWorld: () => void;
  onLocateVehicle: (vehicleId: string) => void;
}) {
  if (!vehicles.ownedVehicles.length) return <div className="vehicles-empty">
    <span><GameIcon name="car" size={32} /></span>
    <div><small>{copy.noVehicleEyebrow}</small><h2>{copy.noVehicle}</h2><p>{copy.noVehicleDetail}</p></div>
    <button onClick={onDealer}><GameIcon name="store" size={16} />{copy.findDealer}</button>
  </div>;

  return <>
    <div className="vehicle-help-strip vehicle-help-strip-v03">
      <GameIcon name="info" size={20} />
      <div><b>{copy.howToUseTitle}</b><span>{copy.howToUse}</span></div>
      <button onClick={onWorld}><GameIcon name="world" size={16} />{copy.openWorld}</button>
    </div>
    <div className="owned-vehicle-list">
      {vehicles.ownedVehicles.map(vehicle => {
        const readyForInteraction = vehicle.withinInteractionRange || vehicle.occupied;
        return <article className={`owned-vehicle ${vehicle.active ? 'owned-vehicle-active' : ''}`} key={vehicle.id}>
          <div className="owned-vehicle-visual">
            <VehicleArtwork model={vehicle.model} />
            <div className="vehicle-visual-badges">
              {vehicle.active && <span>{copy.active}</span>}
              {vehicle.occupied && <span>{copy.inVehicle}</span>}
              <span className={vehicle.locked ? 'danger' : 'safe'}>{vehicle.locked ? copy.locked : copy.unlocked}</span>
            </div>
            <div className="vehicle-photo-caption"><span>{vehicle.model.year}</span><b>{vehicle.model.brand} {vehicle.model.model}</b></div>
          </div>

          <div className="owned-vehicle-content">
            <div className="owned-vehicle-heading">
              <div>
                <span>{vehicle.model.year} · {vehicle.model.vehicleClass}</span>
                <h2>{vehicle.model.brand} {vehicle.model.model}</h2>
              </div>
              <div className={`vehicle-presence ${vehicle.atPlayerLocation ? 'here' : ''} ${vehicle.withinInteractionRange ? 'near' : ''}`}>
                <small>{copy.locationState}</small>
                <b>{vehicle.occupied ? copy.inVehicle : vehicle.withinInteractionRange ? copy.withinReach : vehicle.atPlayerLocation ? copy.sameStreet : copy.parkedElsewhere}</b>
              </div>
            </div>

            <VehicleLocationConsole vehicle={vehicle} playerLocation={vehicles.playerLocation} copy={copy} onLocate={() => onLocateVehicle(vehicle.id)} />

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
              {!vehicle.active && <button disabled={!readyForInteraction || Boolean(busyKey)} onClick={() => onAction(vehicle, 'select')}><GameIcon name="check" size={16} />{copy.select}</button>}
              {vehicle.occupied
                ? <button className="primary" disabled={Boolean(busyKey)} onClick={() => onAction(vehicle, 'exit')}><GameIcon name="door-open" size={16} />{copy.exit}</button>
                : <button className="primary" disabled={!vehicle.withinInteractionRange || vehicle.locked || Boolean(busyKey)} onClick={() => onAction(vehicle, 'enter')}><GameIcon name="car" size={16} />{copy.enter}</button>}
              <button disabled={!vehicle.withinInteractionRange || vehicle.occupied || Boolean(busyKey)} onClick={() => onAction(vehicle, vehicle.locked ? 'unlock' : 'lock')}><GameIcon name="lock" size={16} />{vehicle.locked ? copy.unlock : copy.lock}</button>
              <button className="vehicle-locate-button" onClick={() => onLocateVehicle(vehicle.id)}><GameIcon name="map-pin" size={16} />{copy.showOnMap}</button>
            </div>
            <p className={`vehicle-next-step ${vehicle.withinInteractionRange || vehicle.occupied ? 'good' : ''}`}><b>{copy.nextStep}</b>{nextStep(vehicle, copy)}</p>
          </div>
        </article>;
      })}
    </div>
  </>;
}

function VehicleLocationConsole({ vehicle, playerLocation, copy, onLocate }: { vehicle: PlayerVehicle; playerLocation: VehicleWorldLocation | null; copy: Copy; onLocate: () => void }) {
  return <section className="vehicle-location-console">
    <div className="vehicle-location-block vehicle-location-car">
      <span><GameIcon name="car" size={14} />{copy.carIsHere}</span>
      <b>{vehicle.parkedLocation.district}</b>
      <strong>{vehicle.parkedLocation.street}</strong>
      <small>{vehicle.parkedLocation.segment}</small>
    </div>
    <div className="vehicle-location-arrow" aria-hidden="true"><GameIcon name={vehicle.atPlayerLocation ? 'check' : 'arrow-right'} size={20} /></div>
    <div className="vehicle-location-block">
      <span><GameIcon name="map-pin" size={14} />{copy.youAreHereLabel}</span>
      <b>{playerLocation?.district ?? copy.unknownLocation}</b>
      <strong>{playerLocation?.street ?? '—'}</strong>
      <small>{playerLocation?.segment ?? '—'}</small>
    </div>
    <button type="button" onClick={onLocate}><GameIcon name="world" size={16} /><span>{copy.focusCar}</span><small>{copy.focusCarHint}</small></button>
  </section>;
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
  if (!dealer.accessible) return <div className="dealership-locked dealership-locked-v03">
    <div className="dealership-location-icon"><GameIcon name="map-pin" size={30} /></div>
    <div><small>{copy.physicalDealer}</small><h2>{dealer.name}</h2><p>{dealer.location.district} · {dealer.location.street}</p><strong>{dealer.location.segment}</strong><em>{copy.visitDealerDetail}</em></div>
    <button onClick={onWorld}><GameIcon name="world" size={16} />{copy.backToWorld}</button>
  </div>;

  return <>
    <div className="dealership-access-banner dealership-access-banner-v03">
      <div><span>{copy.youAreHere}</span><b><GameIcon name="map-pin" size={15} /> {dealer.location.district} · {dealer.location.street}</b><small>{dealer.location.segment}</small></div>
      <p>{copy.purchaseRule}</p>
    </div>
    {dealer.stock.length ? <div className="dealership-stock">
      {dealer.stock.map(listing => <article className="dealer-vehicle" key={listing.stockKey}>
        <div className="dealer-vehicle-art">
          <VehicleArtwork model={listing.model} />
          <div className="dealer-photo-overlay"><span>{copy.dealerPhotoLabel}</span><b>{listing.model.brand} {listing.model.model}</b></div>
        </div>
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

function nextStep(vehicle: PlayerVehicle, copy: Copy) {
  if (vehicle.occupied) return copy.nextDrive;
  if (!vehicle.atPlayerLocation) return copy.nextTravel;
  if (!vehicle.withinInteractionRange) return copy.nextApproach;
  if (vehicle.locked) return copy.nextUnlock;
  return copy.nextEnter;
}

function actionMessage(copy: Copy, action: VehicleAction, name: string) {
  const messages = { select: copy.selected, enter: copy.entered, exit: copy.exited, lock: copy.locked, unlock: copy.unlocked };
  return `${name} · ${messages[action]}`;
}

function vehicleError(code: string, copy: Copy) {
  if (code.includes('vehicle_dealership_not_accessible')) return copy.visitDealerDetail;
  if (code.includes('vehicle_not_enough_cash')) return copy.notEnoughCash;
  if (code.includes('vehicle_not_at_player_location')) return copy.vehicleElsewhere;
  if (code.includes('vehicle_too_far')) return copy.vehicleTooFar;
  if (code.includes('vehicle_locked')) return copy.vehicleLocked;
  if (code.includes('vehicle_exit_before_locking')) return copy.exitBeforeLock;
  if (code.includes('vehicle_stock_not_available')) return copy.stockUnavailable;
  return copy.genericError;
}

const en = {
  mobility: 'CITY MOBILITY', myVehicles: 'My Vehicles', vehicles: 'Vehicles', world: 'World', ownedLead: 'Every vehicle has an exact physical location. Locate it, reach the parked car, interact at close range and drive it through the world graph.', dealerLead: 'Dorado Motors is a physical dealership in Las Palmas West. Stock can only be bought while you are actually there.',
  owned: 'Owned', cash: 'Cash', active: 'Active', inVehicle: 'In vehicle', mileage: 'Mileage', fuel: 'Fuel', engine: 'Engine', tires: 'Tires', body: 'Body', reliability: 'Reliability', cargo: 'Cargo', locationState: 'World state', condition: 'Condition',
  select: 'Make active', enter: 'Enter vehicle', exit: 'Exit vehicle', lock: 'Lock', unlock: 'Unlock', locked: 'Locked', unlocked: 'Unlocked', withinReach: 'Within reach', sameStreet: 'Same street · approach it', parkedElsewhere: 'Parked elsewhere',
  noVehicleEyebrow: 'NO OWNED VEHICLE', noVehicle: 'You do not own a vehicle yet', noVehicleDetail: 'Cars are bought from physical dealerships. Dorado Motors is marked on the district map.', findDealer: 'Dorado Motors',
  physicalDealer: 'PHYSICAL WORLD SERVICE', visitDealerDetail: 'Travel to Dorado Motors on Cypress Avenue / Market Corner to browse or buy vehicles.', backToWorld: 'Back to world', youAreHere: 'YOU ARE AT DORADO MOTORS', purchaseRule: 'Purchased cars remain in dealership parking. They never teleport to the player.',
  performance: 'Performance', comfort: 'Comfort', economy: 'Economy', tank: 'Tank', buy: 'Buy vehicle', buying: 'Purchasing…', notEnoughCash: 'Not enough cash', stock: 'DEALERSHIP STOCK', soldOut: 'No vehicles currently available', soldOutDetail: 'The dealership stock is persistent. New inventory can be introduced later without replacing owned cars.', usedStock: 'used vehicle', dealerPhotoLabel: 'DEALERSHIP VEHICLE',
  howToUseTitle: 'Your car has an address, a map marker and a physical parking position', howToUse: 'Use “Focus car on map” to open the exact district and select its marker. Walk to that street, approach the parked car, unlock, enter, then open the map again to drive.', openWorld: 'Open world',
  carIsHere: 'YOUR CAR IS HERE', youAreHereLabel: 'YOU ARE HERE', unknownLocation: 'Unknown location', focusCar: 'Focus car on map', focusCarHint: 'Opens its exact district and marker', showOnMap: 'Show on map', nextStep: 'NEXT: ', nextTravel: 'Open the map and travel to the car marker.', nextApproach: 'You are on the correct street. Approach the parked car in the street scene.', nextUnlock: 'You are beside it. Unlock the car.', nextEnter: 'The car is unlocked and within reach. Enter it.', nextDrive: 'You are inside. Open the map, choose a reachable street and use Drive here.',
  updated: 'Vehicle updated', selected: 'Selected', entered: 'Entered', exited: 'Exited', purchased: 'Vehicle purchased', delivery: 'Parked at Dorado Motors', blocked: 'Action blocked', vehicleElsewhere: 'The vehicle is on another street. Focus it on the map first.', vehicleTooFar: 'You are on the right street, but not close enough to the parked car. Approach it in the world.', vehicleLocked: 'Unlock the vehicle before entering.', exitBeforeLock: 'Exit the vehicle before locking it.', stockUnavailable: 'That vehicle is no longer available.', genericError: 'The vehicle action could not be completed.',
  loading: 'Loading vehicles…', loadFailed: 'Vehicles could not be loaded', retry: 'Retry'
};
type Copy = typeof en;
const bg: Copy = {
  mobility: 'ГРАДСКА МОБИЛНОСТ', myVehicles: 'Моите автомобили', vehicles: 'Автомобили', world: 'Свят', ownedLead: 'Всеки автомобил има точна физическа локация. Намери го, стигни до паркираната кола, взаимодействай отблизо и я карай през реалната мрежа на света.', dealerLead: 'Dorado Motors е физическа автокъща в Las Palmas West. Можеш да купуваш само когато реално си там.',
  owned: 'Притежавани', cash: 'В брой', active: 'Активен', inVehicle: 'В колата', mileage: 'Пробег', fuel: 'Гориво', engine: 'Двигател', tires: 'Гуми', body: 'Купе', reliability: 'Надеждност', cargo: 'Товар', locationState: 'Състояние в света', condition: 'Състояние',
  select: 'Направи активен', enter: 'Влез в колата', exit: 'Излез от колата', lock: 'Заключи', unlock: 'Отключи', locked: 'Заключена', unlocked: 'Отключена', withinReach: 'На една ръка разстояние', sameStreet: 'На същата улица · приближи се', parkedElsewhere: 'Паркирана другаде',
  noVehicleEyebrow: 'НЯМАШ АВТОМОБИЛ', noVehicle: 'Все още нямаш собствен автомобил', noVehicleDetail: 'Автомобилите се купуват от физически автокъщи. Dorado Motors е отбелязана на картата на района.', findDealer: 'Dorado Motors',
  physicalDealer: 'ФИЗИЧЕСКА УСЛУГА В СВЕТА', visitDealerDetail: 'Отиди до Dorado Motors на Cypress Avenue / Market Corner, за да разглеждаш или купуваш автомобили.', backToWorld: 'Обратно към света', youAreHere: 'ТИ СИ В DORADO MOTORS', purchaseRule: 'Купените коли остават на паркинга на автокъщата. Никога не се телепортират при играча.',
  performance: 'Динамика', comfort: 'Комфорт', economy: 'Икономичност', tank: 'Резервоар', buy: 'Купи автомобила', buying: 'Покупка…', notEnoughCash: 'Недостатъчно пари', stock: 'НАЛИЧНОСТИ', soldOut: 'В момента няма налични автомобили', soldOutDetail: 'Наличностите са постоянни. Нови автомобили могат да се добавят по-късно, без да се засягат вече купените.', usedStock: 'употребяван автомобил', dealerPhotoLabel: 'АВТОМОБИЛ В АВТОКЪЩАТА',
  howToUseTitle: 'Колата ти вече има адрес, marker на картата и физическо място за паркиране', howToUse: 'Използвай „Покажи колата на картата“, за да отвориш точния район и нейния marker. Стигни до улицата, приближи се до паркираната кола, отключи, влез и после отвори картата отново, за да караш.', openWorld: 'Отвори света',
  carIsHere: 'КОЛАТА ТИ Е ТУК', youAreHereLabel: 'ТИ СИ ТУК', unknownLocation: 'Неизвестна локация', focusCar: 'Покажи колата на картата', focusCarHint: 'Отваря точния район и marker', showOnMap: 'Покажи на картата', nextStep: 'СЛЕДВА: ', nextTravel: 'Отвори картата и пътувай до marker-а на колата.', nextApproach: 'На правилната улица си. Приближи се до паркираната кола в street scene-а.', nextUnlock: 'Вече си до нея. Отключи автомобила.', nextEnter: 'Колата е отключена и е до теб. Влез в нея.', nextDrive: 'Вътре си. Отвори картата, избери достъпна улица и използвай „Карай дотук“.',
  updated: 'Автомобилът е обновен', selected: 'Избран', entered: 'Влезе в автомобила', exited: 'Излезе от автомобила', purchased: 'Автомобилът е купен', delivery: 'Паркиран в Dorado Motors', blocked: 'Действието е блокирано', vehicleElsewhere: 'Автомобилът е на друга улица. Първо го фокусирай на картата.', vehicleTooFar: 'На правилната улица си, но не си достатъчно близо до колата. Приближи се до нея в света.', vehicleLocked: 'Отключи автомобила, преди да влезеш.', exitBeforeLock: 'Излез от автомобила, преди да го заключиш.', stockUnavailable: 'Този автомобил вече не е наличен.', genericError: 'Действието с автомобила не можа да бъде изпълнено.',
  loading: 'Зареждане на автомобилите…', loadFailed: 'Автомобилите не можаха да се заредят', retry: 'Опитай отново'
};
