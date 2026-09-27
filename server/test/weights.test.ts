import { describe, expect, it } from 'vitest';
import { SLOTS, validateWeights } from '../src/config.js';

describe('Wheel Configuration & Weights', () => {
  it('should have exactly 12 slots', () => {
    expect(SLOTS).toHaveLength(12);
  });

  it('should have weights that sum to exactly 100%', () => {
    const sum = SLOTS.reduce((acc, slot) => acc + slot.weight, 0);
    expect(sum).toBeCloseTo(100.0, 5);
  });

  it('should have 6 Better Luck Next Time slots totaling 75%', () => {
    const lossSlots = SLOTS.filter((s) => !s.isWin);
    expect(lossSlots).toHaveLength(6);
    const totalWeight = lossSlots.reduce((acc, s) => acc + s.weight, 0);
    expect(totalWeight).toBeCloseTo(75.0, 5);
    for (const slot of lossSlots) {
      expect(slot.isWin).toBe(false);
      expect(slot.isGrandPrize).toBe(false);
    }
  });

  it('should have exactly 1 GRAND PRIZE slot with 2% weight', () => {
    const grandPrizeSlots = SLOTS.filter((s) => s.isGrandPrize);
    expect(grandPrizeSlots).toHaveLength(1);
    const grandPrize = grandPrizeSlots[0];
    expect(grandPrize).toBeDefined();
    expect(grandPrize?.weight).toBeCloseTo(2.0, 5);
    expect(grandPrize?.isWin).toBe(true);
  });

  it('should have 5 other win slots totaling 23%', () => {
    const normalPrizes = SLOTS.filter((s) => s.isWin && !s.isGrandPrize);
    expect(normalPrizes).toHaveLength(5);
    const totalWeight = normalPrizes.reduce((acc, s) => acc + s.weight, 0);
    expect(totalWeight).toBeCloseTo(23.0, 5);
  });

  it('should throw if weights do not sum to 100', () => {
    const invalidSlots = [
      ...SLOTS.slice(0, 11),
      {
        ...SLOTS[11]!,
        weight: 5.0, // Drops total to 93%
      },
    ];
    expect(() => validateWeights(invalidSlots)).toThrowError(/Wheel weights must sum to exactly 100/);
  });
});
