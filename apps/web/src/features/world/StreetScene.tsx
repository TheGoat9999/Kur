import { useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';
import type { CharacterRecipe, StreetState, WorldActionId } from '@sol-dorado/contracts';
import {
  getStreetActionAnchor,
  getStreetRoute,
  isStreetActionWithinReach,
  streetDistance,
  type StreetMoveResult,
  type StreetPosition
} from '@sol-dorado/contracts/world-position';
import { GameIcon } from '../../components/GameIcon';
import { WorldCharacter, visualFromCharacterRecipe, type WorldCharacterDirection } from '../../components/WorldCharacter';
import { useI18n } from '../../i18n';
import { InteractionPanel } from './InteractionPanel';
import { StreetBackdrop } from './StreetBackdrop';
import { StreetObject } from './StreetObject';
import { StreetPopulation } from './StreetPopulation';
import { STREET_SCENES } from './street-config';
import './street-world.css';

const segmentOrder = ['market_block_3', 'cypress_corner', 'mira_alley'] as const;

type MovementPreview = Pick<StreetMoveResult, 'position' | 'route'> & { requestedPosition: StreetPosition; blocked: boolean };

export function StreetScene({ street, position, moving, activeRoute, characterRecipe, selectedObjectId, busy, onMove, onSelectObject, onAction, onCloseSelection }: {
  street: StreetState;
  position: StreetPosition;
  moving: boolean;
  activeRoute: StreetPosition[] | null;
  characterRecipe?: CharacterRecipe | null;
  selectedObjectId: string | null;
  busy: WorldActionId | null;
  onMove: (position: StreetPosition) => void;
  onSelectObject: (objectId: string) => void;
  onAction: (actionId: WorldActionId) => void;
  onCloseSelection: () => void;
}) {
  const { t } = useI18n();
  const [preview, setPreview] = useState<MovementPreview | null>(null);
  const scene = STREET_SCENES[street.currentSegmentId];
  const visibleObjects = scene.objects.filter(object => street.visibleObjectIds.includes(object.id));
  const selected = visibleObjects.find(object => object.id === selectedObjectId) ?? null;
  const inRange = selected ? selected.actions.some(actionId => isStreetActionWithinReach(street.currentSegmentId, position, actionId)) : false;
  const playerStyle = { '--player-x': `${position.x}%`, '--player-y': `${position.y}%` } as CSSProperties;
  const playerVisual = visualFromCharacterRecipe(characterRecipe);
  const playerDirection = directionForRoute(position, activeRoute);

  function eventPosition(event: MouseEvent<HTMLDivElement> | PointerEvent<HTMLDivElement>): StreetPosition {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100
    };
  }

  function isUiTarget(target: EventTarget | null) {
    return (target as HTMLElement | null)?.closest('button, .street-interaction-panel, .street-scene-meta, .street-danger-chip, .street-route');
  }

  function updateMovementPreview(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || moving || isUiTarget(event.target)) {
      if (!moving) setPreview(null);
      return;
    }
    const requestedPosition = eventPosition(event);
    const route = getStreetRoute(street.currentSegmentId, position, requestedPosition);
    if (!route) {
      setPreview({ requestedPosition, position: requestedPosition, route: [], blocked: true });
      return;
    }
    setPreview({ requestedPosition, position: route.position, route: route.route, blocked: false });
  }

  function moveFromScene(event: MouseEvent<HTMLDivElement>) {
    if (moving || isUiTarget(event.target)) return;
    const requestedPosition = eventPosition(event);
    const route = getStreetRoute(street.currentSegmentId, position, requestedPosition);
    if (!route) {
      setPreview({ requestedPosition, position: requestedPosition, route: [], blocked: true });
      return;
    }
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

  const routeToRender = activeRoute ?? (!moving && preview && !preview.blocked ? preview.route : null);
  const destination = activeRoute?.[activeRoute.length - 1] ?? preview?.position ?? null;

  return (
    <div className="street-scene-shell">
      <div
        className={`street-scene street-scene-${scene.theme} ${moving ? 'street-scene-moving' : ''} ${preview?.blocked ? 'street-scene-route-blocked' : ''}`}
        aria-label={t('world.sceneLabel', { street: t(scene.nameKey) })}
        onClick={moveFromScene}
        onPointerMove={updateMovementPreview}
        onPointerLeave={() => !moving && setPreview(null)}
      >
        <StreetBackdrop theme={scene.theme} alerted={street.flags.cornerStoreAlerted} />
        <StreetPopulation segmentId={street.currentSegmentId} visibleObjectIds={street.visibleObjectIds} />

        <div className="street-scene-meta" title={t(scene.atmosphereKey)}>
          <span>SOL DORADO / {t('world.title')}</span><h1>{t(scene.nameKey)}</h1>
        </div>
        <div className={`street-danger-chip ${street.flags.cornerStoreAlerted ? 'street-danger-alert' : ''}`}><span />{street.flags.cornerStoreAlerted ? t('world.heightenedAwareness') : t('world.calm')}</div>
        <div className="street-route" aria-label={t('world.streetNetwork')}>
          {segmentOrder.map(segmentId => <span key={segmentId} className={`${street.visitedSegmentIds.includes(segmentId) ? 'street-route-visited' : ''} ${street.currentSegmentId === segmentId ? 'street-route-current' : ''}`} title={t(STREET_SCENES[segmentId].nameKey)} />)}
        </div>

        {routeToRender && routeToRender.length > 1 && (
          <svg className={`street-navigation-overlay ${moving ? 'street-navigation-overlay-active' : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={routeToRender.map(point => `${point.x},${point.y}`).join(' ')} />
          </svg>
        )}

        {destination && (
          <span
            className={`street-move-cursor ${preview?.blocked ? 'street-move-cursor-blocked' : ''} ${moving ? 'street-move-cursor-active' : ''}`}
            style={{ '--move-x': `${destination.x}%`, '--move-y': `${destination.y}%` } as CSSProperties}
            aria-hidden="true"
          >
            <i className="street-move-cursor-ring" />
            <span><GameIcon name={preview?.blocked ? 'x' : 'footprints'} size={15} /></span>
          </span>
        )}

        {visibleObjects.map(object => (
          <StreetObject key={`${street.currentSegmentId}:${object.id}`} definition={object} selected={selectedObjectId === object.id} alerted={object.id === 'corner_store' && street.flags.cornerStoreAlerted} onSelect={() => onSelectObject(object.id)} />
        ))}

        <div className="street-player" style={playerStyle} aria-label={t('world.you')}>
          <WorldCharacter visual={playerVisual} direction={playerDirection} moving={moving} className="street-player-avatar" />
          <b>{t('world.you')}</b>
        </div>

        {selected && (
          <InteractionPanel object={selected} actionStates={street.actionStates} busy={busy} inRange={inRange} moving={moving} onApproach={approachSelected} onAction={onAction} onClose={onCloseSelection} />
        )}
      </div>
    </div>
  );
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
