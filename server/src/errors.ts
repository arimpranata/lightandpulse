/** Error codes returned to clients (shape: { error: { code, message, details? } }). */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BOOKING_UNAVAILABLE'
  | 'CULTURAL_RESTRICTION'
  | 'INVALID_TRANSITION'
  | 'INVALID_SIGNATURE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  BOOKING_UNAVAILABLE: 409,
  CULTURAL_RESTRICTION: 422,
  INVALID_TRANSITION: 409,
  INVALID_SIGNATURE: 401,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export class ApiError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.status = STATUS[code];
  }
}
