import { useCallback, useEffect, useState } from 'react';
import type { BootstrapState, StreetObjectId, StreetState, WorldActionId, WorldNoticeId } from '@sol-dorado/contracts';
import type { PlayerVehicle, VehicleState } from '@sol-dorado/contracts/vehicles';
import type { WorldMapState } from '@sol-dorado/contracts/world-map';
import { getResponsiveStreetRoute } from '@sol-dorado/contracts/street-routing';
import { getStreetSpawnPosition, streetDistance, type StreetPosition } from '@sol-dorado/contracts/world-position';
import { GameIcon } from '../../components/GameIcon';
import { useNotifications, type NotificationTone } from '../../components/Notifications';
import { useI18n, type TranslationKey } from '../../i18n';
import { ApiCommandError, driveVehicle, getBootstrap, getStreetPosition, getStreetState, getVehicles, getWorldMap, moveStreetPlayer, runVehicleAction, runWorldAction, travelWorldMap } from '../../lib/api';
import { StreetScene } from './StreetScene';
import { WorldMapIcon } from './WorldMapIcon';
import { WorldMapView } from './WorldMapView';
import { worldMapCopy } from './world-map-copy';

interface Props {
  state: BootstrapState;
  onStateChange: (state: BootstrapState) => void;
  focusVehicleId?: string | null;
  onVehicleFocusHandled?: () => void;
}
type VehicleAction = 'select' | 'enter' | 'exit' | 'lock' | 'unlock';

const notices: Record<WorldNoticeId, { title: TranslationKey; message: TranslationKey; tone: NotificationTone }> = {
  travel_market: notice('world.notice.travelMarket.title', 'world.notice.travelMarket.message', 'info'),
  travel_cypress: notice('world.notice.travelCypress.title', 'world.notice.travelCypress.message', 'info'),
  travel_alley: notice('world.notice.travelAlley.title', 'world.notice.travelAlley.message', 'info'),
  corner_inspected: notice('world.notice.cornerInspected.title', 'world.notice.cornerInspected.message', 'info'),
  corner_entered: notice('world.notice.cornerEntered.title', 'world.notice.cornerEntered.message', 'info'),
  shoplift_witnessed: notice('world.notice.shopliftWitnessed.title', 'world.notice.shopliftWitnessed.message', 'warning'),
  shoplift_clean: notice('world.notice.shopliftClean.title', 'world.notice.shopliftClean.message', 'reward'),
  clerk_spoken: notice('world.notice.clerkSpoken.title', 'world.notice.clerkSpoken.message', 'info'),
  delivery_complete: notice('world.notice.delivery.title', 'world.notice.delivery.message', 'success'),
  restaurant_inspected: notice('world.notice.restaurantInspected.title', 'world.notice.restaurantInspected.message', 'info'),
  restaurant_entered: notice('world.notice.restaurantEntered.title', 'world.notice.restaurantEntered.message', 'info'),
  apartment_inspected: notice('world.notice.apartmentInspected.title', 'world.notice.apartmentInspected.message', 'info'),
  alley_inspected: notice('world.notice.alleyInspected.title', 'world.notice.alleyInspected.message', 'info'),
  dumpster_salvage: notice('world.notice.dumpster.title', 'world.notice.dumpster.message', 'reward'),
  maya_greeting: notice('world.notice.mayaGreeting.title', 'world.notice.mayaGreeting.message', 'info'),
  maya_tip: notice('world.notice.mayaTip.title', 'world.notice.mayaTip.message', 'info')
};

