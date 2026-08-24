import type { VehicleModel } from '@sol-dorado/contracts/vehicles';
import { GeneratedVehicleSprite } from '../../components/GeneratedVehicleSprite';

export function VehicleArtwork({
  model,
  className = '',
  compact = false
}: {
  model: VehicleModel;
  className?: string;
  compact?: boolean;
}) {
  return (
    <figure
      className={`vehicle-artwork vehicle-artwork-generated ${compact ? 'vehicle-artwork-compact' : ''} ${className}`.trim()}
      aria-label={model.displayName}
      data-vehicle-render="generated-sprite-v1"
    >
      <GeneratedVehicleSprite direction="east" className="vehicle-artwork-generated-sprite" />
      <span className="vehicle-artwork-vignette" aria-hidden="true" />
    </figure>
  );
}
