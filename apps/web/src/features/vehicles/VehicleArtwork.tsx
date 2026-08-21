import type { VehicleModel } from '@sol-dorado/contracts/vehicles';

const vehicleAssets: Record<string, { src: string; position: string }> = {
  bravura_compact_s: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Red_Smart_Car_Side_View_Driveway.jpg',
    position: '50% 54%'
  },
  aurelia_r7: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/2013_Lada_Granta_219010_white_side.jpg',
    position: '50% 50%'
  },
  mesa_trail_150: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/Fargo_pickup_side_view.jpg',
    position: '50% 50%'
  },
  veloce_sprint: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Silver_Ferrari_Luxury_Sports_Car.jpg',
    position: '50% 48%'
  }
};

export function VehicleArtwork({ model, className = '', compact = false }: { model: VehicleModel; className?: string; compact?: boolean }) {
  const asset = vehicleAssets[model.id] ?? vehicleAssets.bravura_compact_s!;
  return (
    <figure className={`vehicle-artwork ${compact ? 'vehicle-artwork-compact' : ''} ${className}`} aria-label={model.displayName}>
      <img
        src={asset.src}
        alt={model.displayName}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        style={{ objectPosition: asset.position }}
      />
      <span className="vehicle-artwork-vignette" aria-hidden="true" />
    </figure>
  );
}
