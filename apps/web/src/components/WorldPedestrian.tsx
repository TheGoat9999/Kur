import {
  WorldCharacter,
  type WorldCharacterDirection,
  type WorldCharacterVisual
} from './WorldCharacter';

/**
 * Street pedestrians deliberately use the same renderer as the player.
 * The seed is kept in the public API because population code owns stable NPC
 * identities and future vector catalog choices can continue to derive from it.
 */
export function WorldPedestrian({ visual, seed, direction = 'south', moving = false, className = '' }: {
  visual: WorldCharacterVisual;
  seed: string;
  direction?: WorldCharacterDirection;
  moving?: boolean;
  className?: string;
}) {
  return (
    <WorldCharacter
      visual={visual}
      direction={direction}
      moving={moving}
      className={`world-pedestrian-vector ${className}`.trim()}
    />
  );
}

export function pedestrianVariantFromSeed(body: WorldCharacterVisual['body'], seed: string) {
  return `${body}-${stableHash(seed) % 12}`;
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
