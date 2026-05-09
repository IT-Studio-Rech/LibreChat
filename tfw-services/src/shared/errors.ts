import type { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';

export class NotFoundError extends Error {
  readonly status = 404;
  readonly code = 'NOT_FOUND';
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  readonly status = 400;
  readonly code = 'VALIDATION_ERROR';
  constructor(message = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthError extends Error {
  readonly status = 401;
  readonly code = 'UNAUTHORIZED';
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends Error {
  readonly status = 403;
  readonly code = 'FORBIDDEN';
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ServerError extends Error {
  readonly status = 500;
  readonly code = 'INTERNAL_ERROR';
  constructor(message = 'Internal server error') {
    super(message);
    this.name = 'ServerError';
  }
}

type AppError = NotFoundError | ValidationError | AuthError | ForbiddenError | ServerError;

function isAppError(err: unknown): err is AppError {
  return (
    err instanceof NotFoundError ||
    err instanceof ValidationError ||
    err instanceof AuthError ||
    err instanceof ForbiddenError ||
    err instanceof ServerError
  );
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (isAppError(err)) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }

  logger.error(err, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
}
