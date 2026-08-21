import type { Pool, PoolClient } from 'pg';
import {
  NearbyNpcsStateSchema,
  NpcInteractionResultSchema,
  NpcPublicStateSchema,
  type LocalizedNpcText,
  type NpcId,
  type NpcInteractionAction,
  type NpcMissionHook,
  type NpcPresence,
  type NpcPublicState,
  type NpcRelationship
} from '@sol-dorado/contracts/npcs';
import { streetDistance, type StreetPosition } from '@sol-dorado/contracts/world-position';
import { getStreetPosition } from './street-world.js';

type Queryable = Pool | PoolClient;

type ScheduleSlot = {
  startHour: number;
  endHour: number;
  segmentId: NpcPresence['segmentId'];
  position: StreetPosition;
  intent: NpcPresence['intent'];
  activity: LocalizedNpcText;
  mood: NpcPresence['mood'];
};

type NpcProfile = Omit<NpcPublicState, 'presence' | 'relationship' | 'missionHooks'> & {
  schedule: ScheduleSlot[];
  missionHooks: Array<Omit<NpcMissionHook, 'status'>>;
};

export class NpcCommandError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
  }
}

const text = (bg: string, en: string): LocalizedNpcText => ({ bg, en });

export const NPC_PROFILES: Record<NpcId, NpcProfile> = {
  maya_rojas: {
    id: 'maya_rojas', name: 'Maya Rojas', nickname: 'Maya', archetype: 'connector', traits: ['observant', 'social', 'loyal'],
    role: text('Квартален посредник', 'Neighborhood connector'),
    story: text('Израснала е около Cypress Corner и знае кой на кого дължи услуга. Не продава информация евтино, но помни хората, които са коректни с нея.', 'She grew up around Cypress Corner and knows who owes whom a favor. She does not trade information cheaply, but remembers people who treat her fairly.'),
    schedule: [
      slot(6, 12, 'cypress_corner', 62, 72, 'socialize', 'Говори с хората пред блока', 'Talking with people outside the apartments', 'friendly'),
      slot(12, 16, 'market_block_3', 51, 42, 'errand', 'Обикаля магазините и урежда дребни задачи', 'Running errands and arranging small favors', 'busy'),
      slot(16, 24, 'cypress_corner', 62, 72, 'socialize', 'Следи какво се случва в квартала', 'Keeping an eye on the neighborhood', 'calm'),
      slot(0, 6, 'cypress_corner', 49, 42, 'off_duty', 'Прибира се след дълъг ден', 'Heading home after a long day', 'tired')
    ],
    missionHooks: [hook('maya-neighborhood-intro', 'Услуга за квартала', 'A neighborhood favor', 'Maya намеква, че скоро ще има нужда от надежден човек за дребна услуга.', 'Maya hints she will soon need someone reliable for a small neighborhood favor.', 'missions')]
  },
  rafael_vega: {
    id: 'rafael_vega', name: 'Rafael Vega', nickname: 'Rafa', archetype: 'merchant', traits: ['practical', 'observant', 'cautious'],
    role: text('Продавач в Mercado 24', 'Mercado 24 clerk'),
    story: text('Рафа държи нощните смени и вижда повече от камерите. Предпочита спокойни клиенти и мрази хора, които носят проблеми до вратата му.', 'Rafa works the late shifts and sees more than the cameras do. He prefers quiet customers and hates people who bring trouble to his door.'),
    schedule: [
      slot(7, 15, 'market_block_3', 80, 42, 'work', 'Подрежда стока и обслужва Mercado 24', 'Stocking shelves and serving Mercado 24', 'busy'),
      slot(15, 17, 'cypress_corner', 78, 42, 'break', 'Пие кафе далеч от магазина', 'Taking a coffee break away from the store', 'calm'),
      slot(17, 24, 'market_block_3', 80, 42, 'work', 'Пази око върху магазина и улицата', 'Watching the store and the street', 'guarded'),
      slot(0, 7, 'market_block_3', 80, 42, 'work', 'Кара тиха нощна смяна', 'Working the quiet night shift', 'tired')
    ],
    missionHooks: [hook('rafa-stock-problem', 'Проблем с доставката', 'Delivery problem', 'Една от доставките на магазина не пристига навреме и Рафа започва да задава въпроси.', 'One of the store deliveries is late and Rafa starts asking questions.', 'logistics')]
  },
  elena_cruz: {
    id: 'elena_cruz', name: 'Elena Cruz', nickname: null, archetype: 'operator', traits: ['ambitious', 'practical', 'social'],
    role: text('Управител на El Camino', 'El Camino manager'),
    story: text('Елена превръща малкия семеен ресторант в сериозен бизнес. Търси хора, които идват навреме, не крадат от склада и могат да мислят под напрежение.', 'Elena is turning a small family restaurant into a serious business. She values people who show up on time, do not steal from storage, and can think under pressure.'),
    schedule: [
      slot(8, 11, 'mira_alley', 79, 35, 'errand', 'Проверява сутрешните доставки', 'Checking the morning deliveries', 'busy'),
      slot(11, 23, 'market_block_3', 20, 42, 'work', 'Ръководи смяната в El Camino', 'Running the shift at El Camino', 'alert'),
      slot(23, 24, 'mira_alley', 79, 35, 'errand', 'Затваря доставките за деня', 'Closing out deliveries for the day', 'tired'),
      slot(0, 8, 'market_block_3', 20, 42, 'off_duty', 'Подготвя се за следващия ден', 'Preparing for the next day', 'calm')
    ],
    missionHooks: [hook('elena-first-shift', 'Пробна смяна', 'Trial shift', 'Елена може да отвори път към реална работа в ресторанта, когато hospitality системата е готова.', 'Elena can open a path to real restaurant work once the hospitality system is ready.', 'hospitality')]
  },
  tomas_ibarra: {
    id: 'tomas_ibarra', name: 'Tomás Ibarra', nickname: 'Tom', archetype: 'craftsperson', traits: ['practical', 'private', 'loyal'],
    role: text('Механик на свободна практика', 'Independent mechanic'),
    story: text('Томас работи зад сервизните врати в Mira Alley и приема само работа, която може да приключи както трябва. Репутацията му е по-важна от бързите пари.', 'Tomás works behind the service doors in Mira Alley and only takes jobs he can finish properly. His reputation matters more than quick money.'),
    schedule: [
      slot(7, 19, 'mira_alley', 50, 52, 'work', 'Работи по автомобил зад сервиза', 'Working on a car behind the service shop', 'busy'),
      slot(19, 22, 'market_block_3', 35, 67, 'errand', 'Търси части и инструменти', 'Looking for parts and tools', 'calm'),
      slot(22, 24, 'mira_alley', 50, 52, 'off_duty', 'Прибира инструментите', 'Putting the tools away', 'tired'),
      slot(0, 7, 'mira_alley', 50, 52, 'off_duty', 'Сервизът е затворен, но лампата още свети', 'The shop is closed, but one light is still on', 'guarded')
    ],
    missionHooks: [hook('tomas-parts-run', 'Липсващи части', 'Missing parts', 'Томас ще има нужда от човек за части, когато механик и supply-chain gameplay са свързани.', 'Tomás will need someone to source parts once mechanic and supply-chain gameplay are connected.', 'mechanic')]
  },
  darius_cole: {
    id: 'darius_cole', name: 'Darius Cole', nickname: 'D', archetype: 'courier', traits: ['restless', 'observant', 'ambitious'],
    role: text('Градски куриер', 'City courier'),
    story: text('Дариус познава преките пътища между кварталите и почти никога не задава въпроси за пакетите. Иска собствена логистична фирма, но още кара чужди маршрути.', 'Darius knows the shortcuts between districts and almost never asks questions about packages. He wants his own logistics company but still runs other people’s routes.'),
    schedule: [
      slot(6, 10, 'mira_alley', 42, 70, 'work', 'Товари сутрешен маршрут', 'Loading the morning route', 'busy'),
      slot(10, 18, 'market_block_3', 72, 67, 'commute', 'Минава между доставки', 'Moving between deliveries', 'alert'),
      slot(18, 22, 'cypress_corner', 75, 67, 'socialize', 'Почива след маршрута', 'Unwinding after the route', 'friendly'),
      slot(22, 24, 'mira_alley', 42, 70, 'errand', 'Връща служебния бус', 'Returning the work van', 'tired'),
      slot(0, 6, 'mira_alley', 42, 70, 'off_duty', 'Чака първото товарене', 'Waiting for the first load', 'calm')
    ],
    missionHooks: [hook('darius-route-help', 'Маршрут под напрежение', 'Route under pressure', 'Дариус намеква за доставки, които ще имат смисъл, когато jobs и logistics системите са активни.', 'Darius hints at delivery work that will matter once jobs and logistics systems are active.', 'jobs')]
  },
  nina_park: {
    id: 'nina_park', name: 'Nina Park', nickname: null, archetype: 'observer', traits: ['observant', 'private', 'cautious'],
    role: text('Фотограф и квартален хроникьор', 'Photographer and neighborhood chronicler'),
    story: text('Нина снима улиците за малък независим сайт. Вижда модели, които другите пропускат, но рядко казва какво знае, преди да разбере защо го питаш.', 'Nina photographs the streets for a small independent site. She notices patterns others miss, but rarely says what she knows before understanding why you are asking.'),
    schedule: [
      slot(7, 13, 'cypress_corner', 42, 42, 'work', 'Снима сутрешния квартален ритъм', 'Photographing the morning neighborhood rhythm', 'calm'),
      slot(13, 18, 'market_block_3', 51, 42, 'work', 'Наблюдава движението около пазара', 'Watching the flow around the market', 'alert'),
      slot(18, 23, 'cypress_corner', 42, 42, 'socialize', 'Преглежда снимки на пейката', 'Reviewing photos on a bench', 'friendly'),
      slot(23, 24, 'mira_alley', 65, 52, 'errand', 'Прави последни кадри за деня', 'Taking the last shots of the day', 'guarded'),
      slot(0, 7, 'cypress_corner', 42, 42, 'off_duty', 'Подрежда архивите си', 'Organizing her archive', 'tired')
    ],
    missionHooks: [hook('nina-pattern', 'Повтарящ се модел', 'A repeating pattern', 'Нина е забелязала нещо странно по улиците, което по-късно може да захрани investigation gameplay.', 'Nina has noticed something odd on the streets that can later feed investigation gameplay.', 'police-investigation')]
  }
};

