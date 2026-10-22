import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

// numeric columns (money) arrive as strings; amounts here are whole rupiah, so parse them.
pg.types.setTypeParser(1700, (value) => Number(value));
// date columns stay as YYYY-MM-DD strings, matching the domain types.
pg.types.setTypeParser(1082, (value) => value);

export type Db = pg.Pool;
export type Tx = pg.PoolClient;

export function createPool(databaseUrl: string): Db {
  return new pg.Pool({ connectionString: databaseUrl, max: 10 });
}

/** Runs `work` in a transaction, rolling back on any error. */
export async function transaction<T>(db: Db, work: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function migrationsDir(): string {
  if (process.env.MIGRATIONS_DIR) return process.env.MIGRATIONS_DIR;
  // The bundle ships them in dist/migrations; in development they sit in server/migrations.
  const here = dirname(fileURLToPath(import.meta.url));
  const bundled = join(here, 'migrations');
  return existsSync(bundled) ? bundled : join(here, '..', 'migrations');
}

/** Applies pending SQL migrations in filename order, each in its own transaction. */
export async function migrate(db: Db, log: (message: string) => void = console.log): Promise<string[]> {
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  // Serialise concurrent starts (several API replicas) on one advisory lock.
  return transaction(db, async (tx) => {
    await tx.query('SELECT pg_advisory_xact_lock(724001)');
    const done = new Set((await tx.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
    const files = readdirSync(migrationsDir()).filter((f) => f.endsWith('.sql')).sort();
    const applied: string[] = [];
    for (const file of files) {
      if (done.has(file)) continue;
      await tx.query(readFileSync(join(migrationsDir(), file), 'utf8'));
      await tx.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      applied.push(file);
      log(`migrated ${file}`);
    }
    return applied;
  });
}
