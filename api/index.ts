import type { Request, Response } from 'express';
import { app } from '../server/src/index.js';
import { initDatabase } from '../server/src/db/index.js';

let isInitialized = false;

export default async function handler(req: Request, res: Response) {
  try {
    if (!isInitialized) {
      await initDatabase();
      isInitialized = true;
    }
    return app(req, res);
  } catch (error: any) {
    console.error('Vercel Serverless Handler Error:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: error?.message || 'A server error occurred during request execution',
        code: 'SERVERLESS_HANDLER_ERROR',
      });
    }
  }
}

