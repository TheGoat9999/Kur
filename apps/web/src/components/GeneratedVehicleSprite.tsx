export type GeneratedVehicleDirection =
  | 'north'
  | 'north-east'
  | 'east'
  | 'south-east'
  | 'south'
  | 'south-west'
  | 'west'
  | 'north-west';

type CanonicalDirection = 'north' | 'north-east' | 'east' | 'south-east' | 'south';

const ASSET_VERSION = '20260824-generated-car-v1';
const ASSET_BASE = '/assets/vehicles/generated';

const FRAME_BY_DIRECTION: Record<CanonicalDirection, string> = {
  north: `${ASSET_BASE}/car-north.webp?v=${ASSET_VERSION}`,
  'north-east': `${ASSET_BASE}/car-northeast.webp?v=${ASSET_VERSION}`,
  east: `${ASSET_BASE}/car-east.webp?v=${ASSET_VERSION}`,
  'south-east': `${ASSET_BASE}/car-southeast.webp?v=${ASSET_VERSION}`,
  south: `${ASSET_BASE}/car-south.webp?v=${ASSET_VERSION}`
};

const DIRECTION_FRAME: Record<GeneratedVehicleDirection, { frame: CanonicalDirection; mirror: boolean }> = {
  north: { frame: 'north', mirror: false },
  'north-east': { frame: 'north-east', mirror: false },
  east: { frame: 'east', mirror: false },
  'south-east': { frame: 'south-east', mirror: false },
  south: { frame: 'south', mirror: false },
  'south-west': { frame: 'south-east', mirror: true },
  west: { frame: 'east', mirror: true },
  'north-west': { frame: 'north-east', mirror: true }
};

export function GeneratedVehicleSprite({
  direction = 'east',
  className = '',
  alt = '',
  eager = false
}: {
  direction?: GeneratedVehicleDirection;
  className?: string;
  alt?: string;
  eager?: boolean;
}) {
  const resolved = DIRECTION_FRAME[direction];

  return (
    <span
      className={`generated-vehicle-sprite generated-vehicle-direction-${direction} ${resolved.mirror ? 'generated-vehicle-mirrored' : ''} ${className}`.trim()}
      data-generated-vehicle-direction={direction}
      data-generated-vehicle-frame={resolved.frame}
    >
      <img
        src={FRAME_BY_DIRECTION[resolved.frame]}
        alt={alt}
        draggable={false}
        decoding="async"
        loading={eager ? 'eager' : 'lazy'}
      />
    </span>
  );
}
