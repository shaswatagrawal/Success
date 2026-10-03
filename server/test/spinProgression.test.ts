import { describe, expect, it } from 'vitest';
import { SLOTS } from '../src/config.js';
import { pickWinningSlot } from '../src/services/rng.js';

describe('Spin Progression (Precious Gifts & Gift Cards)', () => {
  it('should verify all prize slots exist for precious gifts and gift cards', () => {
    const precious1 = SLOTS.find((s) => s.prizeKey === 'precious_gift_1');
    const precious2 = SLOTS.find((s) => s.prizeKey === 'precious_gift_2');
    const precious3 = SLOTS.find((s) => s.prizeKey === 'precious_gift_3');
    const card1000 = SLOTS.find((s) => s.prizeKey === 'prize_1000_card');
    const card500 = SLOTS.find((s) => s.prizeKey === 'prize_500_card');
    const hamper = SLOTS.find((s) => s.prizeKey === 'prize_gift_hamper');
    const losses = SLOTS.filter((s) => !s.isWin);

    expect(precious1).toBeDefined();
    expect(precious2).toBeDefined();
    expect(precious3).toBeDefined();
    expect(card1000).toBeDefined();
    expect(card500).toBeDefined();
    expect(hamper).toBeDefined();
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