export function WorldView({ state, onStateChange, focusVehicleId = null, onVehicleFocusHandled }: Props) {
  const { locale, t } = useI18n();
  const { push } = useNotifications();
  const [street, setStreet] = useState<StreetState | null>(null);
  const [position, setPosition] = useState<StreetPosition | null>(null);
  const [vehicles, setVehicles] = useState<VehicleState | null>(null);
  const [activeRoute, setActiveRoute] = useState<StreetPosition[] | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<StreetObjectId | null>(null);
  const [busy, setBusy] = useState<WorldActionId | null>(null);
  const [vehicleBusy, setVehicleBusy] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [worldMap, setWorldMap] = useState<WorldMapState | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapBusy, setMapBusy] = useState(false);
  const [mapTravelBusy, setMapTravelBusy] = useState(false);
  const [mapVehicleFocusId, setMapVehicleFocusId] = useState<string | null>(null);
  const mapCopy = worldMapCopy(locale);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const [nextStreet, spatial, nextVehicles] = await Promise.all([getStreetState(), getStreetPosition(), getVehicles()]);
      setStreet(nextStreet);
      setPosition(spatial.position);
      setVehicles(nextVehicles);
    } catch { setLoadError(true); }
  }, []);

  const refreshAuthoritative = useCallback(async () => {
    setLoadError(false);
    try {
      const [nextStreet, nextState, spatial, nextVehicles] = await Promise.all([getStreetState(), getBootstrap(), getStreetPosition(), getVehicles()]);
      setStreet(nextStreet); setPosition(spatial.position); setVehicles(nextVehicles); onStateChange(nextState);
    } catch { setLoadError(true); }
  }, [onStateChange]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!focusVehicleId) return;
    let cancelled = false;
    setMapBusy(true);
    void Promise.all([getWorldMap(), getVehicles()])
      .then(([nextMap, nextVehicles]) => {
        if (cancelled) return;
        const target = nextVehicles.ownedVehicles.find(vehicle => vehicle.id === focusVehicleId);
        if (!target) throw new Error('vehicle_not_found');
        setWorldMap(nextMap);
        setVehicles(nextVehicles);
        setMapVehicleFocusId(focusVehicleId);
        setMapOpen(true);
        push({
          tone: 'info',
          title: locale === 'bg' ? 'Колата е фокусирана на картата' : 'Vehicle focused on map',
          message: `${target.parkedLocation.district} · ${target.parkedLocation.segment}`
        });
      })
      .catch(() => {
        if (!cancelled) push({ tone: 'error', title: t('common.actionBlocked'), message: mapCopy.mapLoadError });
      })
      .finally(() => {
        if (!cancelled) {
          setMapBusy(false);
          onVehicleFocusHandled?.();
        }
      });
    return () => { cancelled = true; };
  }, [focusVehicleId]);

  useEffect(() => {
    if (!street) return;
    const now = Date.now();
    const nextCooldown = street.actionStates.map(action => action.cooldownEndsAt ? new Date(action.cooldownEndsAt).getTime() : null).filter((value): value is number => value !== null && value > now).sort((a, b) => a - b)[0];
    if (!nextCooldown) return;
    const timer = window.setTimeout(() => void load(), Math.max(250, nextCooldown - now + 150));
    return () => window.clearTimeout(timer);
  }, [street, load]);

  async function openMap() {
    if (mapBusy) return;
    setMapVehicleFocusId(null);
    if (worldMap) { setMapOpen(true); return; }
    setMapBusy(true);
    try {
      const [nextMap, nextVehicles] = await Promise.all([getWorldMap(), getVehicles()]);
      setWorldMap(nextMap);
      setVehicles(nextVehicles);
      setMapOpen(true);
    } catch {
      push({ tone: 'error', title: t('common.actionBlocked'), message: mapCopy.mapLoadError });
    } finally { setMapBusy(false); }
  }

  async function travelFromMap(segmentId: string) {
    if (mapTravelBusy) return;
    setMapTravelBusy(true);
    try {
      await travelWorldMap(segmentId);
      const [nextStreet, nextState, spatial, nextMap, nextVehicles] = await Promise.all([getStreetState(), getBootstrap(), getStreetPosition(), getWorldMap(), getVehicles()]);
      setStreet(nextStreet);
      setPosition(spatial.position);
      setWorldMap(nextMap);
      setVehicles(nextVehicles);
      setSelectedObjectId(null);
      setActiveRoute(null);
      setMapVehicleFocusId(null);
      onStateChange(nextState);
      setMapOpen(false);
      push({ tone: 'success', title: mapCopy.travelHere, message: mapCopy.travelSuccess });
    } catch (reason) {
      const code = reason instanceof ApiCommandError ? reason.code : 'world_map_travel_failed';
      const message = code === 'world_map_not_enough_energy' ? mapCopy.notEnoughEnergy : mapCopy.travelFailed;
      push({ tone: 'error', title: t('common.actionBlocked'), message });
    } finally { setMapTravelBusy(false); }
  }

  async function driveFromMap(vehicleId: string, segmentId: string) {
    if (mapTravelBusy) return;
    setMapTravelBusy(true);
    try {
      const result = await driveVehicle(vehicleId, segmentId);
      const [nextStreet, nextState, spatial, nextMap] = await Promise.all([getStreetState(), getBootstrap(), getStreetPosition(), getWorldMap()]);
      setStreet(nextStreet);
      setPosition(spatial.position);
      setWorldMap(nextMap);
      setVehicles(result.state);
      setSelectedObjectId(null);
      setActiveRoute(null);
      setMapVehicleFocusId(null);
      onStateChange(nextState);
      setMapOpen(false);
      push({ tone: 'success', title: locale === 'bg' ? 'Пристигна с автомобила' : 'Arrived by car', message: locale === 'bg' ? `${Math.round(result.distanceMeters)} м · -${result.fuelCostPercent.toFixed(1)}% гориво` : `${Math.round(result.distanceMeters)} m · -${result.fuelCostPercent.toFixed(1)}% fuel` });
    } catch (reason) {
      push({ tone: 'error', title: t('common.actionBlocked'), message: vehicleError(reason instanceof Error ? reason.message : String(reason), locale) });
    } finally { setMapTravelBusy(false); }
  }

  async function move(target: StreetPosition) {
    if (moving || !street || !position) return;
    const previous = position;
    const planned = getResponsiveStreetRoute(street.currentSegmentId, position, target);
    if (!planned) {
      push({ tone: 'error', title: t('common.actionBlocked'), message: worldError('world_position_blocked', t) });
      return;
    }

    setMoving(true);
    setActiveRoute(planned.route);
    try {
      // Dynamic NPCs and vehicles are soft occupancy until the router supports
      // dynamic obstacle avoidance. The authored navigation graph is the hard
      // walking boundary; DOM hitboxes must never deadlock a valid route.
      await animateStreetRoute(position, planned.route, next => setPosition(next));
      const result = await moveStreetPlayer(target);
      setPosition(result.position);
    } catch (reason) {
      setPosition(previous);
      const code = reason instanceof ApiCommandError ? reason.code : 'world_move_failed';
      push({ tone: 'error', title: t('common.actionBlocked'), message: worldError(code, t) });
    } finally {
      setActiveRoute(null);
      setMoving(false);
    }
  }

  async function act(actionId: WorldActionId) {
    if (busy || moving || !street) return;
    setBusy(actionId);
    try {
      const result = await runWorldAction(actionId, state.version);
      const copy = notices[result.noticeId];
      const changedSegment = result.street.currentSegmentId !== street.currentSegmentId;
      setStreet(result.street);
      onStateChange(result.state);
      if (changedSegment) {
        setSelectedObjectId(null);
        setActiveRoute(null);
        setPosition(getStreetSpawnPosition(result.street.currentSegmentId));
        setWorldMap(null);
        setVehicles(await getVehicles());
      }
      push({ tone: copy.tone, title: t(copy.title), message: t(copy.message, { count: result.reward?.quantity ?? 1 }) });
    } catch (reason) {
      const code = reason instanceof ApiCommandError ? reason.code : 'world_action_failed';
      push({ tone: 'error', title: t('common.actionBlocked'), message: worldError(code, t) });
      if (reason instanceof ApiCommandError && reason.code === 'state_version_conflict') await refreshAuthoritative();
      else if (reason instanceof ApiCommandError && ['world_action_cooldown', 'world_action_too_far'].includes(reason.code)) await load();
    } finally { setBusy(null); }
  }

  async function handleVehicleAction(vehicle: PlayerVehicle, action: VehicleAction) {
    if (vehicleBusy) return;
    setVehicleBusy(`${vehicle.id}:${action}`);
    try {
      const nextVehicles = await runVehicleAction(vehicle.id, action);
      setVehicles(nextVehicles);
      if (action === 'exit') {
        const spatial = await getStreetPosition();
        setPosition(spatial.position);
      }
      push({ tone: 'success', title: locale === 'bg' ? 'Автомобил' : 'Vehicle', message: vehicleActionMessage(action, vehicle.model.displayName, locale) });
    } catch (reason) {
      push({ tone: 'error', title: t('common.actionBlocked'), message: vehicleError(reason instanceof Error ? reason.message : String(reason), locale) });
    } finally { setVehicleBusy(null); }
  }

  if ((!street || !position) && !loadError) return <div className="street-loading"><span><GameIcon name="map-pin" size={22} /></span><p>{t('world.loadingStreet')}</p></div>;
  if (!street || !position) return <div className="street-load-error"><GameIcon name="alert-triangle" size={24} /><h1>{t('world.loadFailed')}</h1><p>{t('world.loadFailedDetail')}</p><button className="primary-button" onClick={() => void load()}>{t('world.retry')}</button></div>;

  if (mapOpen && worldMap) return <section className="world-screen"><WorldMapView map={worldMap} vehicles={vehicles} focusVehicleId={mapVehicleFocusId} travelBusy={mapTravelBusy} onClose={() => { setMapOpen(false); setMapVehicleFocusId(null); }} onTravel={segmentId => void travelFromMap(segmentId)} onDrive={(vehicleId, segmentId) => void driveFromMap(vehicleId, segmentId)} /></section>;

  return <section className="world-screen">
    <StreetScene street={street} position={position} moving={moving} activeRoute={activeRoute} characterRecipe={state.character?.recipe} vehicles={vehicles} vehicleBusy={vehicleBusy} selectedObjectId={selectedObjectId} busy={busy} onMove={target => void move(target)} onSelectObject={objectId => setSelectedObjectId(objectId as StreetObjectId)} onAction={actionId => void act(actionId)} onVehicleAction={(vehicle, action) => void handleVehicleAction(vehicle, action)} onCloseSelection={() => setSelectedObjectId(null)} />
    <button type="button" className="world-map-launch" disabled={mapBusy} onClick={() => void openMap()}><WorldMapIcon size={19} />{mapCopy.openMap}</button>
  </section>;
}

