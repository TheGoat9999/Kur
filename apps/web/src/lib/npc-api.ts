import {
  NearbyNpcsStateSchema,
  NpcInteractionResultSchema,
  type NearbyNpcsState,
  type NpcId,
  type NpcInteractionAction,
  type NpcInteractionResult
} from '@sol-dorado/contracts/npcs';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'sd_session_token_v1';

export class NpcApiError extends Error {
  constructor(public readonly code: string) { super(code); }
}

export async function getNearbyNpcs(): Promise<NearbyNpcsState> {
  const response = await npcFetch('/v1/npcs/nearby');
  if (!response.ok) throw new NpcApiError(await errorCode(response, 'npc_load_failed'));
  return NearbyNpcsStateSchema.parse(await response.json());
}

export async function interactWithNpc(npcId: NpcId, action: NpcInteractionAction): Promise<NpcInteractionResult> {
  const response = await npcFetch(`/v1/npcs/${npcId}/interact`, { method: 'POST', body: JSON.stringify({ action }) });
  if (!response.ok) throw new NpcApiError(await errorCode(response, 'npc_interaction_failed'));
  return NpcInteractionResultSchema.parse(await response.json());
}

async function npcFetch(path: string, init?: RequestInit, retry = true): Promise<Response> {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) token = await createSession();
  let response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...init?.headers }
  });
  if (response.status === 401 && retry) {
    localStorage.removeItem(TOKEN_KEY);
    token = await createSession();
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...init?.headers }
    });
  }
  return response;
}

async function createSession() {
  const response = await fetch(`${API_URL}/v1/session/dev`, { method: 'POST' });
  if (!response.ok) throw new NpcApiError('session_failed');
  const payload = await response.json() as { token?: unknown };
  if (typeof payload.token !== 'string') throw new NpcApiError('session_failed');
  localStorage.setItem(TOKEN_KEY, payload.token);
  return payload.token;
}

async function errorCode(response: Response, fallback: string) {
  try {
    const payload = await response.json() as { error?: unknown };
    return typeof payload.error === 'string' ? payload.error : fallback;
  } catch { return fallback; }
}
