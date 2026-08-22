import { DevSessionSchema } from '@sol-dorado/contracts';
import { HospitalityStateSchema, type HospitalityState } from '@sol-dorado/contracts/hospitality';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'sd_session_token_v1';

async function token() {
  const existing = localStorage.getItem(TOKEN_KEY);
  if (existing) return existing;
  const response = await fetch(`${API_URL}/v1/session/dev`, { method: 'POST' });
  if (!response.ok) throw new Error('hospitality_session_failed');
  const session = DevSessionSchema.parse(await response.json());
  localStorage.setItem(TOKEN_KEY, session.token);
  return session.token;
}

async function request(path: string, init?: RequestInit, retry = true) {
  const session = await token();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${session}`, ...init?.headers }
  });
  if (response.status === 401 && retry) {
    localStorage.removeItem(TOKEN_KEY);
    return request(path, init, false);
  }
  return response;
}

async function errorCode(response: Response) {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error ?? `hospitality_failed_${response.status}`;
}

export async function getHospitalityState(businessId: string): Promise<HospitalityState> {
  const response = await request(`/v1/hospitality/${businessId}`);
  if (!response.ok) throw new Error(await errorCode(response));
  return HospitalityStateSchema.parse(await response.json());
}

async function command(path: string, body: unknown) {
  const response = await request(path, { method: 'POST', body: JSON.stringify(body) });
  if (!response.ok) throw new Error(await errorCode(response));
  return response.json() as Promise<Record<string, unknown>>;
}

export const startProduction = (businessId: string, recipeKey: string, batches: number) =>
  command('/v1/hospitality/production/start', { businessId, recipeKey, batches });
export const completeProduction = (batchId: string) =>
  command('/v1/hospitality/production/complete', { batchId });
export const placePurchaseOrder = (businessId: string, supplierId: string, destinationPropertyId: string | null, lines: Array<{ itemKey: string; quantity: number }>) =>
  command('/v1/hospitality/purchase-orders', { businessId, supplierId, destinationPropertyId, lines });
export const receiveShipment = (shipmentId: string) =>
  command('/v1/hospitality/shipments/receive', { shipmentId });
export const runDemandCycle = (businessId: string) =>
  command('/v1/hospitality/demand-cycle', { businessId });
