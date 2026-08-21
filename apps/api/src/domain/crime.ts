import type { CrimeOpportunity } from '@sol-dorado/contracts/crime';

export const CRIME_OPPORTUNITIES: readonly CrimeOpportunity[] = [
  { id:'market_shoplift', crimeType:'shoplifting', title:'Corner store blind spot', description:'Small merchandise, short exposure window, clerk and camera risk.', segmentId:'market_block_3', risk:'low', requiredItemKey:null, estimatedValueCents:14500 },
  { id:'market_street_theft', crimeType:'theft', title:'Distracted pedestrian', description:'A quick street theft with uncertain witness attention.', segmentId:'market_block_3', risk:'medium', requiredItemKey:null, estimatedValueCents:26000 },
  { id:'cypress_burglary', crimeType:'burglary', title:'Rear service entrance', description:'A locked commercial back room. Tools lower failure risk but leave tool marks.', segmentId:'cypress_corner', risk:'high', requiredItemKey:'lockpick_set', estimatedValueCents:78000 },
  { id:'cypress_vehicle', crimeType:'vehicle_theft', title:'Parked commuter sedan', description:'A street-parked sedan with an alarm and uncertain owner return time.', segmentId:'cypress_corner', risk:'high', requiredItemKey:'lockpick_set', estimatedValueCents:420000 },
  { id:'alley_burglary', crimeType:'burglary', title:'Warehouse side door', description:'Low foot traffic, stronger lock, valuable electronics inside.', segmentId:'mira_alley', risk:'high', requiredItemKey:'crowbar', estimatedValueCents:92000 }
] as const;

export const CRIME_CONTACTS = [
  { id:'nico_fence', name:'Nico', kind:'fence' as const, segmentId:'mira_alley', feePercent:35, unlockTrust:0 },
  { id:'vela_market', name:'Vela', kind:'black_market' as const, segmentId:'mira_alley', feePercent:20, unlockTrust:5 },
  { id:'casa_azul', name:'Casa Azul', kind:'launderer' as const, segmentId:'cypress_corner', feePercent:28, unlockTrust:10 }
] as const;

export const CONTRABAND_PRICES: Readonly<Record<'lockpick_set'|'scanner_radio'|'burner_phone', number>> = {
  lockpick_set: 9000,
  scanner_radio: 42000,
  burner_phone: 24000
};

export function opportunitiesForSegment(segmentId: string) {
  return CRIME_OPPORTUNITIES.filter(opportunity => opportunity.segmentId === segmentId);
}

export function deterministicCrimeRoll(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
}

export function resolveAttempt(opportunity: CrimeOpportunity, seed: string, hasRequiredTool: boolean) {
  const roll = deterministicCrimeRoll(seed);
  const baseSuccess = opportunity.risk === 'low' ? 78 : opportunity.risk === 'medium' ? 62 : 44;
  const successChance = Math.min(90, baseSuccess + (hasRequiredTool ? 18 : opportunity.requiredItemKey ? -22 : 0));
  const success = roll < successChance;
  const witnessChance = opportunity.risk === 'low' ? 28 : opportunity.risk === 'medium' ? 46 : 65;
  const witnessed = deterministicCrimeRoll(`${seed}:witness`) < witnessChance;
  const camera = deterministicCrimeRoll(`${seed}:camera`) < (opportunity.crimeType === 'shoplifting' ? 70 : 34);
  const recognition = witnessed ? 35 + deterministicCrimeRoll(`${seed}:recognition`) % 51 : camera ? 22 + deterministicCrimeRoll(`${seed}:recognition`) % 35 : 0;
  const policeNotified = witnessed && recognition >= 52 || camera && opportunity.risk === 'high';
  const heatDelta = policeNotified ? (opportunity.risk === 'high' ? 24 : 14) : witnessed ? 8 : 2;
  return { success, witnessed, camera, recognition, policeNotified, heatDelta, roll, successChance };
}
