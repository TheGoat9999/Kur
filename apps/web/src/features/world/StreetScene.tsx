import { useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';
import type { CharacterRecipe, StreetState, WorldActionId } from '@sol-dorado/contracts';
import type { PlayerVehicle, VehicleState } from '@sol-dorado/contracts/vehicles';
import { getResponsiveStreetRoute } from '@sol-dorado/contracts/street-routing';
import {
  getStreetActionAnchor,
  isStreetActionWithinReach,
  streetDistance,
  type StreetMoveResult,
  type StreetPosition
} from '@sol-dorado/contracts/world-position';
import { GameIcon } from '../../components/GameIcon';
import { WorldCharacter, visualFromCharacterRecipe, type WorldCharacterDirection } from '../../components/WorldCharacter';
import { useI18n } from '../../i18n';
import { VehicleArtwork } from '../vehicles/VehicleArtwork';
import { InteractionPanel } from './InteractionPanel';
import { StreetBackdrop } from './StreetBackdrop';
import { StreetObject } from './StreetObject';
import { StreetPopulation } from './StreetPopulation';
import { STREET_SCENES } from './street-config';
import './street-world.css';
import './vehicle-world.css';

const segmentOrder = ['market_block_3', 'cypress_corner', 'mira_alley'] as const;
type VehicleAction = 'select' | 'enter' | 'exit' | 'lock' | 'unlock';
type MovementPreview = Pick<StreetMoveResult, 'position' | 'route'> & { requestedPosition: StreetPosition; blocked: boolean };

const PARKING_POSITIONS: Record<string, Array<{ x: number; y: number }>> = {
  market_block_3: [{ x: 25, y: 57 }, { x: 67, y: 57 }, { x: 82, y: 57 }],
  cypress_corner: [{ x: 24, y: 58 }, { x: 66, y: 58 }, { x: 82, y: 58 }],
  mira_alley: [{ x: 29, y: 61 }, { x: 66, y: 61 }, { x: 82, y: 61 }]
};

export function StreetScene({ street, position, moving, activeRoute, characterRecipe, vehicles, vehicleBusy, selectedObjectId, busy, onMove, onSelectObject, onAction, onVehicleAction, onCloseSelection }: {
  street: StreetState;
  position: StreetPosition;
  moving: boolean;
  activeRoute: StreetPosition[] | null;
  characterRecipe: CharacterRecipe | null | undefined;
  vehicles: VehicleState | null;
  vehicleBusy: string | null;
  selectedObjectId: string | null;
  busy: WorldActionId | null;
  onMove: (position: StreetPosition) => void;
  onSelectObject: (objectId: string) => void;
  onAction: (actionId: WorldActionId) => void;
  onVehicleAction: (vehicle: PlayerVehicle, action: VehicleAction) => void;
  onCloseSelection: () => void;
}) {
  const { locale, t } = useI18n();
  const [preview, setPreview] = useState<MovementPreview | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const previewFrame = useRef<number | null>(null);
  const scene = STREET_SCENES[street.currentSegmentId];
  const visibleObjects = scene.objects.filter(object => street.visibleObjectIds.includes(object.id));
  const selected = visibleObjects.find(object => object.id === selectedObjectId) ?? null;
  const inRange = selected ? selected.actions.some(actionId => isStreetActionWithinReach(street.currentSegmentId, position, actionId)) : false;
  const parkedVehicles = vehicles?.ownedVehicles.filter(vehicle => vehicle.parkedSegmentId === street.currentSegmentId) ?? [];
  const selectedVehicle = parkedVehicles.find(vehicle => vehicle.id === selectedVehicleId) ?? null;
  const occupiedVehicle = parkedVehicles.find(vehicle => vehicle.occupied) ?? null;
  const playerStyle = { '--player-x': `${position.x}%`, '--player-y': `${position.y}%` } as CSSProperties;
  const playerVisual = visualFromCharacterRecipe(characterRecipe);
  const playerDirection = directionForRoute(position, activeRoute);
  const copy = locale === 'bg' ? bgVehicleCopy : enVehicleCopy;

  function eventPosition(event: MouseEvent<HTMLDivElement> | PointerEvent<HTMLDivElement>): StreetPosition {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 };
  }

  function isUiTarget(target: EventTarget | null) {
    return (target as HTMLElement | null)?.closest('button, .street-interaction-panel, .street-vehicle-panel, .street-scene-meta, .street-danger-chip, .street-route, .street-collision-actor');
  }

  function updateMovementPreview(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || moving || occupiedVehicle || isUiTarget(event.target)) {
      if (!moving) setPreview(null);
      return;
    }
    const requestedPosition = eventPosition(event);
    if (previewFrame.current !== null) window.cancelAnimationFrame(previewFrame.current);
    previewFrame.current = window.requestAnimationFrame(() => {
      previewFrame.current = null;
      const route = getResponsiveStreetRoute(street.currentSegmentId, position, requestedPosition);
      if (!route) { setPreview({ requestedPosition, position: requestedPosition, route: [], blocked: true }); return; }
      setPreview({ requestedPosition, position: route.position, route: route.route, blocked: false });
    });
  }

  function clearPreview() {
    if (previewFrame.current !== null) window.cancelAnimationFrame(previewFrame.current);
    previewFrame.current = null;
    if (!moving) setPreview(null);
  }

  function moveFromScene(event: MouseEvent<HTMLDivElement>) {
    if (moving || occupiedVehicle || isUiTarget(event.target) || event.button !== 0) return;
    const requestedPosition = eventPosition(event);
    const route = getResponsiveStreetRoute(street.currentSegmentId, position, requestedPosition);
    if (!route) { setPreview({ requestedPosition, position: requestedPosition, route: [], blocked: true }); return; }
    setPreview({ requestedPosition, position: route.position, route: route.route, blocked: false });
    onMove(requestedPosition);
  }

  function approachSelected() {
    if (!selected) return;
    const firstAction = selected.actions[0];
    if (!firstAction) return;
    const anchor = getStreetActionAnchor(street.currentSegmentId, firstAction);
    if (anchor) onMove({ x: anchor.x, y: anchor.y });
  }

  function selectVehicle(vehicle: PlayerVehicle) {
    onCloseSelection();
    setSelectedVehicleId(vehicle.id);
  }

  const routeToRender = activeRoute ?? (!moving && preview && !preview.blocked ? preview.route : null);
  const destination = activeRoute?.[activeRoute.length - 1] ?? preview?.requestedPosition ?? null;
  const parkingPositions = PARKING_POSITIONS[street.currentSegmentId] ?? PARKING_POSITIONS.market_block_3;

  return (
    <div className="street-scene-shell">
      <div className={`street-scene street-scene-${scene.theme} ${moving ? 'street-scene-moving' : ''} ${preview?.blocked ? 'street-scene-route-blocked' : ''}`} aria-label={t('world.sceneLabel', { street: t(scene.nameKey) })} onClick={moveFromScene} onPointerMove={updateMovementPreview} onPointerLeave={clearPreview}>
        <StreetBackdrop theme={scene.theme} alerted={street.flags.cornerStoreAlerted} />
        <StreetPopulation segmentId={street.currentSegmentId} visibleObjectIds={street.visibleObjectIds} />

        <div className="street-scene-meta" title={t(scene.atmosphereKey)}><span>SOL DORADO / {t('world.title')}</span><h1>{t(scene.nameKey)}</h1></div>
        <div className={`street-danger-chip ${street.flags.cornerStoreAlerted ? 'street-danger-alert' : ''}`}><span />{street.flags.cornerStoreAlerted ? t('world.heightenedAwareness') : t('world.calm')}</div>
        <div className="street-route" aria-label={t('world.streetNetwork')}>{segmentOrder.map(segmentId => <span key={segmentId} className={`${street.visitedSegmentIds.includes(segmentId) ? 'street-route-visited' : ''} ${street.currentSegmentId === segmentId ? 'street-route-current' : ''}`} title={t(STREET_SCENES[segmentId].nameKey)} />)}</div>

        {routeToRender && routeToRender.length > 1 && <svg className={`street-navigation-overlay ${moving ? 'street-navigation-overlay-active' : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={routeToRender.map(point => `${point.x},${point.y}`).join(' ')} /></svg>}
        {destination && !occupiedVehicle && <span className={`street-move-cursor ${preview?.blocked ? 'street-move-cursor-blocked' : ''} ${moving ? 'street-move-cursor-active' : ''}`} style={{ '--move-x': `${destination.x}%`, '--move-y': `${destination.y}%` } as CSSProperties} aria-hidden="true"><i className="street-move-cursor-ring" /><span><GameIcon name={preview?.blocked ? 'x' : 'footprints'} size={15} /></span></span>}

        {visibleObjects.map(object => <StreetObject key={`${street.currentSegmentId}:${object.id}`} definition={object} selected={selectedObjectId === object.id} alerted={object.id === 'corner_store' && street.flags.cornerStoreAlerted} onSelect={() => { setSelectedVehicleId(null); onSelectObject(object.id); }} />)}

        {parkedVehicles.map((vehicle, index) => {
          const spot = parkingPositions[index % parkingPositions.length] ?? { x: 50, y: 58 };
          return <button key={vehicle.id} type="button" className={`street-world-vehicle street-collision-actor ${vehicle.active ? 'active' : ''} ${vehicle.locked ? 'locked' : ''} ${selectedVehicleId === vehicle.id ? 'selected' : ''}`} style={{ left: `${spot.x}%`, top: `${spot.y}%` }} onClick={() => selectVehicle(vehicle)} aria-label={`${vehicle.model.displayName} · ${vehicle.locked ? copy.locked : copy.unlocked}`}><VehicleArtwork model={vehicle.model} compact /></button>;
        })}

        <div className={`street-player ${occupiedVehicle ? 'street-player-hidden-in-vehicle' : ''}`} style={playerStyle} aria-label={t('world.you')}><WorldCharacter visual={playerVisual} direction={playerDirection} moving={moving} className="street-player-avatar" /><b>{t('world.you')}</b></div>

        {selected && !selectedVehicle && <InteractionPanel object={selected} actionStates={street.actionStates} busy={busy} inRange={inRange} moving={moving} onApproach={approachSelected} onAction={onAction} onClose={onCloseSelection} />}
        {selectedVehicle && <VehicleWorldPanel vehicle={selectedVehicle} copy={copy} busy={vehicleBusy} onAction={onVehicleAction} onClose={() => setSelectedVehicleId(null)} />}
      </div>
    </div>
  );
}

function VehicleWorldPanel({ vehicle, copy, busy, onAction, onClose }: { vehicle: PlayerVehicle; copy: typeof enVehicleCopy; busy: string | null; onAction: (vehicle: PlayerVehicle, action: VehicleAction) => void; onClose: () => void }) {
  const avgCondition = Math.round((vehicle.engineCondition + vehicle.bodyCondition + vehicle.tireCondition) / 3);
  return <aside className="street-vehicle-panel" aria-label={vehicle.model.displayName}>
    <div className="street-vehicle-panel-head">
      <VehicleArtwork model={vehicle.model} compact />
      <div className="street-vehicle-panel-copy"><span>{vehicle.active ? copy.active : copy.ownedVehicle}</span><h3>{vehicle.model.brand} {vehicle.model.model}</h3><p>{vehicle.model.year} · {vehicle.parkedDisplayName}</p></div>
      <button type="button" className="street-vehicle-panel-close" onClick={onClose}><GameIcon name="x" size={15} /></button>
    </div>
    <div className="street-vehicle-status">
      <span><small>{copy.fuel}</small><b>{Math.round(vehicle.fuelPercent)}%</b></span>
      <span><small>{copy.condition}</small><b>{avgCondition}%</b></span>
      <span><small>{copy.security}</small><b>{vehicle.locked ? copy.locked : copy.unlocked}</b></span>
    </div>
    <div className="street-vehicle-actions">
      {!vehicle.active && <button disabled={Boolean(busy)} onClick={() => onAction(vehicle, 'select')}><GameIcon name="check" size={14} />{copy.makeActive}</button>}
      {vehicle.occupied
        ? <button className="primary" disabled={Boolean(busy)} onClick={() => onAction(vehicle, 'exit')}><GameIcon name="door-open" size={14} />{copy.exit}</button>
        : <button className="primary" disabled={vehicle.locked || Boolean(busy)} onClick={() => onAction(vehicle, 'enter')}><GameIcon name="car" size={14} />{copy.enter}</button>}
      <button disabled={vehicle.occupied || Boolean(busy)} onClick={() => onAction(vehicle, vehicle.locked ? 'unlock' : 'lock')}><GameIcon name="lock" size={14} />{vehicle.locked ? copy.unlock : copy.lock}</button>
    </div>
    <p className="vehicle-action-hint">{vehicle.occupied ? copy.driveHint : vehicle.locked ? copy.unlockHint : copy.enterHint}</p>
  </aside>;
}

function directionForRoute(position: StreetPosition, route: StreetPosition[] | null): WorldCharacterDirection {
  if (!route?.length) return 'south';
  const next = route.find(point => streetDistance(position, point) > 1.2);
  if (!next) return 'south';
  const dx = next.x - position.x;
  const dy = next.y - position.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'east' : 'west';
  return dy >= 0 ? 'south' : 'north';
}

const enVehicleCopy = { active: 'ACTIVE VEHICLE', ownedVehicle: 'OWNED VEHICLE', fuel: 'Fuel', condition: 'Condition', security: 'Security', locked: 'Locked', unlocked: 'Unlocked', makeActive: 'Make active', enter: 'Enter', exit: 'Exit', lock: 'Lock', unlock: 'Unlock', driveHint: 'You are inside. Open the map and choose a destination to drive.', unlockHint: 'Unlock the car before entering.', enterHint: 'Enter the vehicle to enable driving from the map.' };
const bgVehicleCopy: typeof enVehicleCopy = { active: 'АКТИВЕН АВТОМОБИЛ', ownedVehicle: 'ТВОЙ АВТОМОБИЛ', fuel: 'Гориво', condition: 'Състояние', security: 'Сигурност', locked: 'Заключена', unlocked: 'Отключена', makeActive: 'Направи активна', enter: 'Влез', exit: 'Излез', lock: 'Заключи', unlock: 'Отключи', driveHint: 'Вътре си. Отвори картата и избери дестинация, до която да караш.', unlockHint: 'Отключи колата, преди да влезеш.', enterHint: 'Влез в автомобила, за да активираш пътуването с кола от картата.' };