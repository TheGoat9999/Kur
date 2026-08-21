const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'sd_session_token_v1';

export type CharacterPreviewResult = {
  mode: 'full-body' | 'portrait';
  model: string;
  imageDataUrl: string;
};

export async function generateCharacterPreview(
  prompt: string,
  mode: 'full-body' | 'portrait'
): Promise<CharacterPreviewResult> {
  const response = await authed('/v1/character/preview', {
    method: 'POST',
    body: JSON.stringify({ prompt, mode })
  });
  const payload = await response.json().catch(() => null) as (CharacterPreviewResult & { error?: string; message?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.error ?? `AI генерирането е неуспешно (${response.status})`);
  }
  if (!payload?.imageDataUrl) throw new Error('AI генерирането не върна изображение.');
  return payload;
}

async function authed(path: string, init: RequestInit, retry = true): Promise<Response> {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) token = await createSession();

  let response = await fetchWithToken(path, init, token);
  if (response.status === 401 && retry) {
    localStorage.removeItem(TOKEN_KEY);
    token = await createSession();
    response = await fetchWithToken(path, init, token);
  }
  return response;
}

function fetchWithToken(path: string, init: RequestInit, token: string) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  headers.set('authorization', `Bearer ${token}`);
  return fetch(`${API_URL}${path}`, { ...init, headers });
}

async function createSession() {
  const response = await fetch(`${API_URL}/v1/session/dev`, { method: 'POST' });
  if (!response.ok) throw new Error('Неуспешно стартиране на тестовата сесия.');
  const payload = await response.json() as { token?: string };
  if (!payload.token) throw new Error('Тестовата сесия не върна token.');
  localStorage.setItem(TOKEN_KEY, payload.token);
  return payload.token;
}
