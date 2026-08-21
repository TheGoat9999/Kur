import {
  BootstrapStateSchema,
  DevSessionSchema,
  FinanceMutationResultSchema,
  FinanceStateSchema,
  InventoryMutationResultSchema,
  InventoryStateSchema,
  StreetStateSchema,
  WorldActionResultSchema,
  type BootstrapState,
  type FinanceAccessMode,
  type FinanceAssetSymbol,
  type FinanceMutationResult,
  type FinanceState,
  type InventoryContainerKey,
  type InventoryMutationResult,
  type InventoryState,
  type StreetState,
  type WorldActionId,
  type WorldActionResult
} from '@sol-dorado/contracts';
import { ItemCatalogResponseSchema, type ItemCatalogResponse } from '@sol-dorado/contracts/items';
import {
  VehicleStateSchema,
  VehicleTravelResultSchema,
  type VehicleState,
  type VehicleTravelResult
} from '@sol-dorado/contracts/vehicles';
import {
  StreetPositionResultSchema,
  type StreetPosition,
  type StreetPositionResult
} from '@sol-dorado/contracts/world-position';
import {
  WorldMapStateSchema,
  WorldMapTravelResultSchema,
  type WorldMapState,
  type WorldMapTravelResult
} from '@sol-dorado/contracts/world-map';

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

export async function saveCharacter(displayName: string, recipe: unknown): Promise<BootstrapState> {
  const response = await authenticatedFetch('/v1/character', {
    method: 'PUT',
    body: JSON.stringify({ displayName, recipe })
  });
  if (!response.ok) throw new Error(await apiError(response, 'Character save failed'));
  return BootstrapStateSchema.parse(await response.json());
}

export async function getStreetState(): Promise<StreetState> {
  const response = await authenticatedFetch('/v1/world');
  if (!response.ok) throw new ApiCommandError(await responseErrorCode(response, 'world_load_failed'));
  return StreetStateSchema.parse(await response.json());
}

export async function getWorldMap(): Promise<WorldMapState> {
  const response = await authenticatedFetch('/v1/world/map');
  if (!response.ok) throw new ApiCommandError(await responseErrorCode(response, 'world_map_load_failed'));
  return WorldMapStateSchema.parse(await response.json());
}

export async function travelWorldMap(segmentId: string): Promise<WorldMapTravelResult> {
  const response = await authenticatedFetch('/v1/world/map/travel', {
    method: 'POST',
    body: JSON.stringify({ segmentId })
  });
  if (!response.ok) throw new ApiCommandError(await responseErrorCode(response, `world_map_travel_failed_${response.status}`));
  return WorldMapTravelResultSchema.parse(await response.json());
}

export async function getStreetPosition(): Promise<StreetPositionResult> {
  const response = await authenticatedFetch('/v1/world/position');
  if (!response.ok) throw new ApiCommandError(await responseErrorCode(response, 'world_position_load_failed'));
  return StreetPositionResultSchema.parse(await response.json());
}

export async function moveStreetPlayer(position: StreetPosition): Promise<StreetPositionResult> {
  const response = await authenticatedFetch('/v1/world/move', {
    method: 'POST',
    body: JSON.stringify(position)
  });
  if (!response.ok) throw new ApiCommandError(await responseErrorCode(response, `world_move_failed_${response.status}`));
  return StreetPositionResultSchema.parse(await response.json());
}

export async function runWorldAction(actionId: WorldActionId, expectedVersion: number): Promise<WorldActionResult> {
  const response = await authenticatedFetch('/v1/world/actions', {
    method: 'POST',
    body: JSON.stringify({ requestId: crypto.randomUUID(), actionId, expectedVersion })
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string; cooldownEndsAt?: string | null } | null;
    throw new ApiCommandError(payload?.error ?? `world_action_failed_${response.status}`, payload ?? undefined);
  }
  return WorldActionResultSchema.parse(await response.json());
}

export async function getItemCatalog(): Promise<ItemCatalogResponse> {
  const response = await authenticatedFetch('/v1/items/catalog');
  if (!response.ok) throw new Error(`Item catalog failed (${response.status})`);
  return ItemCatalogResponseSchema.parse(await response.json());
}

export async function getInventory(): Promise<InventoryState> {
  const response = await authenticatedFetch('/v1/inventory');
  if (!response.ok) throw new Error(`Inventory failed (${response.status})`);
  return InventoryStateSchema.parse(await response.json());
}

export async function moveInventoryItem(itemId: string, toContainerKey: InventoryContainerKey, toSlotIndex?: number): Promise<InventoryState> {
  const response = await authenticatedFetch('/v1/inventory/move', { method: 'POST', body: JSON.stringify({ itemId, toContainerKey, toSlotIndex }) });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? `Inventory move failed (${response.status})`);
  }
  return InventoryStateSchema.parse(await response.json());
}

