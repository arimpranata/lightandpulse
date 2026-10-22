import { buildApp } from './app';
import { loadConfig } from './config';
import { createPool, migrate } from './db';
import { createDemoProvider } from './payments';
import { seed } from './seed';

const config = loadConfig();
const db = createPool(config.databaseUrl);
await migrate(db);
await seed(db, config);

const app = await buildApp({
  config,
  db,
  payments: createDemoProvider({ secret: config.pspWebhookSecret, webhookUrl: config.webhookUrl, log: (m) => app.log.warn(m) }),
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close().then(() => db.end()).then(() => process.exit(0));
  });
}

await app.listen({ host: config.host, port: config.port });
