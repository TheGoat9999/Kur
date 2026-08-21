import { Router } from 'express';
import type { AppServices } from '../types.js';

const MAX_PROMPT_CHARS = 12_000;

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string }>;
  error?: { message?: string };
};

export function characterPreviewRoutes(services: AppServices) {
  const router = Router();

  router.post('/v1/character/preview', async (request, response) => {
    const prompt = typeof request.body?.prompt === 'string' ? request.body.prompt.trim() : '';
    const mode = request.body?.mode === 'portrait' ? 'portrait' : 'full-body';

    if (!prompt || prompt.length > MAX_PROMPT_CHARS) {
      response.status(400).json({ error: 'invalid_character_preview_prompt' });
      return;
    }
    if (!services.config.OPENAI_API_KEY) {
      response.status(503).json({
        error: 'image_generation_not_configured',
        message: 'OPENAI_API_KEY is missing on the API server.'
      });
      return;
    }

    const upstream = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${services.config.OPENAI_API_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: services.config.OPENAI_IMAGE_MODEL,
        prompt,
        size: mode === 'portrait' ? '1024x1024' : '1024x1536',
        quality: 'low',
        output_format: 'jpeg',
        output_compression: 86,
        n: 1
      })
    });

    const payload = await upstream.json().catch(() => null) as OpenAIImageResponse | null;
    if (!upstream.ok) {
      console.error('[character-preview] OpenAI request failed', upstream.status, payload?.error?.message);
      response.status(502).json({
        error: 'image_generation_failed',
        message: payload?.error?.message ?? `OpenAI returned ${upstream.status}`
      });
      return;
    }

    const base64 = payload?.data?.[0]?.b64_json;
    if (!base64) {
      response.status(502).json({ error: 'image_generation_missing_output' });
      return;
    }

    response.json({
      mode,
      model: services.config.OPENAI_IMAGE_MODEL,
      imageDataUrl: `data:image/jpeg;base64,${base64}`
    });
  });

  return router;
}
