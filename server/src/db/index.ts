import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { Collection, Db, MongoClient } from 'mongodb';
import { ENV } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In serverless environments (Vercel / Lambda), filesystem outside os.tmpdir() is strictly read-only
const isServerless = Boolean(process.env['VERCEL'] || process.env['AWS_LAMBDA_FUNCTION_NAME']);
const DATA_DIR = isServerless
  ? path.join(os.tmpdir(), 'spin_the_wheel_data')
  : path.resolve(__dirname, '../../data');
const STORE_PATH = path.join(DATA_DIR, 'wheel_store.json');

export interface UserDoc {
  _id: string;
  identifier: string;
  name: string;
  contact: string;
  deviceId: string;
  consent: boolean;
  createdAt: string;
}

export interface SpinDoc {
  _id: string;
  userId: string;
  userName: string;
  userContact: string;
  deviceId: string;
  userSpinNumber: number;
  globalSpinNumber: number;
  slotIndex: number;
  prizeKey: string;
  prizeName: string;
  isGrandPrize: boolean;
  claimCode: string | null;
  ipHash: string;
  createdAt: string;
}

export interface SpinTokenDoc {
  _id: string;
  token: string;
  userId: string;
  deviceId: string;
  expiresAt: number;
  used: boolean;
  usedAt: number | null;
  createdAt: number;
}

export interface PrizeNameDoc {
  _id: string;
  slotIndex: number;
  customName: string;
  updatedAt: string;
}

export interface SystemSettingDoc {
  _id: string;
  key: string;
  value: any;
  updatedAt: string;
}

interface LocalStore {
  users: UserDoc[];
  spins: SpinDoc[];
  spin_tokens: SpinTokenDoc[];
  prize_names: PrizeNameDoc[];
  system_settings: SystemSettingDoc[];
}

class LocalDatabase {
  private store: LocalStore = {
    users: [],
    spins: [],
    spin_tokens: [],
    prize_names: [],
    system_settings: [],
  };

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        this.store = {
          users: parsed.users || [],
          spins: parsed.spins || [],
          spin_tokens: parsed.spin_tokens || [],
          prize_names: parsed.prize_names || [],
          system_settings: parsed.system_settings || [],
        };
      } else {
        this.save();
      }
    } catch {
      this.store = { users: [], spins: [], spin_tokens: [], prize_names: [], system_settings: [] };
    }
  }

  public save(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_PATH, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch {
      // In read-only environments, keep in-memory without throwing error
    }
  }

  public get data(): LocalStore {
    return this.store;
  }
}

export const localDb = new LocalDatabase();

export function generateId(): string {
  return crypto.randomBytes(12).toString('hex');
}

export const mongoClient = new MongoClient(ENV.MONGODB_URI, {
  maxPoolSize: 10,
  minPoolSize: 1,
  serverSelectionTimeoutMS: 2500,
  connectTimeoutMS: 2500,
});

let isMongoReady = false;
let connectPromise: Promise<void> | null = null;

export function isMongoConnected(): boolean {
  return isMongoReady;
}

export function getDb(): Db {
  return mongoClient.db(ENV.DATABASE_NAME);
}

export async function initDatabase(): Promise<void> {
  if (isMongoReady) return;
  if (!connectPromise) {
    connectPromise = (async () => {
      try {
        await mongoClient.connect();
        isMongoReady = true;
        console.log(`🍃 Connected to MongoDB Atlas (${ENV.DATABASE_NAME})`);
      } catch (err) {
        isMongoReady = false;
        connectPromise = null;
        console.warn('⚠️ MongoDB Atlas connection note:', err instanceof Error ? err.message : err);
      }
    })();
  }
  return connectPromise;
}

export async function closeDatabase(): Promise<void> {
  localDb.save();
  if (isMongoReady) {
    try {
      await mongoClient.close();
    } catch {
      // Ignored on teardown
    }
    isMongoReady = false;
    connectPromise = null;
  }
}
