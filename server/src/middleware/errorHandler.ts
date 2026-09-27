import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import type { ApiErrorResponse } from '../../../shared/types.js';
import { AppError } from '../errors.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response<ApiErrorResponse>,
  _next: NextFunction
): void {
  // Handle custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
    return;
  }

  // Handle Zod schema validation errors
  if (err instanceof ZodError) {
    const formattedMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    res.status(400).json({
      error: formattedMessages || 'Input validation failed',
      code: 'VALIDATION_ERROR',
      details: err.flatten(),
    });
    return;
  }

  // Handle generic / unexpected server errors
  console.error('Unhandled Server Error:', err);
  const message = err instanceof Error ? err.message : 'An unexpected internal error occurred';
  res.status(500).json({
    error: message,
    code: 'INTERNAL_SERVER_ERROR',
  });
}
