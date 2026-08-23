import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react';
import type { NpcInteractionAction, NpcInteractionResult, NpcPublicState } from '@sol-dorado/contracts/npcs';
import type { StreetObjectId, StreetSegmentId } from '@sol-dorado/contracts';
import { streetDistance, type StreetPosition } from '@sol-dorado/contracts/world-position';
import { visualFromSeed, type WorldCharacterDirection } from '../../components/WorldCharacter';
import { WorldPedestrian } from '../../components/WorldPedestrian';
import { WorldVehicle } from '../../components/WorldVehicle';
import { useI18n } from '../../i18n';
import { getNearbyNpcs, interactWithNpc, NpcApiError } from '../../lib/npc-api';
import { CanonicalNpcActor } from './CanonicalNpcActor';
import { MarketStreetImageActors } from './MarketStreetImageActors';
import { STREET_POPULATION, type StreetNpcSlot } from './street-population';
import './npc-life.css';
import './market-street-image-actors.css';

const NPC_REACH = 11;
const TRAFFIC_LANE_Y = {
  east: 50.15,
  west: 58.15
} as const;

export function StreetPopulation({ segmentId, visibleObjectIds, playerPosition, onApproach, suppressed = false, onNpcSelected }: {
  segmentId: StreetSegmentId;
  visibleObjectIds: StreetObjectId[];
  playerPosition: StreetPosition;
  onApproach: (position: StreetPosition) => void;
  suppressed?: boolean;
  onNpcSelected?: () => void;
}) {
  const { locale } = useI18n();
  const definition = STREET_POPULATION[segmentId];
  const [npcs, setNpcs] = useState<NpcPublicState[]>([]);
  const [selectedId, setSelectedId] = useState<NpcPublicState['id'] | null>(null);
  const [result, setResult] = useState<NpcInteractionResult | null>(null);
  const [busy, setBusy] = useState<NpcInteractionAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selected = npcs.find(npc => npc.id === selectedId) ?? null;
  const local = <T extends { bg: string; en: string }>(value: T) => value[locale];
  const copy = locale === 'bg' ? bgCopy : enCopy;
  const imageBackedMarket = segmentId === 'market_block_3';

  useEffect(() => {
    let cancelled = false;
    setSelectedId(null);
    setResult(null);
    setError(null);
    void getNearbyNpcs().then(state => {
      if (!cancelled && state.segmentId === segmentId) setNpcs(state.npcs);
    }).catch(() => { if (!cancelled) setNpcs([]); });
    return () => { cancelled = true; };
  }, [segmentId]);

  useEffect(() => {
    if (suppressed) { setSelectedId(null); setResult(null); setError(null); }
  }, [suppressed]);

  function selectNpc(event: MouseEvent<HTMLButtonElement>, npc: NpcPublicState) {
    event.stopPropagation();
    onNpcSelected?.();
    setSelectedId(npc.id);
    setResult(null);
    setError(null);
  }

  async function interact(action: NpcInteractionAction) {
    if (!selected || busy) return;
    setBusy(action);
    setError(null);
    try {
      const next = await interactWithNpc(selected.id, action);
      setResult(next);
      setNpcs(current => current.map(npc => npc.id === next.npc.id ? next.npc : npc));
    } catch (reason) {
      const code = reason instanceof NpcApiError ? reason.code : 'npc_interaction_failed';
      setError(code === 'npc_too_far' ? copy.tooFar : code === 'npc_not_here' ? copy.movedAway : copy.failed);
    } finally { setBusy(null); }
  }

  const inRange = selected ? streetDistance(playerPosition, selected.presence.position) <= NPC_REACH : false;

  return (
    <>
      {imageBackedMarket ? (
        <MarketStreetImageActors />
      ) : (
        <div className="street-population-layer" aria-hidden="true">
          {definition.vehicles.map(vehicle => {
            const moving = vehicle.toX !== undefined;
            const laneY = moving ? TRAFFIC_LANE_Y[vehicle.heading] : vehicle.y;
            const style = {
              '--vehicle-x': `${vehicle.x}%`, '--vehicle-y': `${laneY}%`, '--vehicle-to-x': `${vehicle.toX ?? vehicle.x}%`,
              '--vehicle-duration': `${vehicle.durationSeconds ?? 0}s`, '--vehicle-delay': `${vehicle.delaySeconds ?? 0}s`, '--vehicle-width': `${vehicle.widthPercent ?? 9.6}%`
            } as CSSProperties;
            const serviceProps = { ...(vehicle.service ? { service: vehicle.service } : {}), ...(vehicle.serviceLabel ? { serviceLabel: vehicle.serviceLabel } : {}) };
            return <span key={vehicle.id} className={`street-vehicle-actor ${moving ? 'street-vehicle-actor-moving' : ''} ${vehicle.parked ? 'street-vehicle-actor-parked' : ''}`} style={style} data-actor-kind="vehicle" data-lane={moving ? vehicle.heading : 'parking'}><WorldVehicle type={vehicle.type} color={vehicle.color} heading={vehicle.heading} assetSeed={vehicle.id} {...serviceProps} /></span>;
          })}

          {definition.npcs
            .filter(npc => !npc.namedObjectId && (!npc.namedObjectId || visibleObjectIds.includes(npc.namedObjectId)))
            .map(npc => {
              const moving = npc.toX !== undefined || npc.toY !== undefined;
              const seed = `${segmentId}:${npc.id}`;
              const style = { '--npc-x': `${npc.x}%`, '--npc-y': `${npc.y}%`, '--npc-to-x': `${npc.toX ?? npc.x}%`, '--npc-to-y': `${npc.toY ?? npc.y}%`, '--npc-duration': `${npc.durationSeconds ?? 0}s`, '--npc-delay': `${npc.delaySeconds ?? 0}s` } as CSSProperties;
              const motionClass = moving ? (npc.patrol ? 'street-npc-actor-patrol' : 'street-npc-actor-pass') : '';
              return <span key={npc.id} className={`street-npc-actor ${moving ? 'street-npc-actor-moving' : ''} ${motionClass}`} style={style} data-actor-kind="npc"><WorldPedestrian visual={npc.visual ?? visualFromSeed(seed)} seed={seed} direction={npcDirection(npc)} moving={moving} /></span>;
            })}
        </div>
      )}

      {npcs.map(npc => {
        const near = streetDistance(playerPosition, npc.presence.position) <= NPC_REACH;
        return <CanonicalNpcActor
          key={npc.id}
          npc={npc}
          near={near}
          selected={selectedId === npc.id}
          interactionLabel={copy.inspect}
          talkLabel={copy.talk}
          onSelect={event => selectNpc(event, npc)}
        />;
      })}

      {selected && !suppressed && <aside className="npc-life-panel street-interaction-panel" onClick={event => event.stopPropagation()} aria-label={selected.name}>
        <div className="npc-life-head"><div><span className="npc-life-kicker">{copy.livingCitizen}</span><h3>{selected.name}</h3><div className="npc-life-role">{local(selected.role)}</div></div><button className="npc-life-close" type="button" onClick={() => setSelectedId(null)} aria-label={copy.close}>×</button></div>
        <div className="npc-life-activity"><i />{local(selected.presence.activity)}</div>
        <p className="npc-life-story">{local(selected.story)}</p>
        <div className="npc-life-relation"><span>{copy.met}: {selected.relationship.interactionCount}</span><span>{copy.familiarity}: {relationWord(selected.relationship.familiarity, locale)}</span><span>{copy.mood}: {moodWord(selected.presence.mood, locale)}</span></div>
        {result && <><div className="npc-life-dialogue">{local(result.dialogue)}</div><div className="npc-life-memory">{local(result.memory)}</div>{result.lead && <div className="npc-life-lead"><strong>{local(result.lead.title)}</strong>{local(result.lead.premise)}</div>}</>}
        {error && <div className="npc-life-memory">{error}</div>}
        {!inRange ? <button type="button" className="npc-life-approach" onClick={() => { setError(null); onApproach(selected.presence.position); }}>{copy.approach}</button> : <div className="npc-life-actions"><button className="primary" disabled={Boolean(busy)} onClick={() => void interact('talk')}>{copy.talk}</button><button disabled={Boolean(busy)} onClick={() => void interact('ask_work')}>{copy.work}</button><button disabled={Boolean(busy)} onClick={() => void interact('ask_rumor')}>{copy.rumor}</button></div>}
      </aside>}
    </>
  );
}

