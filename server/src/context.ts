import type { z } from 'zod';

import type { TokenService } from './auth';
import type { Config } from './config';
import type { Db } from './db';
import { ApiError } from './errors';
import type { PaymentProvider } from './payments';

export type Context = {
  config: Config;
  db: Db;
  tokens: TokenService;
  payments: PaymentProvider;
};

/** Validates request input; failures become a 400 with the field issues. */
export function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiError(
      'VALIDATION_ERROR',
      'Some fields are missing or invalid.',
      result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }
  return result.data;
}
