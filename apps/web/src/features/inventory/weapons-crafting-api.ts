import {
  CraftingResultSchema,
  CraftingStateSchema,
  WeaponActionResultSchema,
  type CraftingResult,
  type CraftingState,
  type WeaponAction,
  type WeaponActionResult
} from '@sol-dorado/contracts/weapons-crafting';
import { getInventory } from '../../lib/api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'sd_session_token_v1';

async function inventoryExtensionFetch(path: string, init?: RequestInit, retry = true): Promise<Response> {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    await getInventory();
    token = localStorage.getItem(TOKEN_KEY);
  }
  if (!token) throw new Error('inventory_session_missing');
  let response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...init?.headers }
  });
  if (response.status === 401 && retry) {
    await getInventory();
    token = localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error('inventory_session_missing');
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...init?.headers }
    });
  }
  return response;
}

async function commandError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  return payload?.error ?? `${fallback}_${response.status}`;
}

export async function getCraftingState(): Promise<CraftingState> {
  const response = await inventoryExtensionFetch('/v1/inventory/crafting');
  if (!response.ok) throw new Error(await commandError(response, 'crafting_load_failed'));
  return CraftingStateSchema.parse(await response.json());
}

export async function craftRecipe(recipeKey: string): Promise<CraftingResult> {
  const response = await inventoryExtensionFetch('/v1/inventory/crafting', {
    method: 'POST',
    body: JSON.stringify({ recipeKey })
  });
  if (!response.ok) throw new Error(await commandError(response, 'crafting_failed'));
  return CraftingResultSchema.parse(await response.json());
}

export async function runWeaponInventoryAction(itemId: string, action: WeaponAction): Promise<WeaponActionResult> {
  const response = await inventoryExtensionFetch('/v1/inventory/weapon', {
    method: 'POST',
    body: JSON.stringify({ itemId, action })
  });
  if (!response.ok) throw new Error(await commandError(response, 'weapon_action_failed'));
  return WeaponActionResultSchema.parse(await response.json());
}
