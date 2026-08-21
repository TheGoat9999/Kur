import { JusticeMutationResultSchema, JusticeStateSchema, type JusticeMutationResult, type JusticeState } from '@sol-dorado/contracts/justice';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'sd_session_token_v1';

async function request(path: string, init?: RequestInit) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error('justice_session_unavailable');
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...init?.headers }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? `justice_request_failed_${response.status}`);
  }
  return response;
}

export async function getJustice(): Promise<JusticeState> {
  return JusticeStateSchema.parse(await (await request('/v1/justice')).json());
}
async function command(path: string, body: unknown): Promise<JusticeMutationResult> {
  return JusticeMutationResultSchema.parse(await (await request(path, { method: 'POST', body: JSON.stringify(body) })).json());
}
export const bookJusticeCase = (caseId: string, charges: Array<{ code: string; count: number; evidenceStrength: number }>) => command('/v1/justice/book', { caseId, charges });
export const calculateJusticeBail = (caseId: string) => command('/v1/justice/bail', { caseId, action: 'calculate' });
export const postJusticeBail = (caseId: string) => command('/v1/justice/bail', { caseId, action: 'post' });
export const runJusticeProsecution = (caseId: string) => command('/v1/justice/prosecution', { caseId });
export const runJusticeCourt = (caseId: string) => command('/v1/justice/court', { caseId });
