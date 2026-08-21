import { DevSessionSchema } from '@sol-dorado/contracts';
import { HoodWalkMutationResultSchema, HoodWalkStateSchema, type HoodWalkCommand, type HoodWalkMutationResult, type HoodWalkState } from '@sol-dorado/contracts/hood-walk';
import { ApiCommandError } from './api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'sd_session_token_v1';

type HoodWalkCommandInput = HoodWalkCommand extends infer Command
  ? Command extends { requestId: string }
    ? Omit<Command, 'requestId'>
    : never
  : never;

async function sessionToken() {
  const existing = localStorage.getItem(TOKEN_KEY);
  if (existing) return existing;
  const response = await fetch(`${API_URL}/v1/session/dev`, { method:'POST' });
  if (!response.ok) throw new Error('hood_walk_session_failed');
  const session = DevSessionSchema.parse(await response.json());
  localStorage.setItem(TOKEN_KEY, session.token);
  return session.token;
}

async function request(path:string, init?:RequestInit, retry=true) {
  let token = await sessionToken();
  let response = await fetch(`${API_URL}${path}`, { ...init, headers:{ 'content-type':'application/json', authorization:`Bearer ${token}`, ...init?.headers } });
  if (response.status === 401 && retry) {
    localStorage.removeItem(TOKEN_KEY);
    token = await sessionToken();
    response = await fetch(`${API_URL}${path}`, { ...init, headers:{ 'content-type':'application/json', authorization:`Bearer ${token}`, ...init?.headers } });
  }
  return response;
}

export async function getHoodWalk(): Promise<HoodWalkState> {
  const response = await request('/v1/world/hood-walk');
  if (!response.ok) throw new ApiCommandError(await errorCode(response));
  return HoodWalkStateSchema.parse(await response.json());
}

export async function commandHoodWalk(command: HoodWalkCommandInput): Promise<HoodWalkMutationResult> {
  const response = await request('/v1/world/hood-walk', { method:'POST', body:JSON.stringify({ ...command, requestId:crypto.randomUUID() }) });
  if (!response.ok) throw new ApiCommandError(await errorCode(response));
  return HoodWalkMutationResultSchema.parse(await response.json());
}

async function errorCode(response:Response) {
  const payload = await response.json().catch(() => null) as {error?:string}|null;
  return payload?.error ?? `hood_walk_failed_${response.status}`;
}
