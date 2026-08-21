export type NeedVitals = { health:number; energy:number; satiety:number; hydration:number; stress:number };

export function applyNeedsTicks(vitals: NeedVitals, ticks: number, bleeding: number) {
  const count = Math.max(0, Math.min(96, Math.floor(ticks)));
  let next = { ...vitals };
  for (let index = 0; index < count; index += 1) {
    next.satiety = Math.max(0, next.satiety - 1);
    next.hydration = Math.max(0, next.hydration - 2);
    next.energy = Math.max(0, next.energy - 1);
    let damage = bleeding === 1 ? 1 : bleeding === 2 ? 2 : bleeding >= 3 ? 4 : 0;
    if (next.satiety <= 15 && index % 2 === 0) damage += 1;
    if (next.hydration <= 15) damage += 2;
    if (next.energy <= 10) next.stress = Math.min(100, next.stress + 1);
    if (next.satiety <= 15 || next.hydration <= 15) next.stress = Math.min(100, next.stress + 1);
    next.health = Math.max(0, next.health - damage);
  }
  return next;
}

export function shouldBeUnconscious(vitals: NeedVitals, bleeding: number) {
  return vitals.health === 0 || (vitals.health <= 12 && bleeding >= 2) || (vitals.hydration === 0 && vitals.energy === 0);
}

export const NEEDS_TICK_MINUTES = 15;
