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
/**
 * Slot Configuration: exactly 12 slots.
 * - 3 slots: Precious Type Gifts (1% each = 3%)
 * - 2 slots: NPR 1,000 Gift Cards (6% + 6% = 12%)
 * - 1 slot: NPR 500 Gift Card (6%)
 * - 1 slot: Exclusive Gift Hamper (4%)
 * - 5 slots: Better Luck Next Time (14% + 14% + 14% + 14% + 19% = 75%)
 *
 * Sum = 3 + 12 + 6 + 4 + 75 = 100%
 */
export const SLOTS: readonly SlotConfig[] = [
  // === PRECIOUS GIFT 1: Smart Tablet + Visa Waiver (Slot 0) ===
  {
    index: 0,
    prizeKey: 'precious_gift_1',
    label: 'Precious Voucher 1',
    weight: 1,
    isWin: true,
    isGrandPrize: true,
    color: '#DC2626',
    textColor: '#FFFFFF',
    accentColor: '#FDE047',
  },

  // === BETTER LUCK NEXT TIME ===
  {
    index: 1,
    prizeKey: 'better_luck_1',
    label: 'Better Luck Next Time',
    weight: 14,
    isWin: false,
    isGrandPrize: false,
    color: '#1D4ED8',
    textColor: '#FFFFFF',
    image: '/assets/clover.png',
  },

  // === NPR 1,000 GIFT CARD (Slot 2) ===
  {
    index: 2,
    prizeKey: 'prize_1000_card',
    label: 'NPR 1,000 Balance',
    weight: 6,
    isWin: true,
    isGrandPrize: false,
    color: '#DC2626',
    textColor: '#FFFFFF',
    accentColor: '#FDE047',
  },

  // === PRECIOUS GIFT 2: ANC Headset + IELTS Scholarship (Slot 3) ===
  {
    index: 3,
    prizeKey: 'precious_gift_2',
    label: 'Precious Voucher 2',
    weight: 1,
    isWin: true,
    isGrandPrize: true,
    color: '#B91C1C',
    textColor: '#FFFFFF',
    accentColor: '#FDE047',
    image: '/assets/earpods_pro.jpg',
  },

  // === BETTER LUCK NEXT TIME ===
  {
    index: 4,
    prizeKey: 'better_luck_2',
    label: 'Better Luck Next Time',
    weight: 14,
    isWin: false,
    isGrandPrize: false,
    color: '#1E40AF',
    textColor: '#FFFFFF',
    image: '/assets/clover.png',
  },

  // === NPR 500 GIFT CARD (Slot 5) ===
  {
    index: 5,
    prizeKey: 'prize_500_card',
    label: 'NPR 500 Balance',
    weight: 6,
    isWin: true,
    isGrandPrize: false,
    color: '#DC2626',
    textColor: '#FFFFFF',
    accentColor: '#EF4444',
  },

  // === BETTER LUCK NEXT TIME ===
  {
    index: 6,
    prizeKey: 'better_luck_3',
    label: 'Better Luck Next Time',
    weight: 14,
    isWin: false,
    isGrandPrize: false,
    color: '#1D4ED8',
    textColor: '#FFFFFF',
    image: '/assets/clover.png',
  },

  // === PRECIOUS GIFT 3: Luxury Travel Luggage + Study Abroad Kit (Slot 7) ===
  {
    index: 7,
    prizeKey: 'precious_gift_3',
    label: 'Precious Voucher 3',
    weight: 1,
    isWin: true,
    isGrandPrize: true,
    color: '#7C3AED',
    textColor: '#FFFFFF',
    accentColor: '#FDE047',
  },

  // === BETTER LUCK NEXT TIME ===
  {
    index: 8,
    prizeKey: 'better_luck_4',
    label: 'Better Luck Next Time',
    weight: 14,
    isWin: false,
    isGrandPrize: false,
    color: '#1E40AF',
    textColor: '#FFFFFF',
    image: '/assets/clover.png',
  },

  // === NPR 1,000 GIFT CARD (Slot 9) ===
  {
    index: 9,
    prizeKey: 'prize_1000_card_2',
    label: 'NPR 1,000 Balance',
    weight: 6,
    isWin: true,
    isGrandPrize: false,
    color: '#DC2626',
    textColor: '#FFFFFF',
    accentColor: '#FDE047',
  },

  // === GIFT HAMPER (Slot 10) ===
  {
    index: 10,
    prizeKey: 'prize_gift_hamper',
    label: 'Gift Hamper',
    weight: 4,
    isWin: true,
    isGrandPrize: false,
    color: '#7C3AED',
    textColor: '#FFFFFF',
    accentColor: '#FDE047',
    image: '/assets/mystery_box.png',
  },

  // === BETTER LUCK NEXT TIME ===
  {
    index: 11,
    prizeKey: 'better_luck_5',
    label: 'Better Luck Next Time',
    weight: 19,
    isWin: false,
    isGrandPrize: false,
    color: '#1D4ED8',
    textColor: '#FFFFFF',
    image: '/assets/clover.png',
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
 * Prize Quota / Inventory configuration:
 * - 3 Precious Type Gifts reserved for first 3 Jan 2027 visa intake students
 * - NPR 1000 & 500 Gift Cards for next 5 to 6 participants
 */
export const PRIZE_QUOTAS = {
  precious_gift_1: 1,
  precious_gift_2: 1,
  precious_gift_3: 1,
  prize_1000_card: 10,
  prize_500_card: 10,
  prize_gift_hamper: 10,
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
  // Winner limits
  JAN_2027_PREVIOUS_GIFTS_LIMIT: 3,
  GIFT_CARD_1000_LIMIT: parseEnvInt(process.env['GIFT_CARD_1000_LIMIT'], 10),
  GIFT_CARD_500_LIMIT: parseEnvInt(process.env['GIFT_CARD_500_LIMIT'], 10),
  GIFT_HAMPER_LIMIT: parseEnvInt(process.env['GIFT_HAMPER_LIMIT'], 10),
  // Legacy aliases for test compatibility
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


