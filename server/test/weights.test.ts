import { describe, expect, it } from 'vitest';
import { SLOTS, validateWeights } from '../src/config.js';

describe('Wheel Configuration & Weights', () => {
  it('should have exactly 10 slots', () => {
    expect(SLOTS).toHaveLength(10);
  });

  it('should have weights that sum to exactly 100%', () => {
    const sum = SLOTS.reduce((acc, slot) => acc + slot.weight, 0);
    expect(sum).toBeCloseTo(100.0, 5);
  });

  it('should have 4 Try Again Later slots totaling 60%', () => {
    const tryAgainSlots = SLOTS.filter((s) => s.label === 'Try Again Later');
    expect(tryAgainSlots).toHaveLength(4);
    const totalWeight = tryAgainSlots.reduce((acc, s) => acc + s.weight, 0);
    expect(totalWeight).toBeCloseTo(60.0, 5);
    for (const slot of tryAgainSlots) {
      expect(slot.weight).toBeCloseTo(15.0, 5);
      expect(slot.isWin).toBe(false);
      expect(slot.isGrandPrize).toBe(false);
    }
  });

  it('should have exactly 1 GRAND PRIZE slot with 2.5% weight', () => {
    const grandPrizeSlots = SLOTS.filter((s) => s.isGrandPrize);
    expect(grandPrizeSlots).toHaveLength(1);
    const grandPrize = grandPrizeSlots[0];
    expect(grandPrize).toBeDefined();
    expect(grandPrize?.weight).toBeCloseTo(2.5, 5);
    expect(grandPrize?.isWin).toBe(true);
  });

  it('should have 5 normal prize slots totaling 37.5% (7.5% each)', () => {
    const normalPrizes = SLOTS.filter((s) => s.isWin && !s.isGrandPrize);
    expect(normalPrizes).toHaveLength(5);
    const totalWeight = normalPrizes.reduce((acc, s) => acc + s.weight, 0);
    expect(totalWeight).toBeCloseTo(37.5, 5);
    for (const slot of normalPrizes) {
      expect(slot.weight).toBeCloseTo(7.5, 5);
    }
  });

  it('should throw if weights do not sum to 100', () => {
    const invalidSlots = [
      ...SLOTS.slice(0, 9),
      {
        ...SLOTS[9]!,
        weight: 10.0, // Drops total to 95%
      },
    ];
    expect(() => validateWeights(invalidSlots)).toThrowError(/Wheel weights must sum to exactly 100/);
  });
});
