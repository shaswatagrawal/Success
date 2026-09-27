import { Router } from 'express';
import type { Request, Response } from 'express';
import type { WheelConfigResponse } from '../../../shared/types.js';
import { ENV } from '../config.js';
import { getPublicWheelConfig } from '../services/spinService.js';

export const configRouter = Router();

/**
 * GET /api/wheel-config
 * Returns wheel visual layout and labels for rendering.
 * NEVER returns server-side RNG weights or probabilities.
 */
configRouter.get(
  '/wheel-config',
  async (_req: Request, res: Response<WheelConfigResponse>, next) => {
    try {
      const slots = await getPublicWheelConfig();
      res.json({
        totalSlots: slots.length,
        slots,
        spinLimit: ENV.SPIN_LIMIT,
      });
    } catch (err) {
      next(err);
    }
  }
);
