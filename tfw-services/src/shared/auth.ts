import type { Request, Response, NextFunction } from 'express';
import { AuthError } from './errors.js';

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const userId = req.headers['x-user-id'];

  if (!authHeader || !userId) {
    return next(new AuthError('Missing Authorization or X-User-Id header'));
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new AuthError('Invalid Authorization header format'));
  }

  const secret = process.env.TFW_SERVICES_SHARED_SECRET;
  if (!secret || token !== secret) {
    return next(new AuthError('Invalid token'));
  }

  if (typeof userId !== 'string' || !userId.trim()) {
    return next(new AuthError('Invalid X-User-Id header'));
  }

  req.userId = userId.trim();
  next();
}
