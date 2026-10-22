import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import type { FastifyRequest } from 'fastify';
import { jwtVerify, SignJWT } from 'jose';

import type { Actor } from './audit';
import { ApiError } from './errors';

const scrypt = promisify(scryptCallback) as (password: string, salt: Buffer, keylen: number, options: object) => Promise<Buffer>;

export type Role = 'traveller' | 'vendor' | 'admin' | 'cultural_reviewer';

export type AuthUser = { id: string; role: Role; vendorId: string | null };

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

/** scrypt$N$r$p$salt$hash, all parameters stored so they can be raised later. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), hash.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [scheme, n, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt') return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await scrypt(password, Buffer.from(salt, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return timingSafeEqual(actual, expected);
}

export class TokenService {
  private readonly key: Uint8Array;
  constructor(secret: string) {
    this.key = new TextEncoder().encode(secret);
  }

  /** Travellers stay signed in for a week; staff sessions expire after 12 hours. */
  async issue(user: AuthUser): Promise<string> {
    return new SignJWT({ role: user.role, vendorId: user.vendorId })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime(user.role === 'traveller' ? '7d' : '12h')
      .sign(this.key);
  }

  async verify(token: string): Promise<AuthUser | null> {
    try {
      const { payload } = await jwtVerify(token, this.key, { algorithms: ['HS256'] });
      if (!payload.sub) return null;
      return { id: payload.sub, role: payload.role as Role, vendorId: (payload.vendorId as string | null) ?? null };
    } catch {
      return null;
    }
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null;
  }
}

export function requireUser(request: FastifyRequest): AuthUser {
  if (!request.user) throw new ApiError('UNAUTHORIZED', 'Sign in to continue.');
  return request.user;
}

/** Role-based access control (spec §25). */
export function requireRole(request: FastifyRequest, ...roles: Role[]): AuthUser {
  const user = requireUser(request);
  if (!roles.includes(user.role)) throw new ApiError('FORBIDDEN', 'Your account cannot do this.');
  return user;
}

export function actorOf(user: AuthUser): Actor {
  return { id: user.id, role: user.role };
}