function npcDirection(npc: StreetNpcSlot): WorldCharacterDirection {
  if (npc.direction) return npc.direction;
  const dx = (npc.toX ?? npc.x) - npc.x;
  const dy = (npc.toY ?? npc.y) - npc.y;
  if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) > 0.01) return dx > 0 ? 'east' : 'west';
  if (Math.abs(dy) > 0.01) return dy > 0 ? 'south' : 'north';
  return 'south';
}

function relationWord(value: number, locale: 'bg' | 'en') {
  if (locale === 'bg') return value >= 50 ? 'познат човек' : value >= 25 ? 'разпознава те' : value >= 10 ? 'помни те' : 'почти непознат';
  return value >= 50 ? 'familiar' : value >= 25 ? 'recognizes you' : value >= 10 ? 'remembers you' : 'near stranger';
}
function moodWord(mood: NpcPublicState['presence']['mood'], locale: 'bg' | 'en') {
  const bg = { calm: 'спокоен', busy: 'зает', guarded: 'предпазлив', friendly: 'приятелски', tired: 'изморен', alert: 'нащрек' };
  return locale === 'bg' ? bg[mood] : mood;
}

const enCopy = { livingCitizen: 'LIVING CITIZEN', close: 'Close', met: 'Encounters', familiarity: 'Relation', mood: 'Mood', approach: 'Approach', talk: 'Talk', work: 'Ask about work', rumor: 'Ask what is happening', inspect: 'Interact', openInteraction: 'Open interaction', tooFar: 'Move closer before speaking.', movedAway: 'They are no longer here.', failed: 'The conversation could not start.' };
const bgCopy: typeof enCopy = { livingCitizen: 'ЖИВ ЖИТЕЛ', close: 'Затвори', met: 'Срещи', familiarity: 'Отношение', mood: 'Настроение', approach: 'Приближи се', talk: 'Говори', work: 'Попитай за работа', rumor: 'Попитай какво става', inspect: 'Взаимодействай', openInteraction: 'Отвори взаимодействие', tooFar: 'Приближи се, преди да говориш.', movedAway: 'Вече не е тук.', failed: 'Разговорът не можа да започне.' };
