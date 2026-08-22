import { useState, type CSSProperties } from 'react';
import {
  WorldCharacter,
  type WorldCharacterDirection,
  type WorldCharacterVisual
} from './WorldCharacter';
import './world-pedestrian.css';

const PEDESTRIAN_ATLAS = '/assets/people/fbx-derived/pedestrians-v1.webp?v=20260822-1';
const VARIANTS_PER_BODY = 4;

const femaleVariants = ['alternative', 'casual', 'dress', 'tank-top'] as const;
const maleVariants = ['casual', 'long-sleeve', 'shirt', 'suit'] as const;
const directionRows: Record<WorldCharacterDirection, number> = {
  south: 0,
  east: 1,
  north: 2,
  west: 3
};

export function WorldPedestrian({ visual, seed, direction = 'south', moving = false, className = '' }: {
  visual: WorldCharacterVisual;
  seed: string;
  direction?: WorldCharacterDirection;
  moving?: boolean;
  className?: string;
}) {
  const [assetLoaded, setAssetLoaded] = useState(false);
  const variant = pedestrianVariantFromSeed(visual.body, seed);
  const localColumn = stableHash(seed) % VARIANTS_PER_BODY;
  const column = visual.body === 'female' ? localColumn : VARIANTS_PER_BODY + localColumn;
  const row = directionRows[direction];
  const atlasStyle = {
    left: `-${column * 100}%`,
    top: `-${row * 100}%`
  } as CSSProperties;

  return (
    <span
      className={`world-pedestrian ${moving ? 'world-pedestrian-moving' : ''} ${className}`.trim()}
      data-pedestrian-body={visual.body}
      data-pedestrian-variant={variant}
      data-pedestrian-direction={direction}
    >
      {!assetLoaded && (
        <WorldCharacter
          visual={visual}
          direction={direction}
          moving={moving}
          className="world-pedestrian-fallback"
        />
      )}
      <img
        className={`world-pedestrian-atlas ${assetLoaded ? 'is-loaded' : ''}`}
        src={PEDESTRIAN_ATLAS}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={atlasStyle}
        onLoad={() => setAssetLoaded(true)}
        onError={() => setAssetLoaded(false)}
      />
    </span>
  );
}

export function pedestrianVariantFromSeed(body: WorldCharacterVisual['body'], seed: string) {
  const variants = body === 'female' ? femaleVariants : maleVariants;
  return variants[stableHash(seed) % variants.length];
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
