import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyError } from 'fastify';

import { TokenService, type AuthUser } from './auth';
import type { Config } from './config';
import type { Context } from './context';
import type { Db } from './db';
import { ApiError } from './errors';
import type { PaymentProvider } from './payments';
import { adminRoutes } from './routes/admin';
import { authRoutes } from './routes/auth';
import { publicRoutes } from './routes/public';
import { travellerRoutes } from './routes/traveller';
import { vendorRoutes } from './routes/vendor';

declare module 'fastify' {
  interface FastifyRequest {
    /** The unparsed JSON body, for webhook signature checks. */
    rawBody?: string;
  }
}

export async function buildApp(options: { config: Config; db: Db; payments: PaymentProvider; logger?: boolean }) {
  const { config, db, payments } = options;
  const app = Fastify({ logger: options.logger ?? true, trustProxy: true, bodyLimit: 512 * 1024 });
  const context: Context = { config, db, payments, tokens: new TokenService(config.jwtSecret) };

  await app.register(cors, { origin: config.corsOrigins, methods: ['GET', 'POST', 'PUT', 'DELETE'] });
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });

  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => {
    request.rawBody = body as string;
    try {
      done(null, body === '' ? {} : JSON.parse(body as string));
    } catch {
      done(new ApiError('VALIDATION_ERROR', 'Request body is not valid JSON.'), undefined);
    }
  });

  // Bearer token → request.user. The account is re-read so a disabled user or changed role applies at once.
  app.decorateRequest('user', null);
  app.addHook('onRequest', async (request) => {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return;
    const claims = await context.tokens.verify(header.slice(7));
    if (!claims) return;
    const { rows } = await db.query('SELECT id, role, vendor_id, disabled FROM users WHERE id = $1', [claims.id]);
    const row = rows[0];
    if (row && !row.disabled) request.user = { id: row.id, role: row.role, vendorId: row.vendor_id } satisfies AuthUser;
  });

  app.setErrorHandler((error: FastifyError | ApiError, request, reply) => {
    if (error instanceof ApiError) {
      return reply.code(error.status).send({ error: { code: error.code, message: error.message, details: error.details } });
    }
    if (error.statusCode === 429) {
      return reply.code(429).send({ error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a moment.' } });
    }
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return reply.code(error.statusCode).send({ error: { code: 'VALIDATION_ERROR', message: error.message } });
    }
    request.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ error: { code: 'NOT_FOUND', message: `No route for ${request.method} ${request.url}` } });
  });

  for (const routes of [publicRoutes, authRoutes, travellerRoutes, vendorRoutes, adminRoutes]) routes(app, context);
  return app;
}
