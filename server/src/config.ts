import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SlotConfig } from '../../shared/types.js';

// Load .env file from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/** Equal probability for each of the 12 visual slots. */
const EQUAL_SLOT_WEIGHT = 100 / 12;

/**
 * Slot Configuration: exactly 12 equal slots for Success Education & Visa Services.
 * All slots award prizes or Lucky Draw qualification (No Better Luck Next Time).
 * Lucky Draw Entry × 5
 * Rs. 1,000 Gift Voucher × 3
 * Rs. 500 Gift Voucher × 4
 */
export const SLOTS: readonly SlotConfig[] = [
  {
    index: 0,
    prizeKey: 'lucky_draw_1',
    label: "You've Entered the Lucky Draw!",
    weight: EQUAL_SLOT_WEIGHT,
    isWin: true,
    isGrandPrize: false,
    isLuckyDraw: true,
    color: '#B45309',
    textColor: '#FEF08A',
    accentColor: '#FDE047',
  },
  {
    index: 1,
    prizeKey: 'prize_1000_voucher_1',
    label: 'Rs. 1,000 Gift Voucher',
    weight: EQUAL_SLOT_WEIGHT,
    isWin: true,
    isGrandPrize: false,
    color: '#1D4ED8',
    textColor: '#FFFFFF',
    accentColor: '#38BDF8',
  },
  {
    index: 2,
    prizeKey: 'prize_500_voucher_1',
    label: 'Rs. 500 Gift Voucher',
    weight: EQUAL_SLOT_WEIGHT,
    isWin: true,
    isGrandPrize: false,
    color: '#047857',
    textColor: '#FFFFFF',
    accentColor: '#10B981',
  },
  {
    index: 3,
    prizeKey: 'lucky_draw_2',
    label: "You've Entered the Lucky Draw!",
    weight: EQUAL_SLOT_WEIGHT,
    isWin: true,
    isGrandPrize: false,
    isLuckyDraw: true,
    color: '#92400E',
    textColor: '#FEF08A',
    accentColor: '#FDE047',
  },
  {
    index: 4,
    prizeKey: 'prize_500_voucher_2',
    label: 'Rs. 500 Gift Voucher',
    weight: EQUAL_SLOT_WEIGHT,
    isWin: true,
    isGrandPrize: false,
    color: '#065F46',
    textColor: '#FFFFFF',
    accentColor: '#34D399',
  },
  {
    index: 5,
    prizeKey: 'prize_1000_voucher_2',
    label: 'Rs. 1,000 Gift Voucher',
    weight: EQUAL_SLOT_WEIGHT,
    isWin: true,
    isGrandPrize: false,
    color: '#1E40AF',
    textColor: '#FFFFFF',
    accentColor: '#93C5FD',
  },
  {
    index: 6,
    prizeKey: 'lucky_draw_3',
    label: "You've Entered the Lucky Draw!",
    weight: EQUAL_SLOT_WEIGHT,
    isWin: true,
    isGrandPrize: false,
    isLuckyDraw: true,
    color: '#B45309',
    textColor: '#FEF08A',
    accentColor: '#FDE047',
  },
  {
    index: 7,
    prizeKey: 'prize_500_voucher_3',
    label: 'Rs. 500 Gift Voucher',
    weight: EQUAL_SLOT_WEIGHT,
    isWin: true,
    isGrandPrize: false,
    color: '#047857',
    textColor: '#FFFFFF',
    accentColor: '#10B981',
  },
  {
    index: 8,
    prizeKey: 'prize_1000_voucher_3',
    label: 'Rs. 1,000 Gift Voucher',
    weight: EQUAL_SLOT_WEIGHT,
    isWin: true,
    isGrandPrize: false,
    color: '#1D4ED8',
    textColor: '#FFFFFF',
    accentColor: '#38BDF8',
  },
  {
    index: 9,
    prizeKey: 'lucky_draw_4',
    label: "You've Entered the Lucky Draw!",
    weight: EQUAL_SLOT_WEIGHT,
    isWin: true,
    isGrandPrize: false,
    isLuckyDraw: true,
    color: '#92400E',
    textColor: '#FEF08A',
    accentColor: '#FDE047',
  },
  {
    index: 10,
    prizeKey: 'prize_500_voucher_4',
    label: 'Rs. 500 Gift Voucher',
    weight: EQUAL_SLOT_WEIGHT,
    isWin: true,
    isGrandPrize: false,
    color: '#065F46',
    textColor: '#FFFFFF',
    accentColor: '#34D399',
  },
  {
    index: 11,
    prizeKey: 'lucky_draw_5',
    label: "You've Entered the Lucky Draw!",
    weight: EQUAL_SLOT_WEIGHT,
    isWin: true,
    isGrandPrize: false,
    isLuckyDraw: true,
    color: '#B45309',
    textColor: '#FEF08A',
    accentColor: '#FDE047',
  },
];

