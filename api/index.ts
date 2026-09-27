import type { Request, Response } from 'express';
import { app } from '../server/src/index.js';
import { initDatabase } from '../server/src/db/index.js';

let isInitialized = false;

export default async function handler(req: Request, res: Response) {
  if (!isInitialized) {
    await initDatabase();
    isInitialized = true;
  }
  return app(req, res);
}
