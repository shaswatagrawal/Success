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
    weight: 13,
    isWin: false,
    isGrandPrize: false,
    color: '#1D4ED8',
    textColor: '#FFFFFF',
  },
  {
    index: 2,
    prizeKey: 'better_luck_2',
    label: 'Better Luck Next Time',
    weight: 13,
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
    weight: 13,
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
    weight: 12,
    isWin: false,
    isGrandPrize: false,
    color: '#1E40AF',
    textColor: '#FFFFFF',
  },

  // === NORMAL PRIZE: 500 Topup ===
  {
    index: 7,
    prizeKey: 'prize_500_balance',
    label: '500 Topup',
    weight: 5,
    isWin: true,
    isGrandPrize: false,
    color: '#B91C1C',
    textColor: '#FFFFFF',
    accentColor: '#F87171',
    image: '/assets/ntc_logo.png',
  },

  // === BETTER LUCK NEXT TIME ===
  {
    index: 8,
    prizeKey: 'better_luck_5',
    label: 'Better Luck Next Time',
    weight: 12,
    isWin: false,
    isGrandPrize: false,
    color: '#1D4ED8',
    textColor: '#FFFFFF',
  },

  // === NORMAL PRIZE: 100 Topup ===
  {
    index: 9,
    prizeKey: 'prize_100_balance',
    label: '100 Topup',
    weight: 6,
    isWin: true,
    isGrandPrize: false,
    color: '#DC2626',
    textColor: '#FFFFFF',
    accentColor: '#EF4444',
    image: '/assets/ncell_logo.png',
  },

  // === RARE MYSTERY BOX ===
  {
    index: 10,
    prizeKey: 'prize_mystery_box',
    label: 'Mystery Box',
    weight: 2,
    visualWeight: 0.45,
    isWin: true,
    isGrandPrize: false,
    color: '#7C3AED',
    textColor: '#FFFFFF',
    accentColor: '#FDE047',
    image: '/assets/mystery_box.png',
  },
  {
    index: 11,
    prizeKey: 'better_luck_6',
    label: 'Better Luck Next Time',
    weight: 12,
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

function parseEnvInt(val: string | undefined, defaultVal: number): number {
  if (!val || typeof val !== 'string' || val.trim() === '') return defaultVal;
  const parsed = Number.parseInt(val.trim(), 10);
  return Number.isNaN(parsed) ? defaultVal : parsed;
}

/**
 * Typed environment configuration.
 */
export const ENV = {
  PORT: parseEnvInt(process.env['PORT'], 3000),
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',
  MONGODB_URI:
    process.env['MONGODB_URI'] ??
    'mongodb+srv://scarfo9989_db_user:UJFRNxglp8hiD2j1@success.hbzckgg.mongodb.net/?retryWrites=true&w=majority&appName=success',
  DATABASE_NAME: process.env['DATABASE_NAME'] ?? 'spin_the_wheel',
  ADMIN_PASSWORD: process.env['ADMIN_PASSWORD'] ?? 'AdminSecurePass2026!',
  SESSION_SECRET:
    process.env['SESSION_SECRET'] ?? 'super_secret_session_key_at_least_32_bytes_long_spin_wheel',
  IP_SALT: process.env['IP_SALT'] ?? 'salt_for_hashing_ip_addresses_change_in_production_12345',
  SPIN_LIMIT: parseEnvInt(process.env['SPIN_LIMIT'], 1),
  NORMAL_PRIZE_INTERVAL: parseEnvInt(process.env['NORMAL_PRIZE_INTERVAL'], 10),
  MYSTERY_BOX_INTERVAL: parseEnvInt(process.env['MYSTERY_BOX_INTERVAL'], 40),
  GRAND_PRIZE_INTERVAL: parseEnvInt(process.env['GRAND_PRIZE_INTERVAL'], 60),
  GRAND_PRIZE_MIN_SPINS: parseEnvInt(process.env['GRAND_PRIZE_MIN_SPINS'], 60),
  CORS_ORIGIN: (process.env['CORS_ORIGIN'] ?? 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((s) => s.trim()),
  EMAIL_FROM: process.env['EMAIL_FROM'] ?? '"SUCCESS Education & Visa Services" <kumaripati@successedu.com.au>',
  SMTP_HOST: process.env['SMTP_HOST'] ?? '',
  SMTP_PORT: parseEnvInt(process.env['SMTP_PORT'], 587),
  SMTP_SECURE: process.env['SMTP_SECURE'] === 'true',
  SMTP_USER: process.env['SMTP_USER'] ?? '',
  SMTP_PASS: process.env['SMTP_PASS'] ?? '',
} as const;


