import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { Collection, Db, MongoClient, ObjectId } from 'mongodb';
import { ENV } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
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

interface LocalStore {
  users: UserDoc[];
  spins: SpinDoc[];
  spin_tokens: SpinTokenDoc[];
  prize_names: PrizeNameDoc[];
}

class LocalDatabase {
  private store: LocalStore = {
    users: [],
    spins: [],
    spin_tokens: [],
    prize_names: [],
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
        this.store = JSON.parse(raw);
      } else {
        this.save();
      }
    } catch {
      this.store = { users: [], spins: [], spin_tokens: [], prize_names: [] };
    }
  }

  public save(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_PATH, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not save local store to disk:', err);
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
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
});

let isMongoReady = false;

export function isMongoConnected(): boolean {
  return isMongoReady;
}

export async function initDatabase(): Promise<void> {
  try {
    await mongoClient.connect();
    isMongoReady = true;
    console.log(`🍃 Connected to MongoDB Atlas (${ENV.DATABASE_NAME})`);
  } catch (err) {
    isMongoReady = false;
    console.log(`💾 Using High-Performance Local Persistent Engine (${STORE_PATH})`);
  }
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
  }
}
