import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SlotConfig } from '../../shared/types.js';

// Load .env file from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Slot Configuration: exactly 12 slots.
 * - 1 slot: "GRAND PRIZE" — Smart Phone (2%)
 * - 4 slots: normal prizes (5% + 5% + 5% + 6% = 21% total)
 * - 7 slots: "Better Luck" (11% each = 77% total)
 *
 * Sum = 2 + 21 + 77 = 100%
 */
export const SLOTS: readonly SlotConfig[] = [
  // === GRAND PRIZE ===
  {
    index: 0,
    prizeKey: 'grand_prize',
    label: 'Smart Phone',
    weight: 2,
    visualWeight: 0.4,
    isWin: true,
    isGrandPrize: true,
    color: '#DC2626',
    textColor: '#FFFFFF',
    accentColor: '#EF4444',
    image: '/assets/mobile_flagship.jpg',
  },

  // === BETTER LUCK NEXT TIME ===
  {
    index: 1,
    prizeKey: 'better_luck_1',
    label: 'Better Luck Next Time',
    weight: 11,
    isWin: false,
    isGrandPrize: false,
    color: '#1D4ED8',
    textColor: '#FFFFFF',
  },
  {
    index: 2,
    prizeKey: 'better_luck_2',
    label: 'Better Luck Next Time',
    weight: 11,
    isWin: false,
    isGrandPrize: false,
    color: '#1E40AF',
    textColor: '#FFFFFF',
  },

  // === NORMAL PRIZE: Earpods ===
  {
    index: 3,
    prizeKey: 'prize_earpods',
    label: 'Earpods',
    weight: 5,
    isWin: true,
    isGrandPrize: false,
    color: '#B91C1C',
    textColor: '#FFFFFF',
    accentColor: '#F87171',
    image: '/assets/earpods_pro.jpg',
  },

  // === BETTER LUCK NEXT TIME ===
  {
    index: 4,
    prizeKey: 'better_luck_3',
    label: 'Better Luck Next Time',
    weight: 11,
    isWin: false,
    isGrandPrize: false,
    color: '#1D4ED8',
    textColor: '#FFFFFF',
  },

  // === NORMAL PRIZE: Powerbank ===
  {
    index: 5,
    prizeKey: 'prize_powerbank',
    label: 'Powerbank',
    weight: 5,
    isWin: true,
    isGrandPrize: false,
    color: '#DC2626',
    textColor: '#FFFFFF',
    accentColor: '#EF4444',
    image: '/assets/powerbank_pro.jpg',
  },

  // === BETTER LUCK NEXT TIME ===
  {
    index: 6,
    prizeKey: 'better_luck_4',
    label: 'Better Luck Next Time',
    weight: 11,
    isWin: false,
    isGrandPrize: false,
    color: '#1E40AF',
    textColor: '#FFFFFF',
  },

  // === NORMAL PRIZE: 500 Balance ===
  {
    index: 7,
    prizeKey: 'prize_500_balance',
    label: '500 Balance',
    weight: 5,
    isWin: true,
    isGrandPrize: false,
    color: '#B91C1C',
    textColor: '#FFFFFF',
    accentColor: '#F87171',
    image: '/assets/rs500_note.jpg',
  },

  // === BETTER LUCK NEXT TIME ===
  {
    index: 8,
    prizeKey: 'better_luck_5',
    label: 'Better Luck Next Time',
    weight: 11,
    isWin: false,
    isGrandPrize: false,
    color: '#1D4ED8',
    textColor: '#FFFFFF',
  },

  // === NORMAL PRIZE: 100 Balance ===
  {
    index: 9,
    prizeKey: 'prize_100_balance',
    label: '100 Balance',
    weight: 6,
    isWin: true,
    isGrandPrize: false,
    color: '#DC2626',
    textColor: '#FFFFFF',
    accentColor: '#EF4444',
    image: '/assets/rs100_note.jpg',
  },

  // === BETTER LUCK NEXT TIME ===
  {
    index: 10,
    prizeKey: 'better_luck_6',
    label: 'Better Luck Next Time',
    weight: 11,
    isWin: false,
    isGrandPrize: false,
    color: '#1E40AF',
    textColor: '#FFFFFF',
  },
  {
    index: 11,
    prizeKey: 'better_luck_7',
    label: 'Better Luck Next Time',
    weight: 11,
    isWin: false,
    isGrandPrize: false,
    color: '#1D4ED8',
    textColor: '#FFFFFF',
  },
];

/**
 * Validate weights sum to exactly 100 at module initialization.
 * Throws immediately if invalid to protect system integrity.
 */
export function validateWeights(slots: readonly SlotConfig[]): void {
  if (slots.length !== 12) {
    throw new Error(`Wheel must have exactly 12 slots, found ${slots.length}`);
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
  NORMAL_PRIZE_INTERVAL: Number.parseInt(process.env['NORMAL_PRIZE_INTERVAL'] ?? '10', 10),
  GRAND_PRIZE_INTERVAL: Number.parseInt(process.env['GRAND_PRIZE_INTERVAL'] ?? '60', 10),
  GRAND_PRIZE_MIN_SPINS: Number.parseInt(process.env['GRAND_PRIZE_MIN_SPINS'] ?? '60', 10),
  CORS_ORIGIN: (process.env['CORS_ORIGIN'] ?? 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((s) => s.trim()),
  EMAIL_FROM: process.env['EMAIL_FROM'] ?? '"SUCCESS Education & Visa Services" <kumaripati@successedu.com.au>',
  SMTP_HOST: process.env['SMTP_HOST'] ?? '',
  SMTP_PORT: Number.parseInt(process.env['SMTP_PORT'] ?? '587', 10),
  SMTP_SECURE: process.env['SMTP_SECURE'] === 'true',
  SMTP_USER: process.env['SMTP_USER'] ?? '',
  SMTP_PASS: process.env['SMTP_PASS'] ?? '',
} as const;


