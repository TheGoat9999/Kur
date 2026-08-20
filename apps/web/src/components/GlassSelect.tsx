import * as Select from '@radix-ui/react-select';
import { GameIcon } from './GameIcon';

export interface GlassSelectOption<T extends string> { value: T; label: string; description?: string; }

export function GlassSelect<T extends string>({ value, options, onValueChange, ariaLabel, disabled = false }: {
  value: T;
  options: ReadonlyArray<GlassSelectOption<T>>;
  onValueChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <Select.Root value={value} onValueChange={next => onValueChange(next as T)} disabled={disabled}>
      <Select.Trigger className="glass-select-trigger" aria-label={ariaLabel}>
        <Select.Value />
        <Select.Icon className="glass-select-chevron"><GameIcon name="chevron-down" size={15} /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="glass-select-content" position="popper" sideOffset={7} align="start">
          <Select.Viewport className="glass-select-viewport">
            {options.map(option => (
              <Select.Item className="glass-select-item" key={option.value} value={option.value}>
                <Select.ItemIndicator className="glass-select-indicator"><GameIcon name="check" size={14} /></Select.ItemIndicator>
                <Select.ItemText>{option.label}</Select.ItemText>
                {option.description && <span className="glass-select-description">{option.description}</span>}
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