async function animateStreetRoute(start: StreetPosition, route: StreetPosition[], apply: (position: StreetPosition) => void) {
  let from = start;
  for (const destination of route) {
    const distance = streetDistance(from, destination);
    if (distance < 0.25) { from = destination; continue; }
    const steps = Math.max(1, Math.ceil(distance / 1.65));
    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps;
      apply({ x: from.x + (destination.x - from.x) * progress, y: from.y + (destination.y - from.y) * progress });
      await delay(22);
    }
    from = destination;
  }
}

function vehicleActionMessage(action: VehicleAction, name: string, locale: 'bg' | 'en') {
  const messages = locale === 'bg' ? { select: 'е активен', enter: 'влезе в автомобила', exit: 'излезе от автомобила', lock: 'заключен', unlock: 'отключен' } : { select: 'is active', enter: 'entered', exit: 'exited', lock: 'locked', unlock: 'unlocked' };
  return `${name} · ${messages[action]}`;
}
function vehicleError(code: string, locale: 'bg' | 'en') {
  const bg: Record<string, string> = { vehicle_not_at_player_location: 'Автомобилът не е на тази улица.', vehicle_too_far: 'На правилната улица си, но трябва да се приближиш до автомобила.', vehicle_locked: 'Първо отключи автомобила.', vehicle_enter_before_driving: 'Първо влез в активния автомобил.', vehicle_not_enough_fuel: 'Няма достатъчно гориво за този маршрут.', vehicle_route_unavailable: 'До тази улица няма достъпен автомобилен маршрут.', vehicle_exit_before_locking: 'Излез от автомобила, преди да го заключиш.' };
  const en: Record<string, string> = { vehicle_not_at_player_location: 'The vehicle is not on this street.', vehicle_too_far: 'You are on the correct street, but you need to approach the vehicle.', vehicle_locked: 'Unlock the vehicle first.', vehicle_enter_before_driving: 'Enter the active vehicle before driving.', vehicle_not_enough_fuel: 'There is not enough fuel for this route.', vehicle_route_unavailable: 'There is no car route to that street.', vehicle_exit_before_locking: 'Exit the vehicle before locking it.' };
  const dict = locale === 'bg' ? bg : en;
  return Object.entries(dict).find(([key]) => code.includes(key))?.[1] ?? (locale === 'bg' ? 'Действието с автомобила е блокирано.' : 'The vehicle action is blocked.');
}
function delay(ms: number) { return new Promise<void>(resolve => window.setTimeout(resolve, ms)); }
function notice(title: TranslationKey, message: TranslationKey, tone: NotificationTone) { return { title, message, tone }; }
function worldError(code: string, t: ReturnType<typeof useI18n>['t']) {
  const errors: Record<string, TranslationKey> = {
    state_version_conflict: 'world.error.stateConflict', world_action_cooldown: 'world.error.cooldown', world_action_locked: 'world.error.locked',
    world_action_already_done: 'world.error.alreadyDone', world_action_wrong_location: 'world.error.wrongLocation', world_action_too_far: 'world.error.wrongLocation',
    world_position_blocked: 'world.error.wrongLocation', inventory_container_full: 'world.error.inventoryFull', inventory_capacity_exceeded: 'world.error.inventoryHeavy', inventory_container_not_found: 'world.error.inventoryMissing'
  };
  return t(errors[code] ?? 'world.error.generic');
}
