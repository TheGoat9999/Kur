import type { HudState, WorldActionId } from '@sol-dorado/contracts';

export interface MutablePlayerState extends HudState { streetSegment: string; }
export interface ActionOutcome { title: string; feedback: string; next: MutablePlayerState; }
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function applyWorldAction(current: MutablePlayerState, actionId: WorldActionId, random = Math.random): ActionOutcome {
  const next = { ...current };
  if (actionId === 'walk_market_street') {
    next.energy = clamp(next.energy - 2);
    next.hydration = clamp(next.hydration - 1);
    next.streetSegment = 'Market Street / Block 3';
    return { title: 'Market Street', feedback: 'You reach the market block on foot. The district is active around you.', next };
  }
  if (actionId === 'work_delivery_shift') {
    next.energy = clamp(next.energy - 8);
    next.satiety = clamp(next.satiety - 3);
    next.hydration = clamp(next.hydration - 5);
    next.cashCents += 8_500;
    return { title: 'Delivery completed', feedback: 'The restaurant signs off the delivery and pays you $85 cash.', next };
  }
  const witnessed = random() < 0.42;
  next.cashCents += witnessed ? 1_200 : 3_500;
  next.stress = clamp(next.stress + (witnessed ? 18 : 8));
  next.policeHeat = clamp(next.policeHeat + (witnessed ? 22 : 4));
  return witnessed
    ? { title: 'Witnessed', feedback: 'A clerk sees you leave. You keep part of the score, but a description reaches dispatch.', next }
    : { title: 'Clean exit', feedback: 'You leave with $35 in goods before anyone connects you to the loss.', next };
}
