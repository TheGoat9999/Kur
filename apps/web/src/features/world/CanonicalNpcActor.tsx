import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent } from 'react';
import type { NpcPublicState } from '@sol-dorado/contracts/npcs';
import type { StreetPosition } from '@sol-dorado/contracts/world-position';
import { visualFromSeed, type WorldCharacterDirection } from '../../components/WorldCharacter';
import { WorldPedestrian } from '../../components/WorldPedestrian';

type VisualMotion = {
  position: StreetPosition;
  direction: WorldCharacterDirection;
  moving: boolean;
  durationMs: number;
};

export function CanonicalNpcActor({ npc, near, selected, interactionLabel, talkLabel, onSelect }: {
  npc: NpcPublicState;
  near: boolean;
  selected: boolean;
  interactionLabel: string;
  talkLabel: string;
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const route = useMemo(() => buildCanonicalNpcRoute(npc), [
    npc.id,
    npc.presence.intent,
    npc.presence.position.x,
    npc.presence.position.y
  ]);
  const anchor = route[0] ?? npc.presence.position;
  const [motion, setMotion] = useState<VisualMotion>(() => ({
    position: anchor,
    direction: 'south',
    moving: false,
    durationMs: 0
  }));

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    let index = 0;
    const first = route[0] ?? npc.presence.position;

    if (selected) {
      // Freeze where the player clicked the NPC. Do not teleport the actor back
      // to its anchor while the interaction panel is open.
      setMotion(current => ({ ...current, moving: false, durationMs: 0 }));
      return () => undefined;
    }

    setMotion({ position: first, direction: 'south', moving: false, durationMs: 0 });
    if (route.length < 2) return () => undefined;

    const schedulePause = (initial = false) => {
      if (cancelled) return;
      setMotion(current => ({ ...current, moving: false, durationMs: 0 }));
      const jitter = stableHash(`${npc.id}:${index}`) % 900;
      const pauseMs = (initial ? 900 : 1200) + jitter;
      timer = window.setTimeout(walkNextLeg, pauseMs);
    };

    const walkNextLeg = () => {
      if (cancelled) return;
      const from = route[index] ?? first;
      const nextIndex = (index + 1) % route.length;
      const to = route[nextIndex] ?? first;
      const distance = Math.max(0.1, Math.hypot(to.x - from.x, to.y - from.y));
      const durationMs = Math.round(Math.max(900, distance * 680));
      setMotion({
        position: to,
        direction: directionBetween(from, to),
        moving: true,
        durationMs
      });
      timer = window.setTimeout(() => {
        index = nextIndex;
        schedulePause();
      }, durationMs + 40);
    };

    schedulePause(true);
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [npc.id, npc.presence.intent, npc.presence.position.x, npc.presence.position.y, route, selected]);

  const seed = `canonical:${npc.id}`;
  const style = {
    left: `${motion.position.x}%`,
    top: `${motion.position.y}%`,
    '--canonical-walk-duration': `${motion.durationMs}ms`
  } as CSSProperties;

  return (
    <button
      type="button"
      className={`street-npc-canonical ${motion.moving ? 'street-npc-canonical-walking' : 'street-npc-canonical-idle'} ${near ? 'near' : ''} ${selected ? 'selected' : ''}`}
      style={style}
      onClick={onSelect}
      aria-label={`${npc.name} · ${interactionLabel}`}
    >
      <WorldPedestrian
        visual={visualFromSeed(seed)}
        seed={seed}
        direction={motion.direction}
        moving={motion.moving}
      />
      <span className="street-npc-name">{npc.nickname ?? npc.name.split(' ')[0]}</span>
      <span className="street-npc-interact-hint">{near ? talkLabel : interactionLabel}</span>
    </button>
  );
}

export function buildCanonicalNpcRoute(npc: NpcPublicState): StreetPosition[] {
  const anchor = npc.presence.position;
  const radius = {
    work: 1.25,
    commute: 2.8,
    break: 0.65,
    socialize: 1.6,
    errand: 2.2,
    off_duty: 0
  }[npc.presence.intent];

  if (radius <= 0) return [{ ...anchor }];

  const hash = stableHash(npc.id);
  const sign = hash % 2 === 0 ? 1 : -1;
  const verticalSign = hash % 3 === 0 ? 1 : -1;
  const lateral = radius * sign;
  const cross = Math.min(0.8, Math.max(0.35, radius * 0.28)) * verticalSign;
  const back = radius * 0.65 * -sign;

  // Small local loop instead of a ping-pong line. It keeps the rendered actor
  // close to the server-authoritative interaction anchor while still making
  // working/social NPCs feel occupied rather than frozen in place.
  return dedupeRoute([
    { ...anchor },
    clampPosition({ x: anchor.x + lateral, y: anchor.y }),
    clampPosition({ x: anchor.x + lateral, y: anchor.y + cross }),
    clampPosition({ x: anchor.x + back, y: anchor.y + cross }),
    clampPosition({ x: anchor.x + back, y: anchor.y }),
    { ...anchor }
  ]);
}

function directionBetween(from: StreetPosition, to: StreetPosition): WorldCharacterDirection {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'east' : 'west';
  return dy >= 0 ? 'south' : 'north';
}

function dedupeRoute(route: StreetPosition[]) {
  return route.filter((point, index) => index === 0 || Math.hypot(point.x - route[index - 1]!.x, point.y - route[index - 1]!.y) > 0.08);
}

function clampPosition(position: StreetPosition): StreetPosition {
  return { x: clamp(position.x, 3, 97), y: clamp(position.y, 3, 97) };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
