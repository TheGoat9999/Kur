export type ShipmentStatus = 'planned' | 'in_transit' | 'delayed' | 'delivered' | 'cancelled';

export interface ShipmentTiming {
  status: ShipmentStatus;
  dispatchedAt: Date | null;
  etaAt: Date | null;
  deliveredAt: Date | null;
  delayMinutes: number;
}

export interface StockPosition {
  itemKey: string;
  quantity: number;
  reorderPoint: number;
  incomingQuantity: number;
}

export interface ShortageSignal {
  itemKey: string;
  severity: 'none' | 'watch' | 'shortage';
  projectedQuantity: number;
  reorderPoint: number;
}

export function effectiveShipmentStatus(shipment: ShipmentTiming, now: Date): ShipmentStatus {
  if (shipment.status === 'cancelled' || shipment.status === 'delivered') return shipment.status;
  if (!shipment.dispatchedAt) return 'planned';
  if (shipment.etaAt && now.getTime() > shipment.etaAt.getTime() + shipment.delayMinutes * 60_000) return 'delayed';
  return 'in_transit';
}

export function canReceiveShipment(shipment: ShipmentTiming, now: Date) {
  if (shipment.status === 'cancelled' || shipment.status === 'delivered' || !shipment.dispatchedAt || !shipment.etaAt) return false;
  return now.getTime() >= shipment.etaAt.getTime() + shipment.delayMinutes * 60_000;
}

export function shortageSignal(position: StockPosition): ShortageSignal {
  const projectedQuantity = position.quantity + position.incomingQuantity;
  const severity = position.quantity <= 0 && projectedQuantity <= 0
    ? 'shortage'
    : projectedQuantity <= position.reorderPoint
      ? 'watch'
      : 'none';
  return { itemKey: position.itemKey, severity, projectedQuantity, reorderPoint: position.reorderPoint };
}

export function deterministicDelayMinutes(seed: string, reliability: number, maxDelayMinutes = 180) {
  const safeReliability = Math.max(0, Math.min(100, reliability));
  const risk = (100 - safeReliability) / 100;
  const roll = deterministicFraction(seed);
  if (roll >= risk) return 0;
  return Math.max(5, Math.round(maxDelayMinutes * risk * (0.35 + deterministicFraction(`${seed}:delay`) * 0.65)));
}

function deterministicFraction(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}
