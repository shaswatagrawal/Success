import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  AdminLoginSchema,
  AdminSpinQuerySchema,
  UpdatePrizeNamesSchema,
} from '../../../shared/schemas.js';
import type {
  AdminLoginRequest,
  AdminLoginResponse,
  AdminSpinListResponse,
  AdminStats,
  ResetSpinsResponse,
  ResetStatusResponse,
  UpdatePrizeNamesRequest,
  UpdatePrizeNamesResponse,
} from '../../../shared/types.js';
import { ENV, SLOTS } from '../config.js';
import {
  getAdminSpins,
  getAdminStats,
  getAllSpinsForExport,
  getSpinResetStatus,
  resetSpinNumbers,
  saveCustomPrizeNames,
} from '../db/queries.js';
import { AuthError } from '../errors.js';
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  requireAdminAuth,
} from '../middleware/auth.js';
import { adminLoginLimiter } from '../middleware/rateLimit.js';
import { getPublicWheelConfig } from '../services/spinService.js';

export const adminRouter = Router();

/**
 * POST /api/admin/login
 * Verifies admin password and issues signed httpOnly cookie.
 */
adminRouter.post(
  '/admin/login',
  adminLoginLimiter,
  (req: Request<unknown, unknown, AdminLoginRequest>, res: Response<AdminLoginResponse>, next) => {
    try {
      const validated = AdminLoginSchema.parse(req.body);

      if (validated.password !== ENV.ADMIN_PASSWORD) {
        throw new AuthError('Invalid admin password');
      }

      const sessionToken = createAdminSessionToken();

      res.cookie(ADMIN_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: ENV.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      res.json({
        success: true,
        message: 'Admin authenticated successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/admin/logout
 * Clears admin session cookie.
 */
adminRouter.post('/admin/logout', (_req: Request, res: Response) => {
  res.clearCookie(ADMIN_COOKIE_NAME);
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * GET /api/admin/me
 * Checks if current admin session is valid.
 */
adminRouter.get('/admin/me', requireAdminAuth, (_req: Request, res: Response) => {
  res.json({ authenticated: true });
});

/**
 * GET /api/admin/stats
 * Returns summary statistics and actual vs expected probability distribution.
 */
adminRouter.get(
  '/admin/stats',
  requireAdminAuth,
  async (_req: Request, res: Response<AdminStats>, next) => {
    try {
      const stats = await getAdminStats(SLOTS);
      res.json(stats);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admin/spins
 * Returns paginated spin records with search, filter by prize type, and date range.
 */
adminRouter.get(
  '/admin/spins',
  requireAdminAuth,
  async (req: Request, res: Response<AdminSpinListResponse>, next) => {
    try {
      const query = AdminSpinQuerySchema.parse(req.query);
      const data = await getAdminSpins(query);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admin/export-csv
 * Exports all spin records as a CSV file attachment.
 */
adminRouter.get(
  '/admin/export-csv',
  requireAdminAuth,
  async (_req: Request, res: Response, next) => {
    try {
      const spins = await getAllSpinsForExport();

      const headers = [
        'Global Spin #',
        'Date (UTC)',
        'Participant Name',
        'Contact',
        'User Spin #',
        'Slot Index',
        'Prize Won',
        'Is Grand Prize',
        'Claim Code',
        'IP Hash',
      ];

      const escapeCsvField = (field: string | number | boolean | null | undefined): string => {
        if (field === null || field === undefined) return '""';
        const str = String(field).replace(/"/g, '""');
        return `"${str}"`;
      };

      const csvRows = [headers.join(',')];

      for (const spin of spins) {
        csvRows.push(
          [
            spin.globalSpinNumber,
            spin.createdAt,
            escapeCsvField(spin.userName),
            escapeCsvField(spin.userContact),
            spin.userSpinNumber,
            spin.slotIndex,
            escapeCsvField(spin.prizeName),
            spin.isGrandPrize ? 'YES' : 'NO',
            escapeCsvField(spin.claimCode ?? ''),
            escapeCsvField(spin.ipHash),
          ].join(',')
        );
      }

      const csvContent = csvRows.join('\r\n');
      const filename = `spin_the_wheel_export_${new Date().toISOString().slice(0, 10)}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/admin/prizes
 * Updates custom prize names for editable slots (persisted in database).
 */
adminRouter.put(
  '/admin/prizes',
  requireAdminAuth,
  async (
    req: Request<unknown, unknown, UpdatePrizeNamesRequest>,
    res: Response<UpdatePrizeNamesResponse>,
    next
  ) => {
    try {
      const validated = UpdatePrizeNamesSchema.parse(req.body);
      await saveCustomPrizeNames(validated.customNames);

      const updatedSlots = await getPublicWheelConfig();
      res.json({
        success: true,
        message: 'Prize names updated successfully',
        updatedSlots,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/admin/reset-status
 * Checks if a 24-hour reset cooldown has passed and when the next reset is available.
 */
adminRouter.get(
  '/admin/reset-status',
  requireAdminAuth,
  async (_req: Request, res: Response<ResetStatusResponse>, next) => {
    try {
      const status = await getSpinResetStatus();
      res.json(status);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/admin/reset-spins
 * Resets all participant spin records and spin counters (rate-limited strictly to once per 24 hours).
 */
adminRouter.post(
  '/admin/reset-spins',
  requireAdminAuth,
  async (_req: Request, res: Response<ResetSpinsResponse>, next) => {
    try {
      const result = await resetSpinNumbers();
      res.json(result);
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err instanceof Error ? err.message : 'Reset failed due to 24-hour rate limit',
        lastResetAt: '',
        nextResetAvailableAt: '',
        canReset: false,
        totalSpinsCleared: 0,
      });
    }
  }
);

