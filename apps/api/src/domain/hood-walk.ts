import {
  HOOD_WALK_MAX_STEPS,
  type HoodWalkChoice,
  type HoodWalkEffect,
  type HoodWalkEncounter,
  type HoodWalkEventId,
  type HoodWalkLead,
  type HoodWalkStreetMemory,
  type HoodWalkSummary,
  type HoodWalkTone
} from '@sol-dorado/contracts/hood-walk';

interface ChoiceDefinition extends HoodWalkChoice {
  outcomeId: string;
  effects: HoodWalkEffect[];
  riskyEffects?: HoodWalkEffect[];
}
interface EventDefinition {
  id: HoodWalkEventId;
  tone: HoodWalkTone;
  choices: ChoiceDefinition[];
  segments?: string[];
  minClues?: number;
  minFamiliarity?: number;
}

const effect = (kind: HoodWalkEffect['kind'], amount: number | null = null, itemKey: string | null = null): HoodWalkEffect => ({ kind, amount, itemKey });
const choice = (id: string, risk: HoodWalkChoice['risk'], outcomeId: string, effects: HoodWalkEffect[], riskyEffects?: HoodWalkEffect[]): ChoiceDefinition => ({ id, risk, outcomeId, effects, ...(riskyEffects ? { riskyEffects } : {}) });

export const HOOD_WALK_EVENTS: Readonly<Record<HoodWalkEventId, EventDefinition>> = Object.freeze({
  lost_courier: { id:'lost_courier', tone:'opportunity', choices:[
    choice('guide','safe','courier_guided',[effect('familiarity',2),effect('clue',1),effect('energy',-2)]),
    choice('carry','uncertain','courier_helped',[effect('familiarity',3),effect('momentum',2),effect('energy',-5)]),
    choice('ask_route','safe','courier_route_learned',[effect('clue',2),effect('energy',-1)])
  ]},
  open_garage: { id:'open_garage', tone:'mystery', choices:[
    choice('inspect','safe','garage_pattern_noted',[effect('clue',2),effect('energy',-2)]),
    choice('help_lift','uncertain','garage_helped',[effect('familiarity',2),effect('momentum',1),effect('energy',-5)]),
    choice('snoop','risky','garage_snoop_clean',[effect('clue',2),effect('danger',1),effect('stress',2)], [effect('danger',3),effect('stress',5),effect('police_heat',2)])
  ], segments:['cypress_corner','mira_alley']},
  watchful_stranger: { id:'watchful_stranger', tone:'risky', choices:[
    choice('observe','safe','stranger_observed',[effect('clue',1),effect('stress',1)]),
    choice('approach','uncertain','stranger_contact',[effect('familiarity',1),effect('momentum',1),effect('danger',1),effect('stress',2)]),
    choice('circle_back','risky','stranger_followed',[effect('clue',2),effect('momentum',1),effect('danger',2),effect('energy',-3)], [effect('danger',3),effect('stress',4),effect('police_heat',1)])
  ]},
  slow_patrol: { id:'slow_patrol', tone:'police', choices:[
    choice('keep_walking','safe','patrol_passed',[effect('stress',1)]),
    choice('change_route','uncertain','patrol_avoided',[effect('energy',-2),effect('clue',1),effect('danger',1)]),
    choice('ask_what_happened','risky','patrol_information',[effect('clue',2),effect('stress',2)], [effect('police_heat',2),effect('stress',4),effect('danger',2)])
  ]},
  basement_music: { id:'basement_music', tone:'social', choices:[
    choice('follow_music','uncertain','basement_found',[effect('familiarity',2),effect('momentum',1),effect('energy',-2)]),
    choice('talk_outside','safe','basement_faces',[effect('familiarity',2),effect('clue',1)]),
    choice('keep_moving','safe','music_passed',[effect('energy',-1)])
  ], segments:['market_block_3','mira_alley']},
  corner_argument: { id:'corner_argument', tone:'social', choices:[
    choice('deescalate','uncertain','argument_deescalated',[effect('familiarity',3),effect('momentum',2),effect('stress',2),effect('energy',-2)]),
    choice('back_vendor','risky','vendor_backed',[effect('familiarity',3),effect('momentum',2),effect('danger',2),effect('stress',3)], [effect('danger',4),effect('police_heat',2),effect('stress',5)]),
    choice('observe','safe','argument_observed',[effect('clue',1),effect('familiarity',1)])
  ], segments:['market_block_3','cypress_corner']},
  quiet_cutthrough: { id:'quiet_cutthrough', tone:'calm', choices:[
    choice('read_markings','safe','markings_read',[effect('clue',2),effect('energy',-1)]),
    choice('take_shortcut','uncertain','shortcut_learned',[effect('momentum',1),effect('familiarity',1),effect('energy',-2)]),
    choice('keep_route','safe','quiet_passed',[effect('energy',-1)])
  ]},
  pickup_game: { id:'pickup_game', tone:'social', choices:[
    choice('join','uncertain','game_joined',[effect('familiarity',3),effect('momentum',2),effect('energy',-6),effect('stress',-1)]),
    choice('watch','safe','game_watched',[effect('familiarity',1),effect('clue',1)]),
    choice('pass','safe','game_passed',[effect('energy',-1)])
  ], segments:['market_block_3','cypress_corner']},
  dog_loose: { id:'dog_loose', tone:'opportunity', choices:[
    choice('help_owner','uncertain','dog_returned',[effect('familiarity',3),effect('momentum',1),effect('energy',-4)]),
    choice('block_traffic','safe','dog_protected',[effect('familiarity',2),effect('energy',-2),effect('stress',1)]),
    choice('keep_distance','safe','dog_passed',[effect('energy',-1)])
  ]},
  dumpster_glint: { id:'dumpster_glint', tone:'mystery', choices:[
    choice('check','uncertain','dumpster_useful_find',[effect('item',1,'water_bottle'),effect('momentum',1),effect('energy',-2)], [effect('item',1,'duct_tape'),effect('danger',1),effect('stress',1)]),
    choice('look_only','safe','dumpster_scanned',[effect('clue',1)]),
    choice('leave','safe','dumpster_left',[effect('energy',-1)])
  ], segments:['mira_alley','cypress_corner']},
  pattern_spotted: { id:'pattern_spotted', tone:'opportunity', minClues:2, choices:[
    choice('follow_pattern','uncertain','pattern_confirmed',[effect('momentum',2),effect('familiarity',2),effect('clue',1),effect('energy',-2)]),
    choice('mark_route','safe','route_marked',[effect('clue',2),effect('familiarity',1)]),
    choice('ignore','safe','pattern_ignored',[effect('energy',-1)])
  ]},
  local_recognition: { id:'local_recognition', tone:'social', minFamiliarity:8, choices:[
    choice('stop_talk','safe','recognized_chat',[effect('familiarity',2),effect('momentum',2),effect('stress',-1)]),
    choice('ask_whats_new','uncertain','recognized_tip',[effect('clue',2),effect('familiarity',1)]),
    choice('nod_move','safe','recognized_nod',[effect('familiarity',1)])
  ]}
});

