import type { CSSProperties } from 'react';
import { GeneratedVehicleSprite, type GeneratedVehicleDirection } from './GeneratedVehicleSprite';

export type WorldVehicleType = 'sedan' | 'hatchback' | 'coupe' | 'suv' | 'pickup' | 'van' | 'truck';
export type WorldVehicleHeading = GeneratedVehicleDirection;
export type WorldVehicleService = 'civilian' | 'taxi' | 'police' | 'ems' | 'delivery';
export type WorldVehicleAsset = 'generated-coupe';

export function WorldVehicle({
  type,
  color,
  heading = 'east',
  service = 'civilian',
  serviceLabel,
  assetSeed: _assetSeed = '',
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
  const style = {
    '--vehicle-owner-accent': color
  } as CSSProperties;

  return (
    <span
      className={`world-vehicle world-vehicle-sprite world-vehicle-${type} world-vehicle-${heading} world-vehicle-service-${service} world-vehicle-asset-generated-coupe ${className}`.trim()}
      style={style}
      data-vehicle-asset="generated-coupe"
      data-vehicle-render="generated-sprite-v1"
      aria-hidden="true"
    >
      <GeneratedVehicleSprite direction={heading} className="world-vehicle-generated-image" eager />
      {service === 'ems' && <span className="world-vehicle-roof-badge world-vehicle-roof-badge-ems">+</span>}
      {serviceLabel && service !== 'taxi' && service !== 'police' && (
        <span className="world-vehicle-service-label">{serviceLabel}</span>
      )}
    </span>
  );
}
