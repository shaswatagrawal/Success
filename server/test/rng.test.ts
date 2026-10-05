import { describe, expect, it } from 'vitest';
import { SLOTS } from '../src/config.js';
import { pickWinningSlot } from '../src/services/rng.js';

describe('Cryptographically Secure Weighted Picker', () => {
  it('should select 12 equal winning slots matching expected probabilities within statistical tolerance', () => {
    const N = 30_000;
    const counts = new Map<number, number>();
    for (let i = 0; i < SLOTS.length; i++) {
      counts.set(i, 0);
    }

    for (let i = 0; i < N; i++) {
      const slot = pickWinningSlot(SLOTS);
      counts.set(slot.index, (counts.get(slot.index) ?? 0) + 1);
    }

    // Check individual slots were all picked at least once
    for (let i = 0; i < SLOTS.length; i++) {
      expect(counts.get(i)).toBeGreaterThan(0);
    }

    // Group checks
    let luckyDrawTotal = 0;
    let voucher1000Total = 0;
    let voucher500Total = 0;
    let betterLuckTotal = 0;

    for (const slot of SLOTS) {
      const count = counts.get(slot.index) ?? 0;
      if (slot.isLuckyDraw || slot.prizeKey.startsWith('lucky_draw')) {
        luckyDrawTotal += count;
      } else if (slot.prizeKey.includes('1000')) {
        voucher1000Total += count;
      } else if (slot.prizeKey.includes('500')) {
        voucher500Total += count;
      } else if (!slot.isWin || slot.prizeKey.startsWith('better_luck')) {
        betterLuckTotal += count;
      }
    }

    const luckyDrawPct = (luckyDrawTotal / N) * 100;
    const voucher1000Pct = (voucher1000Total / N) * 100;
    const voucher500Pct = (voucher500Total / N) * 100;
    const betterLuckPct = (betterLuckTotal / N) * 100;

    // Expected: 25.0% lucky draw (3 slots), 16.67% 1000 voucher (2 slots), 33.33% 500 voucher (4 slots), 25.0% Better Luck Next Time (3 slots)
    expect(luckyDrawPct).toBeGreaterThan(22.0);
    expect(luckyDrawPct).toBeLessThan(28.0);

    expect(voucher1000Pct).toBeGreaterThan(14.0);
    expect(voucher1000Pct).toBeLessThan(20.0);

    expect(voucher500Pct).toBeGreaterThan(30.0);
    expect(voucher500Pct).toBeLessThan(37.0);

    expect(betterLuckPct).toBeGreaterThan(22.0);
    expect(betterLuckPct).toBeLessThan(28.0);
  });
});