export function getSolDoradoHour(now = new Date()): number {
  const hour = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', hourCycle: 'h23' }).format(now);
  return Number(hour);
}

export function resolveNpcPresence(profile: NpcProfile, now = new Date()): NpcPresence {
  const hour = getSolDoradoHour(now);
  const current = profile.schedule.find(entry => hour >= entry.startHour && hour < entry.endHour) ?? profile.schedule[0]!;
  return {
    segmentId: current.segmentId,
    position: current.position,
    intent: current.intent,
    activity: current.activity,
    mood: current.mood,
    available: true
  };
}

export async function getNearbyNpcs(db: Queryable, playerId: string, now = new Date()) {
  const spatial = await getStreetPosition(db, playerId);
  const relationships = await getRelationshipMap(db, playerId);
  const npcs = Object.values(NPC_PROFILES)
    .map(profile => buildPublicState(profile, relationships.get(profile.id) ?? emptyRelationship(), now))
    .filter(npc => npc.presence.available && npc.presence.segmentId === spatial.segmentId);
  return NearbyNpcsStateSchema.parse({ serverTime: now.toISOString(), segmentId: spatial.segmentId, npcs });
}

export async function interactWithNpc(db: Pool, playerId: string, npcId: NpcId, action: NpcInteractionAction, now = new Date()) {
  const profile = NPC_PROFILES[npcId];
  if (!profile) throw new NpcCommandError('npc_not_found', 404);
  const spatial = await getStreetPosition(db, playerId);
  const presence = resolveNpcPresence(profile, now);
  if (!presence.available || presence.segmentId !== spatial.segmentId) throw new NpcCommandError('npc_not_here', 409);
  if (streetDistance(spatial.position, presence.position) > 11) throw new NpcCommandError('npc_too_far', 409);

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const current = await lockRelationship(client, playerId, npcId);
    const rapidRepeat = current.lastInteractionAt !== null && now.getTime() - new Date(current.lastInteractionAt).getTime() < 45_000;
    const next = evolveRelationship(current, action, rapidRepeat, now);
    await client.query({
      text: `
        INSERT INTO npc_relationships
          (player_id, npc_id, familiarity, trust, respect, interaction_count, last_interaction_at, last_topic, memory, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, now())
        ON CONFLICT (player_id, npc_id) DO UPDATE SET
          familiarity = EXCLUDED.familiarity,
          trust = EXCLUDED.trust,
          respect = EXCLUDED.respect,
          interaction_count = EXCLUDED.interaction_count,
          last_interaction_at = EXCLUDED.last_interaction_at,
          last_topic = EXCLUDED.last_topic,
          memory = EXCLUDED.memory,
          updated_at = now()
      `,
      values: [playerId, npcId, next.familiarity, next.trust, next.respect, next.interactionCount, next.lastInteractionAt, next.lastTopic, JSON.stringify({ lastTopic: action })]
    });
    await client.query(
      'INSERT INTO npc_interaction_log (player_id, npc_id, action, segment_id, context) VALUES ($1, $2, $3, $4, $5::jsonb)',
      [playerId, npcId, action, spatial.segmentId, JSON.stringify({ intent: presence.intent, mood: presence.mood, rapidRepeat })]
    );
    await client.query('COMMIT');

    const npc = buildPublicState(profile, next, now);
    const dialogue = chooseDialogue(profile, next, action, rapidRepeat);
    const lead = action === 'ask_work' || action === 'ask_rumor' ? npc.missionHooks[0] ?? null : null;
    return NpcInteractionResultSchema.parse({
      npc,
      action,
      dialogue,
      memory: memoryCopy(next, rapidRepeat),
      lead
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function buildPublicState(profile: NpcProfile, relationship: NpcRelationship, now: Date): NpcPublicState {
  const missionHooks = profile.missionHooks.map(item => ({
    ...item,
    status: relationship.familiarity >= 15 ? 'available_later' as const : 'foreshadowed' as const
  }));
  return NpcPublicStateSchema.parse({
    id: profile.id,
    name: profile.name,
    nickname: profile.nickname,
    role: profile.role,
    story: profile.story,
    archetype: profile.archetype,
    traits: profile.traits,
    presence: resolveNpcPresence(profile, now),
    relationship,
    missionHooks
  });
}

async function getRelationshipMap(db: Queryable, playerId: string) {
  const result = await db.query(
    'SELECT npc_id, familiarity, trust, respect, interaction_count, last_interaction_at, last_topic FROM npc_relationships WHERE player_id = $1',
    [playerId]
  );
  const map = new Map<NpcId, NpcRelationship>();
  for (const row of result.rows) map.set(row.npc_id as NpcId, mapRelationship(row));
  return map;
}

async function lockRelationship(client: PoolClient, playerId: string, npcId: NpcId): Promise<NpcRelationship> {
  const result = await client.query(
    'SELECT familiarity, trust, respect, interaction_count, last_interaction_at, last_topic FROM npc_relationships WHERE player_id = $1 AND npc_id = $2 FOR UPDATE',
    [playerId, npcId]
  );
  return result.rows[0] ? mapRelationship(result.rows[0]) : emptyRelationship();
}

function mapRelationship(row: Record<string, unknown>): NpcRelationship {
  return {
    familiarity: Number(row.familiarity ?? 0),
    trust: Number(row.trust ?? 0),
    respect: Number(row.respect ?? 0),
    interactionCount: Number(row.interaction_count ?? 0),
    lastInteractionAt: row.last_interaction_at ? new Date(row.last_interaction_at as string | Date).toISOString() : null,
    lastTopic: (row.last_topic as NpcInteractionAction | null) ?? null
  };
}

function emptyRelationship(): NpcRelationship {
  return { familiarity: 0, trust: 0, respect: 0, interactionCount: 0, lastInteractionAt: null, lastTopic: null };
}

function evolveRelationship(current: NpcRelationship, action: NpcInteractionAction, rapidRepeat: boolean, now: Date): NpcRelationship {
  const familiarityGain = rapidRepeat ? 1 : action === 'talk' ? 5 : action === 'ask_work' ? 4 : 3;
  const trustGain = rapidRepeat ? 0 : action === 'ask_work' ? 1 : action === 'ask_rumor' && current.familiarity >= 10 ? 1 : 0;
  const respectGain = rapidRepeat ? 0 : action === 'ask_work' && current.interactionCount >= 2 ? 1 : 0;
  return {
    familiarity: Math.min(100, current.familiarity + familiarityGain),
    trust: Math.min(100, current.trust + trustGain),
    respect: Math.min(100, current.respect + respectGain),
    interactionCount: current.interactionCount + 1,
    lastInteractionAt: now.toISOString(),
    lastTopic: action
  };
}

function chooseDialogue(profile: NpcProfile, relationship: NpcRelationship, action: NpcInteractionAction, rapidRepeat: boolean): LocalizedNpcText {
  if (rapidRepeat) return text('„Още съм тук. Дай ми минута и после пак говорим.“', '“I am still here. Give me a minute and we can talk again.”');
  if (action === 'talk') {
    if (relationship.interactionCount <= 1) return text(`„${profile.nickname ?? profile.name}. Запомни името, ако ще се въртиш наоколо.“`, `“${profile.nickname ?? profile.name}. Remember the name if you are going to be around.”`);
    if (relationship.familiarity >= 25) return text('„Вече те разпознавам. Градът става по-малък, когато започнеш да познаваш правилните хора.“', '“I recognize you now. The city gets smaller once you start knowing the right people.”');
    return text('„Пак се засичаме. Това вече не е случайност.“', '“We keep running into each other. That is not a coincidence anymore.”');
  }
  if (action === 'ask_work') {
    if (relationship.familiarity < 10) return text('„Работа има винаги. Въпросът е дали някой ще заложи името си за теб. Първо се покажи като човек.“', '“There is always work. The question is whether someone will put their name behind you. Show people who you are first.”');
    return text('„Имам нещо предвид за теб, но още не е моментът. Като се подредят нещата, ще знаеш къде да ме намериш.“', '“I have something in mind for you, but the timing is not right yet. When things line up, you will know where to find me.”');
  }
  if (relationship.trust <= 0 && relationship.familiarity < 10) return text('„Слухове? В този град слуховете струват повече от кафето. Първо трябва да знам кой пита.“', '“Rumors? In this city they cost more than coffee. First I need to know who is asking.”');
  return text('„Има движение под повърхността. Нищо, за което да тичаш още, но си дръж очите отворени.“', '“There is movement under the surface. Nothing to run toward yet, but keep your eyes open.”');
}

function memoryCopy(relationship: NpcRelationship, rapidRepeat: boolean): LocalizedNpcText {
  if (rapidRepeat) return text('Разговорът е твърде скорошен, за да промени сериозно отношението.', 'The conversation is too recent to meaningfully change the relationship.');
  if (relationship.interactionCount === 1) return text('NPC-ът вече те е виждал и ще помни следващата среща.', 'The NPC has seen you now and will remember the next meeting.');
  if (relationship.familiarity >= 25) return text('Вече не си случаен минувач за този човек.', 'You are no longer a random passerby to this person.');
  return text('Познанството се натрупва постепенно от реалните ви срещи.', 'Familiarity is building gradually from your actual encounters.');
}

function slot(startHour: number, endHour: number, segmentId: NpcPresence['segmentId'], x: number, y: number, intent: NpcPresence['intent'], bg: string, en: string, mood: NpcPresence['mood']): ScheduleSlot {
  return { startHour, endHour, segmentId, position: { x, y }, intent, activity: text(bg, en), mood };
}

function hook(id: string, bgTitle: string, enTitle: string, bgPremise: string, enPremise: string, requiredFeature: string): Omit<NpcMissionHook, 'status'> {
  return { id, title: text(bgTitle, enTitle), premise: text(bgPremise, enPremise), requiredFeature };
}
