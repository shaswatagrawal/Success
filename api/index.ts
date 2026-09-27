import type { Request, Response } from 'express';
import { app } from '../server/src/index.js';
import { initDatabase } from '../server/src/db/index.js';

let initStarted = false;

export default async function handler(req: Request, res: Response): Promise<void> {
  if (!initStarted) {
    initStarted = true;
    initDatabase().catch((err) => {
      console.warn('MongoDB Atlas background connection note:', err instanceof Error ? err.message : err);
    });
  }

  return new Promise<void>((resolve) => {
    res.on('finish', () => resolve());
    res.on('close', () => resolve());
    res.on('error', () => resolve());

    try {
      app(req, res);
    } catch (err: any) {
      console.error('Vercel Express Execution Error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          error: err?.message || 'An internal server error occurred',
          code: 'SERVER_ERROR',
        });
      }
      resolve();
    }
  });
}
