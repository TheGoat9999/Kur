import {
  BootstrapStateSchema,
  DevSessionSchema,
  InventoryMutationResultSchema,
  InventoryStateSchema,
  WorldActionResultSchema,
  type BootstrapState,
  type InventoryContainerKey,
  type InventoryMutationResult,
  type InventoryState,
  type WorldActionId,
  type WorldActionResult
} from '@sol-dorado/contracts';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'sd_session_token_v1';

async function createSession() {
  const response = await fetch(`${API_URL}/v1/session/dev`, { method: 'POST' });
  if (!response.ok) throw new Error('The development session could not start. Run migrations and seed the database.');
  const session = DevSessionSchema.parse(await response.json());
  localStorage.setItem(TOKEN_KEY, session.token);
  return session.token;
}

async function authenticatedFetch(path: string, init?: RequestInit, retry = true): Promise<Response> {
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

export async function getBootstrap(): Promise<BootstrapState> {
  const response = await authenticatedFetch('/v1/bootstrap');
  if (!response.ok) throw new Error(`Bootstrap failed (${response.status})`);
  return BootstrapStateSchema.parse(await response.json());
}

export async function runWorldAction(actionId: WorldActionId, expectedVersion: number): Promise<WorldActionResult> {
  const response = await authenticatedFetch('/v1/world/actions', {
    method: 'POST',
    body: JSON.stringify({ requestId: crypto.randomUUID(), actionId, expectedVersion })
  });
  if (response.status === 409) throw new Error('Your state changed in another session. Refreshing is required.');
  if (!response.ok) throw new Error(`Action failed (${response.status})`);
  return WorldActionResultSchema.parse(await response.json());
}

export async function getInventory(): Promise<InventoryState> {
  const response = await authenticatedFetch('/v1/inventory');
  if (!response.ok) throw new Error(`Inventory failed (${response.status})`);
  return InventoryStateSchema.parse(await response.json());
}

export async function moveInventoryItem(
  itemId: string,
  toContainerKey: InventoryContainerKey,
  toSlotIndex?: number
): Promise<InventoryState> {
  const response = await authenticatedFetch('/v1/inventory/move', {
    method: 'POST',
    body: JSON.stringify({ itemId, toContainerKey, toSlotIndex })
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? `Inventory move failed (${response.status})`);
  }
  return InventoryStateSchema.parse(await response.json());
}

export async function useInventoryItem(itemId: string): Promise<InventoryMutationResult> {
  const response = await authenticatedFetch('/v1/inventory/use', {
    method: 'POST',
    body: JSON.stringify({ itemId })
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? `Inventory use failed (${response.status})`);
  }
  return InventoryMutationResultSchema.parse(await response.json());
}
