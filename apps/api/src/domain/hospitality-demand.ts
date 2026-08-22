export type HospitalityConcept = 'restaurant' | 'cafe' | 'bar' | 'nightclub' | 'bakery';

export interface HospitalityDemandContext {
  businessKey: string;
  district: string;
  timeBucket: number;
  concept: HospitalityConcept;
  reputation: number;
  priceIndexBasisPoints: number;
  capacity: number;
  open: boolean;
}

export interface HospitalityDemandResult {
  requestedCustomers: number;
  demandScore: number;
}

export function calculateHospitalityDemand(context: HospitalityDemandContext): HospitalityDemandResult {
  if (!context.open || context.capacity <= 0) return { requestedCustomers: 0, demandScore: 0 };

  const reputationFactor = clamp(context.reputation, 0, 100) / 100;
  const pricePenalty = clamp((context.priceIndexBasisPoints - 10_000) / 10_000, -0.4, 1);
  const conceptFactor: Record<HospitalityConcept, number> = {
    restaurant: 1,
    cafe: 0.82,
    bar: 0.9,
    nightclub: 1.12,
    bakery: 0.72
  };
  const hour = ((context.timeBucket % 24) + 24) % 24;
  const timeFactor = serviceTimeFactor(context.concept, hour);
  const noise = 0.86 + deterministicFraction(`${context.businessKey}:${context.district}:${context.timeBucket}`) * 0.28;
  const demandScore = clamp(
    (0.45 + reputationFactor * 0.75 - pricePenalty * 0.35) * conceptFactor[context.concept] * timeFactor * noise,
    0,
    2.2
  );

  return {
    requestedCustomers: Math.max(0, Math.min(context.capacity, Math.round(context.capacity * demandScore))),
    demandScore: Math.round(demandScore * 1000) / 1000
  };
}

function serviceTimeFactor(concept: HospitalityConcept, hour: number) {
  if (concept === 'nightclub') return hour >= 22 || hour < 3 ? 1.35 : hour >= 18 ? 0.65 : 0.15;
  if (concept === 'bar') return hour >= 18 ? 1.25 : hour >= 12 ? 0.65 : 0.25;
  if (concept === 'cafe') return hour >= 7 && hour <= 11 ? 1.25 : hour >= 12 && hour <= 17 ? 0.85 : 0.4;
  if (concept === 'bakery') return hour >= 6 && hour <= 11 ? 1.3 : hour <= 16 ? 0.75 : 0.25;
  return hour >= 11 && hour <= 14 ? 1.2 : hour >= 18 && hour <= 21 ? 1.3 : 0.55;
}

function deterministicFraction(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
