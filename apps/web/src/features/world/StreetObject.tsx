import type { CSSProperties } from 'react';
import { GameIcon } from '../../components/GameIcon';
import { useI18n } from '../../i18n';
import type { StreetObjectDefinition } from './street-config';

export function StreetObject({ definition, selected, alerted, onSelect }: {
  definition: StreetObjectDefinition;
  selected: boolean;
  alerted?: boolean;
  onSelect: () => void;
}) {
  const { t } = useI18n();
  const style = { '--street-x': `${definition.x}%`, '--street-y': `${definition.y}%` } as CSSProperties;
  return (
    <button
      type="button"
      className={`street-object street-object-${definition.kind} ${definition.kind === 'exit' && definition.x < 50 ? 'street-object-exit-left' : ''} ${selected ? 'street-object-selected' : ''} ${alerted ? 'street-object-alerted' : ''}`}
      style={style}
      aria-label={`${t(definition.labelKey)}. ${t(definition.detailKey)}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="street-object-pulse" />
      <span className="street-object-icon"><GameIcon name={definition.icon} size={definition.kind === 'exit' ? 16 : 18} /></span>
      <span className="street-object-label"><b>{t(definition.labelKey)}</b><small>{t(definition.detailKey)}</small></span>
    </button>
  );
}
