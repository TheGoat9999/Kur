import type { CSSProperties } from 'react';

export type WorldVehicleType = 'sedan' | 'hatchback' | 'coupe' | 'suv' | 'pickup' | 'van' | 'truck';
export type WorldVehicleHeading = 'east' | 'west';
export type WorldVehicleService = 'civilian' | 'taxi' | 'police' | 'ems' | 'delivery';

const KENNEY_CAR = '/assets/vehicles/kenney/car_blue_1.png';

export function WorldVehicle({ type, color, heading = 'east', service = 'civilian', serviceLabel, className = '' }: {
  type: WorldVehicleType;
  color: string;
  heading?: WorldVehicleHeading;
  service?: WorldVehicleService;
  serviceLabel?: string | undefined;
  className?: string;
}) {
  const style = {
    '--vehicle-hue': `${hueShiftFromBlue(color)}deg`,
    '--vehicle-scale-x': vehicleScale(type).x,
    '--vehicle-scale-y': vehicleScale(type).y
  } as CSSProperties;

  return (
    <span
      className={`world-vehicle world-vehicle-sprite world-vehicle-${type} world-vehicle-${heading} world-vehicle-service-${service} ${className}`.trim()}
      style={style}
      aria-hidden="true"
    >
      <img className="world-vehicle-sprite-image" src={KENNEY_CAR} alt="" draggable={false} />
      {service === 'taxi' && <span className="world-vehicle-roof-badge world-vehicle-roof-badge-taxi">TAXI</span>}
      {service === 'police' && <span className="world-vehicle-lightbar"><i /><i /></span>}
      {service === 'ems' && <span className="world-vehicle-roof-badge world-vehicle-roof-badge-ems">+</span>}
      {serviceLabel && <span className="world-vehicle-service-label">{serviceLabel}</span>}
    </span>
  );
}

function vehicleScale(type: WorldVehicleType) {
  if (type === 'coupe') return { x: 0.94, y: 0.9 };
  if (type === 'hatchback') return { x: 0.91, y: 0.96 };
  if (type === 'suv') return { x: 1.03, y: 1.08 };
  if (type === 'pickup') return { x: 1.05, y: 1.02 };
  if (type === 'van') return { x: 1.08, y: 1.12 };
  if (type === 'truck') return { x: 1.14, y: 1.14 };
  return { x: 1, y: 1 };
}

function hueShiftFromBlue(hex: string) {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return 0;
  const value = match[1]!;
  const r = Number.parseInt(value.slice(0, 2), 16) / 255;
  const g = Number.parseInt(value.slice(2, 4), 16) / 255;
  const b = Number.parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return 0;
  let hue = 0;
  if (max === r) hue = 60 * (((g - b) / delta) % 6);
  else if (max === g) hue = 60 * ((b - r) / delta + 2);
  else hue = 60 * ((r - g) / delta + 4);
  if (hue < 0) hue += 360;
  return Math.round(hue - 205);
}
