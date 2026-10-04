import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { ENV } from '../config.js';
import { AuthError } from '../errors.js';

export const ADMIN_COOKIE_NAME = 'wheel_admin_session';

/**
 * Creates an HMAC signed session token string.
 */
export function createAdminSessionToken(): string {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `admin:${timestamp}:${nonce}`;
  const hmac = crypto.createHmac('sha256', ENV.SESSION_SECRET).update(payload).digest('hex');
  return `${Buffer.from(payload).toString('base64url')}.${hmac}`;
}

/**
 * Validates an HMAC signed session token string.
 * Valid for 24 hours.
 */
export function verifyAdminSessionToken(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;

    const [encodedPayload, signature] = parts;
    if (!encodedPayload || !signature) return false;

    const payload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const expectedSig = crypto
      .createHmac('sha256', ENV.SESSION_SECRET)
      .update(payload)
      .digest('hex');

    const sigBuf = Buffer.from(signature, 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return false;
    }

    const payloadParts = payload.split(':');
    const timestamp = Number(payloadParts[1]);
    const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours

    if (Number.isNaN(timestamp) || Date.now() - timestamp > maxAgeMs) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Express middleware to restrict endpoints to authenticated admins.
 */
export function requireAdminAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[ADMIN_COOKIE_NAME];
  if (!token || typeof token !== 'string') {
    return next(new AuthError('Admin authentication required. Please log in.'));
  }

  if (!verifyAdminSessionToken(token)) {
    return next(new AuthError('Admin session expired or invalid. Please re-login.'));
  }

  next();
}