/**
 * Validate weights sum to 100 and that the wheel has 12 equal slots.
 */
export function validateWeights(slots: readonly SlotConfig[]): void {
  if (slots.length !== 12) {
    throw new Error(`Wheel must have exactly 12 slots, found ${slots.length}`);
  }
  const sum = slots.reduce((acc, slot) => acc + slot.weight, 0);
  if (Math.abs(sum - 100) > 0.01) {
    throw new Error(`Wheel weights must sum to exactly 100. Current sum: ${sum}`);
  }
}

// Execute startup validation
validateWeights(SLOTS);

function parseEnvInt(val: string | undefined, defaultVal: number): number {
  if (!val || typeof val === 'undefined' || typeof val !== 'string' || val.trim() === '') return defaultVal;
  const parsed = Number.parseInt(val.trim(), 10);
  return Number.isNaN(parsed) ? defaultVal : parsed;
}

/**
 * Instant voucher inventory is unlimited for office counselling spins.
 * Premium gifts (3) are awarded later from the Lucky Draw visa pool, not on the wheel.
 */
export const PRIZE_QUOTAS = {
  prize_1000_voucher: Number.POSITIVE_INFINITY,
  prize_500_voucher: Number.POSITIVE_INFINITY,
  lucky_draw: Number.POSITIVE_INFINITY,
} as const;

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
  ADMIN_PASSWORD: process.env['ADMIN_PASSWORD'] ?? 'SUCCESS',
  SESSION_SECRET:
    process.env['SESSION_SECRET'] ?? 'super_secret_session_key_at_least_32_bytes_long_spin_wheel',
  IP_SALT: process.env['IP_SALT'] ?? 'salt_for_hashing_ip_addresses_change_in_production_12345',
  SPIN_LIMIT: parseEnvInt(process.env['SPIN_LIMIT'], 1),
  NORMAL_PRIZE_INTERVAL: parseEnvInt(process.env['NORMAL_PRIZE_INTERVAL'], 10),
  MYSTERY_BOX_INTERVAL: parseEnvInt(process.env['MYSTERY_BOX_INTERVAL'], 40),
  GRAND_PRIZE_INTERVAL: parseEnvInt(process.env['GRAND_PRIZE_INTERVAL'], 60),
  GRAND_PRIZE_MIN_SPINS: parseEnvInt(process.env['GRAND_PRIZE_MIN_SPINS'], 60),
  JAN_2027_PREVIOUS_GIFTS_LIMIT: 3,
  GIFT_CARD_1000_LIMIT: parseEnvInt(process.env['GIFT_CARD_1000_LIMIT'], 10),
  GIFT_CARD_500_LIMIT: parseEnvInt(process.env['GIFT_CARD_500_LIMIT'], 10),
  GIFT_HAMPER_LIMIT: parseEnvInt(process.env['GIFT_HAMPER_LIMIT'], 10),
  GRAND_PRIZE_LIMIT: parseEnvInt(process.env['GRAND_PRIZE_LIMIT'], 3),
  EARBUD_LIMIT: parseEnvInt(process.env['EARBUD_LIMIT'], 3),
  POWERBANK_LIMIT: parseEnvInt(process.env['POWERBANK_LIMIT'], 2),
  TOPUP_500_LIMIT: parseEnvInt(process.env['TOPUP_500_LIMIT'], 5),
  TOPUP_100_LIMIT: parseEnvInt(process.env['TOPUP_100_LIMIT'], 20),
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
