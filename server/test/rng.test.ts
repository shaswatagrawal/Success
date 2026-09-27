import { describe, expect, it } from 'vitest';
import { SLOTS } from '../src/config.js';
import { pickWinningSlot } from '../src/services/rng.js';

describe('Cryptographically Secure Weighted Picker', () => {
  it('should select slots matching expected probabilities within statistical tolerance', () => {
    const N = 20_000;
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
    let lossTotal = 0;
    let grandPrizeTotal = 0;
    let normalPrizesTotal = 0;

    for (const slot of SLOTS) {
      const count = counts.get(slot.index) ?? 0;
      if (slot.isGrandPrize) {
        grandPrizeTotal += count;
      } else if (!slot.isWin) {
        lossTotal += count;
      } else {
        normalPrizesTotal += count;
      }
    }

    const lossPct = (lossTotal / N) * 100;
    const grandPrizePct = (grandPrizeTotal / N) * 100;
    const normalPrizesPct = (normalPrizesTotal / N) * 100;

    // Expected: 75% loss, 2% grand prize, 23% other wins
    expect(lossPct).toBeGreaterThan(70.0);
    expect(lossPct).toBeLessThan(80.0);

    expect(grandPrizePct).toBeGreaterThan(1.0);
    expect(grandPrizePct).toBeLessThan(3.5);

    expect(normalPrizesPct).toBeGreaterThan(19.0);
    expect(normalPrizesPct).toBeLessThan(27.0);
  });
});
