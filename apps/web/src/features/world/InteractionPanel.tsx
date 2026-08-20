import type { StreetActionState, WorldActionId } from '@sol-dorado/contracts';
import { GameIcon } from '../../components/GameIcon';
import { useI18n } from '../../i18n';
import { STREET_ACTION_COPY, type StreetObjectDefinition } from './street-config';

export function InteractionPanel({ object, actionStates, busy, inRange, moving, onApproach, onAction, onClose }: {
  object: StreetObjectDefinition;
  actionStates: StreetActionState[];
  busy: WorldActionId | null;
  inRange: boolean;
  moving: boolean;
  onApproach: () => void;
  onAction: (actionId: WorldActionId) => void;
  onClose: () => void;
}) {
  const { locale, t } = useI18n();
  return (
    <aside className="street-interaction-panel" aria-label={t('world.contextualActions')} onClick={event => event.stopPropagation()}>
      <header>
        <span className={`street-interaction-symbol street-interaction-${object.kind}`}><GameIcon name={object.icon} size={18} /></span>
        <div><span>{t('world.selectedObject')}</span><h2>{t(object.labelKey)}</h2><p>{t(object.detailKey)}</p></div>
        <button type="button" onClick={onClose} aria-label={t('world.closeSelection')}><GameIcon name="x" size={15} /></button>
      </header>

      {!inRange && (
        <button className="street-approach" type="button" disabled={moving || busy !== null} onClick={onApproach}>
          <span><GameIcon name="footprints" size={16} /></span>
          <b>{moving ? t('world.resolving') : locale === 'bg' ? 'Приближи се до мястото' : 'Move closer'}</b>
          <small>{locale === 'bg' ? 'Действията се отключват само когато героят е наблизо.' : 'Actions unlock only when your character is nearby.'}</small>
        </button>
      )}

      <div className="street-action-list">
        {object.actions.map(actionId => {
          const presentation = STREET_ACTION_COPY[actionId];
          const state = actionStates.find(item => item.actionId === actionId);
          const availability = state?.availability ?? 'wrong_location';
          const disabled = moving || busy !== null || !inRange || availability !== 'available';
          const detail = !inRange
            ? (locale === 'bg' ? 'Твърде далеч. Приближи героя.' : 'Too far away. Move your character closer.')
            : availability === 'available'
              ? t(presentation.descriptionKey)
              : availabilityText(availability, state?.cooldownEndsAt ?? null, t);
          return (
            <button
              type="button"
              className={`street-action street-action-${presentation.tone}`}
              key={actionId}
              disabled={disabled}
              onClick={() => onAction(actionId)}
            >
              <span className="street-action-icon"><GameIcon name={availability === 'locked' ? 'lock' : presentation.icon} size={16} /></span>
              <span className="street-action-copy">
                <b>{busy === actionId ? t('world.resolving') : t(presentation.labelKey)}</b>
                <small>{detail}</small>
              </span>
              <GameIcon name={!disabled ? 'arrow-right' : 'lock'} size={14} />
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function availabilityText(availability: StreetActionState['availability'], cooldownEndsAt: string | null, t: ReturnType<typeof useI18n>['t']) {
  if (availability === 'locked') return t('world.unavailable.locked');
  if (availability === 'already_done') return t('world.unavailable.alreadyDone');
  if (availability === 'wrong_location') return t('world.unavailable.wrongLocation');
  if (availability !== 'cooldown' || !cooldownEndsAt) return t('world.unavailable.blocked');
  const remainingSeconds = Math.max(1, Math.ceil((new Date(cooldownEndsAt).getTime() - Date.now()) / 1_000));
  if (remainingSeconds >= 3_600) return t('world.unavailable.hours', { count: Math.ceil(remainingSeconds / 3_600) });
  if (remainingSeconds >= 60) return t('world.unavailable.minutes', { count: Math.ceil(remainingSeconds / 60) });
  return t('world.unavailable.seconds', { count: remainingSeconds });
}
