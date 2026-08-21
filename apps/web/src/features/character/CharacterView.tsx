import type { BootstrapState } from '@sol-dorado/contracts';
import { CharacterCreatorV2 } from '../character-v2/CharacterCreatorV2';

export function CharacterView({ state, onStateChange }: { state: BootstrapState; onStateChange: (next: BootstrapState) => void }) {
  return <CharacterCreatorV2 state={state} onStateChange={onStateChange} />;
}