const EVENT_IDS = Object.keys(HOOD_WALK_EVENTS) as HoodWalkEventId[];
const ANCHORS = [
  [{x:18,y:38},{x:50,y:54},{x:80,y:35}],
  [{x:13,y:60},{x:47,y:34},{x:77,y:61}],
  [{x:22,y:29},{x:58,y:63},{x:84,y:47}],
  [{x:15,y:48},{x:50,y:28},{x:82,y:66}],
  [{x:26,y:64},{x:55,y:42},{x:78,y:28}]
] as const;

export function buildHoodWalkLeads(input: { seed: number; step: number; segmentId: string; clues: number; memory: HoodWalkStreetMemory; seenEventIds: HoodWalkEventId[] }): HoodWalkLead[] {
  const recent = new Set([...input.memory.recentEventIds.slice(-5), ...input.seenEventIds]);
  let candidates = EVENT_IDS.filter(id => {
    const event = HOOD_WALK_EVENTS[id];
    return (!event.segments || event.segments.includes(input.segmentId))
      && (event.minClues ?? 0) <= input.clues
      && (event.minFamiliarity ?? 0) <= input.memory.familiarity;
  });
  const fresh = candidates.filter(id => !recent.has(id));
  if (fresh.length >= 3) candidates = fresh;
  const ranked = [...candidates].sort((a,b) => seededValue(input.seed, input.step, a) - seededValue(input.seed, input.step, b));
  const selected = ranked.slice(0,3);
  const anchors = ANCHORS[input.step % ANCHORS.length]!;
  const clarity = input.memory.familiarity >= 25 || input.clues >= 4 ? 'clear' : input.memory.familiarity >= 8 || input.clues >= 2 ? 'readable' : 'vague';
  return selected.map((eventId,index) => ({
    id:`${input.step}:${eventId}`,
    eventId,
    tone:HOOD_WALK_EVENTS[eventId].tone,
    clarity,
    anchor:{...anchors[index]!}
  }));
}

export function buildHoodWalkEncounter(runId: string, step: number, lead: HoodWalkLead): HoodWalkEncounter {
  const event = HOOD_WALK_EVENTS[lead.eventId];
  return { id:`${runId}:${step}:${lead.eventId}`, eventId:event.id, tone:event.tone, choices:event.choices.map(({id,risk}) => ({id,risk})) };
}

export function resolveHoodWalkChoice(input: { seed:number; step:number; eventId:HoodWalkEventId; choiceId:string; danger:number }) {
  const event = HOOD_WALK_EVENTS[input.eventId];
  const selected = event.choices.find(item => item.id === input.choiceId);
  if (!selected) return null;
  const risky = Boolean(selected.riskyEffects) && ((seededValue(input.seed + input.danger * 31, input.step, `${input.eventId}:${input.choiceId}`) % 100) < 34 + input.danger * 3);
  return {
    eventId: input.eventId,
    choiceId: selected.id,
    outcomeId: risky ? `${selected.outcomeId}_complication` : selected.outcomeId,
    effects: risky ? selected.riskyEffects! : selected.effects
  };
}

export function summarizeHoodWalk(input:{ reason:HoodWalkSummary['reason']; step:number; momentum:number; danger:number; clues:number; memory:HoodWalkStreetMemory }): HoodWalkSummary {
  const score = Math.max(0, input.momentum * 3 + input.clues * 2 + Math.min(10,input.memory.familiarity) - input.danger * 2 + input.step);
  const grade = input.danger >= 6 && score >= 18 ? 'wild' : input.memory.familiarity >= 12 && input.momentum >= 4 ? 'connected' : input.clues >= 4 ? 'sharp' : 'quiet';
  const discoveries: HoodWalkSummary['discoveries'] = [];
  if (input.memory.familiarity >= 8) discoveries.push('faces');
  if (input.clues >= 3) discoveries.push('routes');
  if (input.danger >= 3) discoveries.push('pressure');
  return { reason:input.reason, grade, score, encounters:Math.min(HOOD_WALK_MAX_STEPS,input.step), discoveries };
}

function seededValue(seed:number, step:number, key:string) {
  let hash = (seed ^ Math.imul(step + 1, 0x45d9f3b)) | 0;
  for (let index=0; index<key.length; index+=1) hash = Math.imul(hash ^ key.charCodeAt(index), 16777619);
  hash ^= hash >>> 16;
  return hash >>> 0;
}
