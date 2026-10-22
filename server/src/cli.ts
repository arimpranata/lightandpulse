import { loadConfig } from './config';
import { createPool, migrate } from './db';
import { seed } from './seed';

const command = process.argv[2];
const config = loadConfig();
const db = createPool(config.databaseUrl);
try {
  if (command === 'migrate') await migrate(db);
  else if (command === 'seed') await seed(db, config);
  else {
    console.error('Usage: cli.ts migrate | seed');
    process.exitCode = 1;
  }
} finally {
  await db.end();
}
