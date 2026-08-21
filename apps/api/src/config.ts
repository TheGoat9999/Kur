import path from 'node:path';
import { config as loadDotEnv } from 'dotenv';
import { z } from 'zod';

loadDotEnv({ path: path.resolve(process.cwd(), '../../.env'), quiet: true });
loadDotEnv({ path: path.resolve(process.cwd(), '.env'), quiet: true });

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_IMAGE_MODEL: z.string().min(1).default('gpt-image-2')
});

export type AppConfig = z.infer<typeof ConfigSchema>;
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return ConfigSchema.parse(env);
}
