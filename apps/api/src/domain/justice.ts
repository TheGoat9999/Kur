export interface JusticeChargeRule {
  code: string;
  label: string;
  severity: 'infraction' | 'misdemeanor' | 'felony';
  baseFineCents: number;
  baseJailMinutes: number;
  baseBailCents: number;
}

export const JUSTICE_CHARGE_CATALOG: ReadonlyArray<JusticeChargeRule> = [
  { code: 'SD-101', label: 'Petty Theft', severity: 'misdemeanor', baseFineCents: 35_000, baseJailMinutes: 5, baseBailCents: 50_000 },
  { code: 'SD-201', label: 'Assault', severity: 'misdemeanor', baseFineCents: 75_000, baseJailMinutes: 15, baseBailCents: 150_000 },
  { code: 'SD-301', label: 'Grand Theft', severity: 'felony', baseFineCents: 150_000, baseJailMinutes: 25, baseBailCents: 350_000 },
  { code: 'SD-401', label: 'Evading', severity: 'felony', baseFineCents: 120_000, baseJailMinutes: 20, baseBailCents: 250_000 },
  { code: 'SD-501', label: 'Illegal Weapon Possession', severity: 'felony', baseFineCents: 200_000, baseJailMinutes: 35, baseBailCents: 500_000 },
  { code: 'SD-601', label: 'Reckless Driving', severity: 'misdemeanor', baseFineCents: 60_000, baseJailMinutes: 10, baseBailCents: 100_000 }
];

export function justiceChargeRule(code: string) {
  return JUSTICE_CHARGE_CATALOG.find(rule => rule.code === code) ?? null;
}

export function calculateBail(charges: ReadonlyArray<{ severity: string; count: number; baseBailCents: number }>, priorConvictions: number) {
  const felonyCount = charges.filter(charge => charge.severity === 'felony').reduce((sum, charge) => sum + charge.count, 0);
  const base = charges.reduce((sum, charge) => sum + charge.baseBailCents * charge.count, 0);
  const denied = felonyCount >= 2 && priorConvictions >= 2;
  return { denied, amountCents: denied ? 0 : Math.min(1_500_000, base + priorConvictions * 50_000) };
}

export function npcProsecutionDecision(charges: ReadonlyArray<{ evidenceStrength: number; count: number }>) {
  const totalCount = charges.reduce((sum, charge) => sum + charge.count, 0);
  if (!totalCount) return 'declined' as const;
  const weighted = charges.reduce((sum, charge) => sum + charge.evidenceStrength * charge.count, 0) / totalCount;
  return weighted >= 42 ? 'filed' as const : 'declined' as const;
}

export function npcCourtOutcome(charges: ReadonlyArray<{ evidenceStrength: number; count: number }>) {
  const totalCount = charges.reduce((sum, charge) => sum + charge.count, 0);
  if (!totalCount) return 'not_guilty' as const;
  const weighted = charges.reduce((sum, charge) => sum + charge.evidenceStrength * charge.count, 0) / totalCount;
  if (weighted >= 72) return 'guilty' as const;
  if (weighted >= 52) return 'plea' as const;
  return 'not_guilty' as const;
}

export function calculateSentence(
  charges: ReadonlyArray<{ severity: string; count: number; baseFineCents: number; baseJailMinutes: number }>,
  outcome: 'guilty' | 'plea',
  priorConvictions: number
) {
  const pleaFactor = outcome === 'plea' ? 0.7 : 1;
  const repeatFactor = 1 + Math.min(0.5, priorConvictions * 0.1);
  const fineCents = Math.round(charges.reduce((sum, charge) => sum + charge.baseFineCents * charge.count, 0) * pleaFactor * repeatFactor);
  const jailMinutes = Math.round(charges.reduce((sum, charge) => sum + charge.baseJailMinutes * charge.count, 0) * pleaFactor * repeatFactor);
  const hasFelony = charges.some(charge => charge.severity === 'felony');
  const probationDays = hasFelony ? 7 + Math.min(21, priorConvictions * 3) : priorConvictions >= 2 ? 3 : 0;
  return { fineCents, jailMinutes, probationDays };
}
