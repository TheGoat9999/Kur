import { DevSessionSchema } from '@sol-dorado/contracts';
import {
  GovernmentStateSchema,
  type GovernmentBusinessLicenseRequest,
  type GovernmentFinePaymentRequest,
  type GovernmentIdentityUpdateRequest,
  type GovernmentState
} from '@sol-dorado/contracts/government';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'sd_session_token_v1';

async function createSession() {
  const response = await fetch(`${API_URL}/v1/session/dev`, { method: 'POST' });
  if (!response.ok) throw new Error('development_session_failed');
  const session = DevSessionSchema.parse(await response.json());
  localStorage.setItem(TOKEN_KEY, session.token);
  return session.token;
}

async function request(path: string, init?: RequestInit, retry = true): Promise<Response> {
  let token = localStorage.getItem(TOKEN_KEY) || await createSession();
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

async function parseState(response: Response): Promise<GovernmentState> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? `government_request_failed_${response.status}`);
  }
  return GovernmentStateSchema.parse(await response.json());
}

export async function getGovernmentState() {
  return parseState(await request('/v1/government'));
}

export async function updateGovernmentIdentity(payload: GovernmentIdentityUpdateRequest) {
  return parseState(await request('/v1/government/identity', { method: 'PUT', body: JSON.stringify(payload) }));
}

export async function requestIdCard() {
  return parseState(await request('/v1/government/id-card', { method: 'POST' }));
}

export async function requestDrivingLicense() {
  return parseState(await request('/v1/government/driving-license', { method: 'POST' }));
}

export async function requestBusinessLicense(payload: GovernmentBusinessLicenseRequest) {
  return parseState(await request('/v1/government/business-license', { method: 'POST', body: JSON.stringify(payload) }));
}

export async function payGovernmentFine(payload: GovernmentFinePaymentRequest) {
  return parseState(await request('/v1/government/fines/pay', { method: 'POST', body: JSON.stringify(payload) }));
}
