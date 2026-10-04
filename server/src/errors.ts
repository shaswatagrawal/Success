/**
 * Typed custom error classes for application-wide error handling.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class SpinLimitError extends AppError {
  constructor(message = 'You have reached the maximum number of spins allowed for this promotion') {
    super(message, 403, 'SPIN_LIMIT_REACHED');
  }
}

export class TokenError extends AppError {
  constructor(message: string, code = 'TOKEN_INVALID') {
    super(message, 400, code);
  }
}

export class AuthError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Requested resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}