export async function splitInventoryItem(itemId: string, quantity: number, toSlotIndex?: number): Promise<InventoryState> {
  const response = await authenticatedFetch('/v1/inventory/split', { method: 'POST', body: JSON.stringify({ itemId, quantity, toSlotIndex }) });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? `Inventory split failed (${response.status})`);
  }
  return InventoryStateSchema.parse(await response.json());
}

export async function useInventoryItem(itemId: string): Promise<InventoryMutationResult> {
  const response = await authenticatedFetch('/v1/inventory/use', { method: 'POST', body: JSON.stringify({ itemId }) });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? `Inventory use failed (${response.status})`);
  }
  return InventoryMutationResultSchema.parse(await response.json());
}

export async function getFinance(): Promise<FinanceState> {
  const response = await authenticatedFetch('/v1/finance');
  if (!response.ok) throw new Error(await apiError(response, 'Finance failed'));
  return FinanceStateSchema.parse(await response.json());
}

export function setFinanceAccess(accessMode: FinanceAccessMode) { return financeCommand('/v1/finance/access', { accessMode }); }
export function moveFinanceCash(direction: 'deposit' | 'withdraw', amountCents: number) { return financeCommand('/v1/finance/cash', { direction, amountCents }); }
export function moveFinanceInternal(direction: 'checking_to_savings' | 'savings_to_checking', amountCents: number) { return financeCommand('/v1/finance/internal-transfer', { direction, amountCents }); }
export function sendFinanceTransfer(recipientId: 'maya' | 'leo' | 'landlord', amountCents: number, reference: string) { return financeCommand('/v1/finance/recipient-transfer', { recipientId, amountCents, reference }); }
export function applyFinanceLoan(kind: 'personal' | 'vehicle') { return financeCommand('/v1/finance/loan/apply', { kind }); }
export function payFinanceLoan() { return financeCommand('/v1/finance/loan/pay-next'); }
export function fundFinanceExchange(amountCents: number) { return financeCommand('/v1/finance/exchange/fund', { amountCents }); }
export function withdrawFinanceExchange() { return financeCommand('/v1/finance/exchange/withdraw'); }
export function tradeFinanceCrypto(side: 'buy' | 'sell', symbol: FinanceAssetSymbol, usdCents: number) { return financeCommand('/v1/finance/crypto/trade', { side, symbol, usdCents }); }
export function advanceFinanceMarket() { return financeCommand('/v1/finance/market/advance'); }

export async function getVehicles(): Promise<VehicleState> {
  const response = await authenticatedFetch('/v1/vehicles');
  if (!response.ok) throw new Error(await apiError(response, 'Vehicles failed'));
  return VehicleStateSchema.parse(await response.json());
}

export async function purchaseVehicle(stockKey: string): Promise<VehicleState> {
  const response = await authenticatedFetch('/v1/vehicles/purchase', { method: 'POST', body: JSON.stringify({ stockKey }) });
  if (!response.ok) throw new Error(await apiError(response, 'Vehicle purchase failed'));
  return VehicleStateSchema.parse(await response.json());
}

export async function runVehicleAction(vehicleId: string, action: 'select' | 'enter' | 'exit' | 'lock' | 'unlock'): Promise<VehicleState> {
  const response = await authenticatedFetch('/v1/vehicles/action', { method: 'POST', body: JSON.stringify({ vehicleId, action }) });
  if (!response.ok) throw new Error(await apiError(response, 'Vehicle action failed'));
  return VehicleStateSchema.parse(await response.json());
}

export async function driveVehicle(vehicleId: string, segmentId: string): Promise<VehicleTravelResult> {
  const response = await authenticatedFetch('/v1/vehicles/travel', { method: 'POST', body: JSON.stringify({ vehicleId, segmentId }) });
  if (!response.ok) throw new Error(await apiError(response, 'Vehicle travel failed'));
  return VehicleTravelResultSchema.parse(await response.json());
}

async function financeCommand(path: string, body?: unknown): Promise<FinanceMutationResult> {
  const response = await authenticatedFetch(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
  if (!response.ok) throw new Error(await apiError(response, 'Finance action failed'));
  return FinanceMutationResultSchema.parse(await response.json());
}

async function apiError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  return payload?.error ?? `${fallback} (${response.status})`;
}

async function responseErrorCode(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  return payload?.error ?? fallback;
}

export class ApiCommandError extends Error {
  constructor(public readonly code: string, public readonly details?: Record<string, unknown>) { super(code); }
}
