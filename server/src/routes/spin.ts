import crypto from 'node:crypto';
import { Router } from 'express';
import type { Request, Response } from 'express';
import { SpinRequestSchema, StartSpinSchema } from '../../../shared/schemas.js';
import type {
  SpinResponse,
  StartSpinResponse,
  UserStatusResponse,
} from '../../../shared/types.js';
import { spinExecutionLimiter, spinStartLimiter } from '../middleware/rateLimit.js';
import { executeSpin, getUserStatus, startSpin } from '../services/spinService.js';

export const spinRouter = Router();

const DEVICE_COOKIE_NAME = 'wheel_device_id';

/**
 * Helper to get or set device ID cookie.
 */
function resolveDeviceId(req: Request, res: Response, providedDeviceId?: string): string {
  let deviceId = req.cookies?.[DEVICE_COOKIE_NAME] as string | undefined;

  if (!deviceId || typeof deviceId !== 'string') {
    deviceId = providedDeviceId && providedDeviceId.length >= 10 ? providedDeviceId : crypto.randomUUID();
    res.cookie(DEVICE_COOKIE_NAME, deviceId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    });
  }

  return deviceId;
}

/**
 * POST /api/spin/start
 * Registers or looks up user, ensures spin limit not exceeded, and issues signed spin token.
 */
spinRouter.post(
  '/spin/start',
  spinStartLimiter,
  async (req: Request, res: Response<StartSpinResponse>, next) => {
    try {
      const validated = StartSpinSchema.parse(req.body);
      const deviceId = validated.deviceId && validated.deviceId.length >= 10 ? validated.deviceId : resolveDeviceId(req, res, validated.deviceId);

      const result = await startSpin({
        name: validated.name,
        email: validated.email,
        phone: validated.phone,
        contact: validated.contact,
        intake: validated.intake,
        isCounselled: validated.isCounselled,
        preferredCountry: validated.preferredCountry,
        consent: validated.consent,
        deviceId,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/spin
 * Atomically consumes token, executes RNG, updates database, and returns winning slot.
 */
spinRouter.post(
  '/spin',
  spinExecutionLimiter,
  async (req: Request, res: Response<SpinResponse>, next) => {
    try {
      const validated = SpinRequestSchema.parse(req.body);
      const deviceId = validated.deviceId && validated.deviceId.length >= 10 ? validated.deviceId : resolveDeviceId(req, res, validated.deviceId);

      const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || '127.0.0.1';

      const result = await executeSpin(validated.token, clientIp, deviceId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/user/status
 * Queries current user's spin status by email/phone or device ID.
 */
spinRouter.get('/user/status', async (req: Request, res: Response<UserStatusResponse>, next) => {
  try {
    const contact = (req.query['contact'] as string) || '';
    const status = await getUserStatus(contact);
    res.json(status);
  } catch (err) {
    next(err);
  }
});
