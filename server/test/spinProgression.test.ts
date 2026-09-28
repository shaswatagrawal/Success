import { describe, expect, it } from 'vitest';
import { SLOTS } from '../src/config.js';
import { pickWinningSlot } from '../src/services/rng.js';

describe('Spin Progression (First 20 showcase & Post-20 randomized)', () => {
  it('should verify all prize slots exist for the first 20 spins showcase', () => {
    const grand = SLOTS.find((s) => s.isGrandPrize);
    const earbud = SLOTS.find((s) => s.prizeKey === 'prize_earpods');
    const powerbank = SLOTS.find((s) => s.prizeKey === 'prize_powerbank');
    const hamper = SLOTS.find((s) => s.prizeKey === 'prize_mystery_box');
    const topup500 = SLOTS.find((s) => s.prizeKey === 'prize_500_balance');
    const topup100 = SLOTS.find((s) => s.prizeKey === 'prize_100_balance');
    const losses = SLOTS.filter((s) => !s.isWin);

    expect(grand).toBeDefined();
    expect(earbud).toBeDefined();
    expect(powerbank).toBeDefined();
    expect(hamper).toBeDefined();
    expect(topup500).toBeDefined();
    expect(topup100).toBeDefined();
    expect(losses.length).toBeGreaterThanOrEqual(1);
  });

  it('should produce valid random slots for post-20 spins using CSPRNG', () => {
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
