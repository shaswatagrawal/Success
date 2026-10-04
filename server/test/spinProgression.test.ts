import { describe, expect, it } from 'vitest';
import { SLOTS } from '../src/config.js';
import { pickWinningSlot } from '../src/services/rng.js';

describe('Spin Slots & Random Selection (All Winning)', () => {
  it('should verify all 12 slots are properly defined and winning', () => {
    expect(SLOTS).toHaveLength(12);

    const luckySlots = SLOTS.filter((s) => s.isLuckyDraw || s.prizeKey.startsWith('lucky_draw'));
    const voucher1000 = SLOTS.filter((s) => s.prizeKey.includes('1000'));
    const voucher500 = SLOTS.filter((s) => s.prizeKey.includes('500'));
    const losses = SLOTS.filter((s) => !s.isWin);

    expect(luckySlots).toHaveLength(5);
    expect(voucher1000).toHaveLength(3);
    expect(voucher500).toHaveLength(4);
    expect(losses).toHaveLength(0);
  });

  it('should produce valid random slot indices between 0 and 11 using CSPRNG', () => {
    const sampleSize = 100;
    const pickedSlots = new Set<number>();

    for (let i = 0; i < sampleSize; i++) {
      const slot = pickWinningSlot(SLOTS);
      expect(slot.index).toBeGreaterThanOrEqual(0);
      expect(slot.index).toBeLessThan(12);
      pickedSlots.add(slot.index);
    }

    // Over 100 iterations, multiple distinct slots should be randomly chosen
    expect(pickedSlots.size).toBeGreaterThanOrEqual(4);
  });
});
