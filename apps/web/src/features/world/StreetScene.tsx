import type { CSSProperties } from 'react';
import type { StreetState, WorldActionId } from '@sol-dorado/contracts';
import { useI18n } from '../../i18n';
import { InteractionPanel } from './InteractionPanel';
import { StreetBackdrop } from './StreetBackdrop';
import { StreetObject } from './StreetObject';
import { STREET_SCENES } from './street-config';
import './street-world.css';

const segmentOrder = ['market_block_3', 'cypress_corner', 'mira_alley'] as const;

export function StreetScene({ street, selectedObjectId, busy, onSelectObject, onAction, onCloseSelection }: {
  street: StreetState;
  selectedObjectId: string | null;
  busy: WorldActionId | null;
  onSelectObject: (objectId: string) => void;
  onAction: (actionId: WorldActionId) => void;
  onCloseSelection: () => void;
}) {
  const { t } = useI18n();
  const scene = STREET_SCENES[street.currentSegmentId];
  const visibleObjects = scene.objects.filter(object => street.visibleObjectIds.includes(object.id));
  const selected = visibleObjects.find(object => object.id === selectedObjectId) ?? null;
  const playerStyle = { '--player-x': `${scene.player.x}%`, '--player-y': `${scene.player.y}%` } as CSSProperties;

  return (
    <div className={`street-scene-shell ${selected ? 'street-scene-shell-selected' : ''}`}>
      <div className={`street-scene street-scene-${scene.theme}`} aria-label={t('world.sceneLabel', { street: t(scene.nameKey) })}>
        <StreetBackdrop theme={scene.theme} alerted={street.flags.cornerStoreAlerted} />

        <div className="street-scene-meta" title={t(scene.atmosphereKey)}>
          <span>SOL DORADO / {t('world.title')}</span>
          <h1>{t(scene.nameKey)}</h1>
        </div>

        <div className={`street-danger-chip ${street.flags.cornerStoreAlerted ? 'street-danger-alert' : ''}`}>
          <span />{street.flags.cornerStoreAlerted ? t('world.heightenedAwareness') : t('world.calm')}
        </div>

        <div className="street-route" aria-label={t('world.streetNetwork')}>
          {segmentOrder.map(segmentId => (
            <span
              key={segmentId}
              className={`${street.visitedSegmentIds.includes(segmentId) ? 'street-route-visited' : ''} ${street.currentSegmentId === segmentId ? 'street-route-current' : ''}`}
              title={t(STREET_SCENES[segmentId].nameKey)}
            />
          ))}
        </div>

        {visibleObjects.map(object => (
          <StreetObject
            key={`${street.currentSegmentId}:${object.id}`}
            definition={object}
            selected={selectedObjectId === object.id}
            alerted={object.id === 'corner_store' && street.flags.cornerStoreAlerted}
            onSelect={() => onSelectObject(object.id)}
          />
        ))}

        <div className="street-player" style={playerStyle} aria-label={t('world.you')}>
          <span className="street-player-shadow" />
          <span className="street-player-figure"><i className="street-player-head" /><i className="street-player-body" /><i className="street-player-leg street-player-leg-left" /><i className="street-player-leg street-player-leg-right" /></span>
          <b>{t('world.you')}</b>
        </div>
      </div>

      {selected && (
        <InteractionPanel
          object={selected}
          actionStates={street.actionStates}
          busy={busy}
          onAction={onAction}
          onClose={onCloseSelection}
        />
      )}
    </div>
  );
}
