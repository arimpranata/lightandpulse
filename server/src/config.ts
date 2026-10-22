import { randomBytes } from 'node:crypto';

/** Runtime configuration from environment variables. No secret has a default in production. */
export type Config = {
  production: boolean;
  host: string;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  corsOrigins: string[] | true;
  paymentProvider: 'demo';
  pspWebhookSecret: string;
  /** Where the demo payment provider delivers its callbacks. */
  webhookUrl: string;
  seedDemo: boolean;
  /** Sign-in and sign-up attempts per minute per IP. */
  authRateLimit: number;
  adminEmail?: string;
  adminPassword?: string;
  demoVendorPassword?: string;
};

function secret(name: string, production: boolean): string {
  const value = process.env[name];
  if (value && value.length >= 32) return value;
  if (production) throw new Error(`${name} must be set to at least 32 characters in production.`);
  // Development only: an ephemeral secret, so tokens stop working after a restart.
  return randomBytes(32).toString('hex');
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const production = env.NODE_ENV === 'production';
  const port = Number(env.PORT ?? 3000);
  const origins = (env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  return {
    production,
    host: env.HOST ?? '0.0.0.0',
    port,
    databaseUrl: env.DATABASE_URL,
    jwtSecret: secret('JWT_SECRET', production),
    corsOrigins: origins.length === 0 || origins.includes('*') ? true : origins,
    paymentProvider: 'demo',
    pspWebhookSecret: secret('PSP_WEBHOOK_SECRET', production),
    webhookUrl: env.PSP_WEBHOOK_URL ?? `http://127.0.0.1:${port}/payments/webhook`,
    seedDemo: env.SEED_DEMO !== 'false',
    authRateLimit: Number(env.AUTH_RATE_LIMIT ?? 10),
    adminEmail: env.ADMIN_EMAIL || undefined,
    adminPassword: env.ADMIN_PASSWORD || undefined,
    demoVendorPassword: env.DEMO_VENDOR_PASSWORD || undefined,
  };
}
