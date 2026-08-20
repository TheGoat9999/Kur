import type { CSSProperties, MouseEvent } from 'react';
import type { StreetState, WorldActionId } from '@sol-dorado/contracts';
import {
  clampStreetPosition,
  getStreetActionAnchor,
  isStreetActionWithinReach,
  type StreetPosition
} from '@sol-dorado/contracts/world-position';
import { useI18n } from '../../i18n';
import { InteractionPanel } from './InteractionPanel';
import { StreetBackdrop } from './StreetBackdrop';
import { StreetObject } from './StreetObject';
import { STREET_SCENES } from './street-config';
import './street-world.css';

const segmentOrder = ['market_block_3', 'cypress_corner', 'mira_alley'] as const;

export function StreetScene({ street, position, moving, selectedObjectId, busy, onMove, onSelectObject, onAction, onCloseSelection }: {
  street: StreetState;
  position: StreetPosition;
  moving: boolean;
  selectedObjectId: string | null;
  busy: WorldActionId | null;
  onMove: (position: StreetPosition) => void;
  onSelectObject: (objectId: string) => void;
  onAction: (actionId: WorldActionId) => void;
  onCloseSelection: () => void;
}) {
  const { t } = useI18n();
  const scene = STREET_SCENES[street.currentSegmentId];
  const visibleObjects = scene.objects.filter(object => street.visibleObjectIds.includes(object.id));
  const selected = visibleObjects.find(object => object.id === selectedObjectId) ?? null;
  const inRange = selected ? selected.actions.some(actionId => isStreetActionWithinReach(street.currentSegmentId, position, actionId)) : false;
  const playerStyle = { '--player-x': `${position.x}%`, '--player-y': `${position.y}%` } as CSSProperties;

  function moveFromScene(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest('button, .street-interaction-panel')) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const raw = { x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 };
    onMove(clampStreetPosition(street.currentSegmentId, raw));
  }

  function approachSelected() {
    if (!selected) return;
    const anchor = getStreetActionAnchor(street.currentSegmentId, selected.actions[0]);
    if (anchor) onMove({ x: anchor.x, y: anchor.y });
  }

  return (
    <div className="street-scene-shell">
      <div className={`street-scene street-scene-${scene.theme} ${moving ? 'street-scene-moving' : ''}`} aria-label={t('world.sceneLabel', { street: t(scene.nameKey) })} onClick={moveFromScene}>
        <StreetBackdrop theme={scene.theme} alerted={street.flags.cornerStoreAlerted} />

        <div className="street-scene-meta" title={t(scene.atmosphereKey)}>
          <span>SOL DORADO / {t('world.title')}</span><h1>{t(scene.nameKey)}</h1>
        </div>
        <div className={`street-danger-chip ${street.flags.cornerStoreAlerted ? 'street-danger-alert' : ''}`}><span />{street.flags.cornerStoreAlerted ? t('world.heightenedAwareness') : t('world.calm')}</div>
        <div className="street-route" aria-label={t('world.streetNetwork')}>
          {segmentOrder.map(segmentId => <span key={segmentId} className={`${street.visitedSegmentIds.includes(segmentId) ? 'street-route-visited' : ''} ${street.currentSegmentId === segmentId ? 'street-route-current' : ''}`} title={t(STREET_SCENES[segmentId].nameKey)} />)}
        </div>

        {visibleObjects.map(object => (
          <StreetObject key={`${street.currentSegmentId}:${object.id}`} definition={object} selected={selectedObjectId === object.id} alerted={object.id === 'corner_store' && street.flags.cornerStoreAlerted} onSelect={() => onSelectObject(object.id)} />
        ))}

        <div className="street-player" style={playerStyle} aria-label={t('world.you')}>
          <span className="street-player-shadow" />
          <span className="street-player-figure"><i className="street-player-head" /><i className="street-player-body" /><i className="street-player-arm street-player-arm-left" /><i className="street-player-arm street-player-arm-right" /><i className="street-player-leg street-player-leg-left" /><i className="street-player-leg street-player-leg-right" /></span>
          <b>{t('world.you')}</b>
        </div>

        {selected && (
          <InteractionPanel object={selected} actionStates={street.actionStates} busy={busy} inRange={inRange} moving={moving} onApproach={approachSelected} onAction={onAction} onClose={onCloseSelection} />
        )}
      </div>
    </div>
  );
}
