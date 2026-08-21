import { Router, type Request, type Response } from 'express';
import type { AppServices } from '../types.js';

const MAKEHUMAN_TEXTURE_ROOT = 'https://free.downloads.tuxfamily.net/makehuman/assets/1.1/base';
const VALID_CATEGORY = new Set(['hair', 'clothes']);
const SAFE_ID = /^[a-zA-Z0-9_-]{1,80}$/;
const SAFE_FILE = /^[a-zA-Z0-9_.() -]{1,160}\.(?:png|jpe?g)$/i;
const MAX_TEXTURE_BYTES = 16 * 1024 * 1024;

export function characterAssetRoutes(_services: AppServices) {
  const router = Router();

  router.get('/v1/assets/makehuman', async (request: Request, response: Response) => {
    const category = String(request.query.category ?? '');
    const id = String(request.query.id ?? '');
    const file = String(request.query.file ?? '');

    if (!VALID_CATEGORY.has(category) || !SAFE_ID.test(id) || !SAFE_FILE.test(file)) {
      response.status(400).json({ error: 'invalid_character_asset' });
      return;
    }

    const source = `${MAKEHUMAN_TEXTURE_ROOT}/${category}/${encodeURIComponent(id)}/${encodeURIComponent(file)}`;
    const upstream = await fetch(source, {
      headers: { 'user-agent': 'Sol-Dorado-Character-Asset-Proxy/1.0' },
      redirect: 'follow'
    });

    if (!upstream.ok) {
      response.status(upstream.status === 404 ? 404 : 502).json({ error: 'character_asset_unavailable' });
      return;
    }

    const contentType = upstream.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      response.status(502).json({ error: 'invalid_character_asset_content' });
      return;
    }

    const declaredLength = Number(upstream.headers.get('content-length') ?? 0);
    if (declaredLength > MAX_TEXTURE_BYTES) {
      response.status(413).json({ error: 'character_asset_too_large' });
      return;
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.byteLength > MAX_TEXTURE_BYTES) {
      response.status(413).json({ error: 'character_asset_too_large' });
      return;
    }

    response.setHeader('content-type', contentType);
    response.setHeader('cache-control', 'public, max-age=604800, stale-while-revalidate=86400');
    response.setHeader('x-content-type-options', 'nosniff');
    response.send(buffer);
  });

  return router;
}
