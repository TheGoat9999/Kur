import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createDatabase } from './db.js';
import { createRedis } from './redis.js';

const config = loadConfig();
const db = createDatabase(config);
const redis = createRedis(config);
const app = createApp({ config, db, redis });
const server = app.listen(config.PORT, () => console.log(`SOL DORADO API listening on :${config.PORT}`));

async function shutdown() {
  server.close();
  await Promise.allSettled([db.end(), redis.quit()]);
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
