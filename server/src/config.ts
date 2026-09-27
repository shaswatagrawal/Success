import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SlotConfig } from '../../shared/types.js';

// Load .env file from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Slot Configuration: exactly 10 slots.
 * - 4 slots: "Try Again Later" (15% each = 60% total)
 * - 1 slot: "GRAND PRIZE" (2.5%)
 * - 5 slots: normal prizes (7.5% each = 37.5% total)
 *
 * Sum = 60 + 2.5 + 37.5 = 100%
 */
export const SLOTS: readonly SlotConfig[] = [
  {
    index: 0,
    prizeKey: 'grand_prize',
    label: 'Powerbank Pro',
    weight: 0.5,
    isWin: true,
    isGrandPrize: true,
    color: '#B45309', // Radiant rich gold
    textColor: '#FEF3C7',
    accentColor: '#FBBF24',
    image: '/assets/powerbank_pro.jpg',
  },
  {
    index: 1,
    prizeKey: 'try_again_1',
    label: 'Try Again',
    weight: 18.0,
    isWin: false,
    isGrandPrize: false,
    color: '#1E1B4B', // Slate dark navy
    textColor: '#94A3B8',
  },
  {
    index: 2,
    prizeKey: 'prize_earpods_1',
    label: 'Earpods Pro',
    weight: 2.5,
    isWin: true,
    isGrandPrize: false,
    color: '#BE185D', // Royal magenta
    textColor: '#FDF2F8',
    accentColor: '#F472B6',
    image: '/assets/earpods_pro.jpg',
  },
  {
    index: 3,
    prizeKey: 'try_again_2',
    label: 'Better Luck',
    weight: 18.0,
    isWin: false,
    isGrandPrize: false,
    color: '#312E81', // Deep royal indigo
    textColor: '#CBD5E1',
  },
  {
    index: 4,
    prizeKey: 'prize_rs500_1',
    label: 'Rs. 500 Cash',
    weight: 2.5,
    isWin: true,
    isGrandPrize: false,
    color: '#047857', // Emerald green
    textColor: '#ECFDF5',
    accentColor: '#34D399',
    image: '/assets/rs500_note.jpg',
  },
  {
    index: 5,
    prizeKey: 'try_again_3',
    label: 'Try Again',
    weight: 18.0,
    isWin: false,
    isGrandPrize: false,
    color: '#1E1B4B', // Slate dark navy
    textColor: '#94A3B8',
  },
  {
    index: 6,
    prizeKey: 'prize_mobile_a',
    label: 'Mobile Phone',
    weight: 0.5,
    isWin: true,
    isGrandPrize: false,
    color: '#6D28D9', // Royal violet
    textColor: '#F5F3FF',
    accentColor: '#A78BFA',
    image: '/assets/mobile_flagship.jpg',
  },
  {
    index: 7,
    prizeKey: 'try_again_4',
    label: 'Spin Again',
    weight: 18.0,
    isWin: false,
    isGrandPrize: false,
    color: '#312E81', // Deep royal indigo
    textColor: '#CBD5E1',
  },
  {
    index: 8,
    prizeKey: 'prize_rs100_b',
    label: 'Rs. 100 Bonus',
    weight: 4.0,
    isWin: true,
    isGrandPrize: false,
    color: '#0E7490', // Vibrant ocean cyan
    textColor: '#ECFEFF',
    accentColor: '#22D3EE',
    image: '/assets/rs100_note.jpg',
  },
  {
    index: 9,
    prizeKey: 'try_again_5',
    label: 'Better Luck',
    weight: 18.0,
    isWin: false,
    isGrandPrize: false,
    color: '#1E1B4B', // Slate dark navy
    textColor: '#CBD5E1',
  },
];

/**
 * Validate weights sum to exactly 100 at module initialization.
 * Throws immediately if invalid to protect system integrity.
 */
export function validateWeights(slots: readonly SlotConfig[]): void {
  if (slots.length !== 10) {
    throw new Error(`Wheel must have exactly 10 slots, found ${slots.length}`);
  }
  const sum = slots.reduce((acc, slot) => acc + slot.weight, 0);
  if (Math.abs(sum - 100) > 0.0001) {
    throw new Error(`Wheel weights must sum to exactly 100. Current sum: ${sum}`);
  }
}

// Execute startup validation
validateWeights(SLOTS);

/**
 * Typed environment configuration.
 */
export const ENV = {
  PORT: Number.parseInt(process.env['PORT'] ?? '3000', 10),
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',
  MONGODB_URI:
    process.env['MONGODB_URI'] ??
    'mongodb+srv://scarfo9989_db_user:UJFRNxglp8hiD2j1@success.hbzckgg.mongodb.net/?retryWrites=true&w=majority&appName=success',
  DATABASE_NAME: process.env['DATABASE_NAME'] ?? 'spin_the_wheel',
  ADMIN_PASSWORD: process.env['ADMIN_PASSWORD'] ?? 'AdminSecurePass2026!',
  SESSION_SECRET:
    process.env['SESSION_SECRET'] ?? 'super_secret_session_key_at_least_32_bytes_long_spin_wheel',
  IP_SALT: process.env['IP_SALT'] ?? 'salt_for_hashing_ip_addresses_change_in_production_12345',
  SPIN_LIMIT: Number.parseInt(process.env['SPIN_LIMIT'] ?? '1', 10),
  GRAND_PRIZE_MIN_SPINS: Number.parseInt(process.env['GRAND_PRIZE_MIN_SPINS'] ?? '2000', 10),
  CORS_ORIGIN: (process.env['CORS_ORIGIN'] ?? 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((s) => s.trim()),
} as const;

