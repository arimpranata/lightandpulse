import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { hashPassword, requireUser, verifyPassword, type AuthUser } from '../auth';
import { parse, type Context } from '../context';
import { ApiError } from '../errors';

const credentials = z.object({
  email: z.email().max(200).transform((email) => email.toLowerCase()),
  password: z.string().min(10, 'Use at least 10 characters.').max(200),
});

type UserRow = { id: string; email: string | null; display_name: string | null; role: AuthUser['role']; vendor_id: string | null };

export function publicUser(row: UserRow) {
  return { id: row.id, email: row.email, displayName: row.display_name, role: row.role, vendorId: row.vendor_id, guest: !row.email };
}

export function authRoutes(app: FastifyInstance, { config, db, tokens }: Context) {
  const session = async (row: UserRow) => ({
    token: await tokens.issue({ id: row.id, role: row.role, vendorId: row.vendor_id }),
    user: publicUser(row),
  });

  const limited = { config: { rateLimit: { max: config.authRateLimit, timeWindow: '1 minute' } } };

  /** A traveller can book without signing up; the guest account can be upgraded later. */
  app.post('/auth/guest', limited, async () => {
    const { rows } = await db.query<UserRow>(`INSERT INTO users (role) VALUES ('traveller') RETURNING *`);
    return session(rows[0]);
  });

  app.post('/auth/register', limited, async (request) => {
    const body = parse(credentials.extend({ name: z.string().trim().min(2).max(120) }), request.body);
    const hash = await hashPassword(body.password);
    const current = request.user;
    try {
      if (current?.role === 'traveller') {
        // Upgrade the guest account so its journey and orders are kept.
        const { rows } = await db.query<UserRow>(
          `UPDATE users SET email = $2, password_hash = $3, display_name = $4 WHERE id = $1 AND email IS NULL RETURNING *`,
          [current.id, body.email, hash, body.name],
        );
        if (rows[0]) return session(rows[0]);
      }
      const { rows } = await db.query<UserRow>(
        `INSERT INTO users (email, password_hash, display_name, role) VALUES ($1, $2, $3, 'traveller') RETURNING *`,
        [body.email, hash, body.name],
      );
      return session(rows[0]);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ApiError('CONFLICT', 'An account with this email already exists.');
      throw error;
    }
  });

  app.post('/auth/login', limited, async (request) => {
    const body = parse(z.object({ email: z.string().max(200), password: z.string().max(200) }), request.body);
    const { rows } = await db.query<UserRow & { password_hash: string | null; disabled: boolean }>(
      'SELECT * FROM users WHERE email = $1',
      [body.email.toLowerCase()],
    );
    const row = rows[0];
    // Always run the hash check, so response time does not reveal which emails exist.
    const valid = await verifyPassword(body.password, row?.password_hash ?? 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + 'A'.repeat(86) + '==');
    if (!row || !valid || row.disabled) throw new ApiError('UNAUTHORIZED', 'Email or password is incorrect.');
    return session(row);
  });

  /** Exchanges a valid token for a fresh one, so an active traveller stays signed in. */
  app.post('/auth/refresh', async (request) => {
    const user = requireUser(request);
    const { rows } = await db.query<UserRow>('SELECT * FROM users WHERE id = $1', [user.id]);
    if (!rows[0]) throw new ApiError('UNAUTHORIZED', 'Sign in to continue.');
    return session(rows[0]);
  });

  app.get('/auth/me', async (request) => {
    const user = requireUser(request);
    const { rows } = await db.query<UserRow>('SELECT * FROM users WHERE id = $1', [user.id]);
    if (!rows[0]) throw new ApiError('UNAUTHORIZED', 'Sign in to continue.');
    return { user: publicUser(rows[0]) };
  });
}
