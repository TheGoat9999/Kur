import type { EmsPriority, EmsTreatment } from '@sol-dorado/contracts/ems';

const TREATMENT_EFFECTS: Record<EmsTreatment, number> = {
  bandage: 5,
  trauma_dressing: 8,
  tourniquet: 10,
  splint: 4,
  oxygen: 5,
  saline: 6,
  cpr: 15
};

const PRIORITY_PAY_CENTS: Record<EmsPriority, number> = {
  p1: 9500,
  p2: 8000,
  p3: 6500,
  p4: 5500
};

export function treatmentEffect(treatment: EmsTreatment) {
  return TREATMENT_EFFECTS[treatment];
}

export function emsCallPayout(priority: EmsPriority, treatmentCount: number) {
  return PRIORITY_PAY_CENTS[priority] + Math.min(2500, Math.max(0, treatmentCount) * 350);
}

export function nextEmsReputation(current: number, priority: EmsPriority, hasAssessment: boolean, treatmentCount: number) {
  const priorityBonus = priority === 'p1' ? 2 : priority === 'p2' ? 1 : 0;
  const processBonus = (hasAssessment ? 1 : 0) + (treatmentCount > 0 ? 1 : 0);
  return Math.max(0, Math.min(100, current + priorityBonus + processBonus));
}
