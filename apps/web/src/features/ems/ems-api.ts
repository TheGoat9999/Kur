import {
  EmsAccessSchema,
  EmsMutationResultSchema,
  EmsReportResultSchema,
  EmsStateSchema,
  type EmsAccess,
  type EmsMutationResult,
  type EmsOutcome,
  type EmsPriority,
  type EmsReportResult,
  type EmsState,
  type EmsTreatment
} from '@sol-dorado/contracts/ems';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'sd_session_token_v1';

async function request(path: string, init?: RequestInit) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error('ems_session_unavailable');
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...init?.headers }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? `ems_request_failed_${response.status}`);
  }
  return response;
}

export async function getEmsAccess(): Promise<EmsAccess> {
  return EmsAccessSchema.parse(await (await request('/v1/ems/access')).json());
}

export async function getEms(): Promise<EmsState> {
  return EmsStateSchema.parse(await (await request('/v1/ems')).json());
}

async function command(path: string, body: unknown): Promise<EmsMutationResult> {
  return EmsMutationResultSchema.parse(await (await request(path, { method: 'POST', body: JSON.stringify(body) })).json());
}

export async function reportEmsCall(priority: EmsPriority, incidentType: string, summary: string): Promise<EmsReportResult> {
  return EmsReportResultSchema.parse(await (await request('/v1/ems/calls', { method: 'POST', body: JSON.stringify({ priority, incidentType, summary }) })).json());
}

export const setEmsDuty = (onDuty: boolean) => command('/v1/ems/duty', { onDuty });
export const acceptEmsCall = (callId: string) => command('/v1/ems/calls/accept', { callId });
export const updateEmsStatus = (callId: string, status: 'en_route'|'on_scene'|'transporting') => command('/v1/ems/calls/status', { callId, status });
export const saveEmsAssessment = (input: { callId: string; consciousness: 'alert'|'confused'|'unresponsive'; breathing: 'normal'|'labored'|'absent'; bleeding: 'none'|'minor'|'major'; pain: number; notes: string }) => command('/v1/ems/assessment', input);
export const applyEmsTreatment = (callId: string, treatment: EmsTreatment) => command('/v1/ems/treatment', { callId, treatment });
export const handoffEmsCall = (callId: string, outcome: EmsOutcome, notes: string) => command('/v1/ems/handoff', { callId, outcome, notes });
