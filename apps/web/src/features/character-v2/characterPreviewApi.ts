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
    throw new Error(payload?.message ?? payload?.error ?? `AI preview failed (${response.status})`);
  }
  if (!payload?.imageDataUrl) throw new Error('AI preview did not return an image.');
  return payload;
}

async function authed(path: string, init: RequestInit, retry = true): Promise<Response> {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) token = await createSession();
  let response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...init.headers }
  });
  if (response.status === 401 && retry) {
    localStorage.removeItem(TOKEN_KEY);
    token = await createSession();
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...init.headers }
    });
  }
  return response;
}

async function createSession() {
  const response = await fetch(`${API_URL}/v1/session/dev`, { method: 'POST' });
  if (!response.ok) throw new Error('Неуспешно стартиране на development сесията.');
  const payload = await response.json() as { token?: string };
  if (!payload.token) throw new Error('Development сесията не върна token.');
  localStorage.setItem(TOKEN_KEY, payload.token);
  return payload.token;
}
