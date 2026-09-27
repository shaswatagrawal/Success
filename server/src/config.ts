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
    weight: 2.5,
    isWin: true,
    isGrandPrize: true,
    color: '#DC2626', // Vibrant Crimson Red
    textColor: '#FFFFFF',
    accentColor: '#EF4444',
    image: '/assets/powerbank_pro.jpg',
  },
  {
    index: 1,
    prizeKey: 'try_again_1',
    label: 'Try Again Later',
    weight: 15.0,
    isWin: false,
    isGrandPrize: false,
    color: '#1D4ED8', // Electric Royal Blue
    textColor: '#FFFFFF',
  },
  {
    index: 2,
    prizeKey: 'prize_earpods_1',
    label: 'Earpods Pro',
    weight: 7.5,
    isWin: true,
    isGrandPrize: false,
    color: '#B91C1C', // Deep Crimson Red
    textColor: '#FFFFFF',
    accentColor: '#F87171',
    image: '/assets/earpods_pro.jpg',
  },
  {
    index: 3,
    prizeKey: 'try_again_2',
    label: 'Try Again Later',
    weight: 15.0,
    isWin: false,
    isGrandPrize: false,
    color: '#1E40AF', // Deep Sapphire Blue
    textColor: '#FFFFFF',
  },
  {
    index: 4,
    prizeKey: 'prize_rs500_1',
    label: 'Rs. 500 Cash',
    weight: 7.5,
    isWin: true,
    isGrandPrize: false,
    color: '#DC2626', // Vibrant Crimson Red
    textColor: '#FFFFFF',
    accentColor: '#EF4444',
    image: '/assets/rs500_note.jpg',
  },
  {
    index: 5,
    prizeKey: 'try_again_3',
    label: 'Try Again Later',
    weight: 15.0,
    isWin: false,
    isGrandPrize: false,
    color: '#1D4ED8', // Electric Royal Blue
    textColor: '#FFFFFF',
  },
  {
    index: 6,
    prizeKey: 'prize_mobile_a',
    label: 'Mobile Phone',
    weight: 7.5,
    isWin: true,
    isGrandPrize: false,
    color: '#B91C1C', // Deep Crimson Red
    textColor: '#FFFFFF',
    accentColor: '#F87171',
    image: '/assets/mobile_flagship.jpg',
  },
  {
    index: 7,
    prizeKey: 'try_again_4',
    label: 'Try Again Later',
    weight: 15.0,
    isWin: false,
    isGrandPrize: false,
    color: '#1E40AF', // Deep Sapphire Blue
    textColor: '#FFFFFF',
  },
  {
    index: 8,
    prizeKey: 'prize_rs100_b',
    label: 'Rs. 100 Bonus',
    weight: 7.5,
    isWin: true,
    isGrandPrize: false,
    color: '#DC2626', // Vibrant Crimson Red
    textColor: '#FFFFFF',
    accentColor: '#EF4444',
    image: '/assets/rs100_note.jpg',
  },
  {
    index: 9,
    prizeKey: 'prize_voucher_c',
    label: 'Gift Voucher',
    weight: 7.5,
    isWin: true,
    isGrandPrize: false,
    color: '#1D4ED8', // Electric Royal Blue
    textColor: '#FFFFFF',
    accentColor: '#60A5FA',
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

