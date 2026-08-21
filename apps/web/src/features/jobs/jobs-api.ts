import { DevSessionSchema } from '@sol-dorado/contracts';
import { JobMutationResultSchema, JobsStateSchema, type JobMutationResult, type JobsState } from '@sol-dorado/contracts/jobs';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'sd_session_token_v1';

async function sessionToken() {
  const existing = localStorage.getItem(TOKEN_KEY);
  if (existing) return existing;
  const response = await fetch(`${API_URL}/v1/session/dev`, { method: 'POST' });
  if (!response.ok) throw new Error('jobs_session_failed');
  const session = DevSessionSchema.parse(await response.json());
  localStorage.setItem(TOKEN_KEY, session.token);
  return session.token;
}

async function request(path: string, init?: RequestInit, retry = true): Promise<Response> {
  const token = await sessionToken();
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...init?.headers } });
  if (response.status === 401 && retry) { localStorage.removeItem(TOKEN_KEY); return request(path, init, false); }
  return response;
}
async function errorCode(response: Response) { const body = await response.json().catch(() => null) as { error?: string } | null; return body?.error ?? `jobs_failed_${response.status}`; }

export async function getJobs(): Promise<JobsState> {
  const response = await request('/v1/jobs');
  if (!response.ok) throw new Error(await errorCode(response));
  return JobsStateSchema.parse(await response.json());
}
async function command(path: string, body: unknown): Promise<JobMutationResult> {
  const response = await request(path, { method: 'POST', body: JSON.stringify(body) });
  if (!response.ok) throw new Error(await errorCode(response));
  return JobMutationResultSchema.parse(await response.json());
}
export const startJob = (jobId: string, offerId: string) => command('/v1/jobs/start', { jobId, offerId });
export const completeTask = (shiftId: string, taskId: string) => command('/v1/jobs/task', { shiftId, taskId });
export const chooseJobEvent = (shiftId: string, eventId: string, choiceId: string) => command('/v1/jobs/choice', { shiftId, eventId, choiceId });
export const finishJob = (shiftId: string) => command('/v1/jobs/finish', { shiftId });
export const abandonJob = (shiftId: string) => command('/v1/jobs/abandon', { shiftId });
export const claimQualification = (qualificationKey: string) => command('/v1/jobs/qualification', { qualificationKey });
