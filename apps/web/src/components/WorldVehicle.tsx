import type { CSSProperties } from 'react';

export type WorldVehicleType = 'sedan' | 'hatchback' | 'coupe' | 'suv' | 'pickup' | 'van' | 'truck';
export type WorldVehicleHeading = 'east' | 'west';
export type WorldVehicleService = 'civilian' | 'taxi' | 'police' | 'ems' | 'delivery';
export type WorldVehicleAsset =
  | 'normal-car-1'
  | 'normal-car-2'
  | 'sports-car-1'
  | 'sports-car-2'
  | 'suv'
  | 'taxi'
  | 'police';

const VEHICLE_ASSET_BASE = '/assets/vehicles/fbx-derived';
const VEHICLE_ASSETS: Record<WorldVehicleAsset, string> = {
  'normal-car-1': `${VEHICLE_ASSET_BASE}/normal-car-1.svg`,
  'normal-car-2': `${VEHICLE_ASSET_BASE}/normal-car-2.svg`,
  'sports-car-1': `${VEHICLE_ASSET_BASE}/sports-car-1.svg`,
  'sports-car-2': `${VEHICLE_ASSET_BASE}/sports-car-2.svg`,
  suv: `${VEHICLE_ASSET_BASE}/suv.svg`,
  taxi: `${VEHICLE_ASSET_BASE}/taxi.svg`,
  police: `${VEHICLE_ASSET_BASE}/police.svg`
};

export function WorldVehicle({
  type,
  color,
  heading = 'east',
  service = 'civilian',
  serviceLabel,
  assetSeed = '',
  className = ''
}: {
  type: WorldVehicleType;
  color: string;
  heading?: WorldVehicleHeading;
  service?: WorldVehicleService;
  serviceLabel?: string | undefined;
  assetSeed?: string;
  className?: string;
}) {
  const asset = selectVehicleAsset(type, service, assetSeed);
  const style = {
    '--vehicle-owner-accent': color
  } as CSSProperties;

  return (
    <span
      className={`world-vehicle world-vehicle-sprite world-vehicle-${type} world-vehicle-${heading} world-vehicle-service-${service} world-vehicle-asset-${asset} ${className}`.trim()}
      style={style}
      data-vehicle-asset={asset}
      aria-hidden="true"
    >
      <img className="world-vehicle-sprite-image" src={VEHICLE_ASSETS[asset]} alt="" draggable={false} />
      {service === 'ems' && <span className="world-vehicle-roof-badge world-vehicle-roof-badge-ems">+</span>}
      {serviceLabel && service !== 'taxi' && service !== 'police' && (
        <span className="world-vehicle-service-label">{serviceLabel}</span>
      )}
    </span>
  );
}

function selectVehicleAsset(type: WorldVehicleType, service: WorldVehicleService, seed: string): WorldVehicleAsset {
  if (service === 'taxi') return 'taxi';
  if (service === 'police') return 'police';
  if (type === 'suv' || type === 'pickup' || type === 'van' || type === 'truck') return 'suv';
  if (type === 'coupe') return hashParity(seed) ? 'sports-car-1' : 'sports-car-2';
  return hashParity(seed) ? 'normal-car-1' : 'normal-car-2';
}

function hashParity(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  return Math.abs(hash) % 2 === 0;
}
