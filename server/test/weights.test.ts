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

  it('should have 5 Better Luck Next Time slots totaling 75%', () => {
    const lossSlots = SLOTS.filter((s) => !s.isWin);
    expect(lossSlots).toHaveLength(5);
    const totalWeight = lossSlots.reduce((acc, s) => acc + s.weight, 0);
    expect(totalWeight).toBeCloseTo(75.0, 5);
    for (const slot of lossSlots) {
      expect(slot.isWin).toBe(false);
      expect(slot.isGrandPrize).toBe(false);
    }
  });

  it('should have 3 Precious Type Gift slots totaling 3% weight', () => {
    const preciousSlots = SLOTS.filter((s) => s.isGrandPrize);
    expect(preciousSlots).toHaveLength(3);
    const totalWeight = preciousSlots.reduce((acc, s) => acc + s.weight, 0);
    expect(totalWeight).toBeCloseTo(3.0, 5);
    for (const slot of preciousSlots) {
      expect(slot.isWin).toBe(true);
      expect(slot.isGrandPrize).toBe(true);
    }
  });

  it('should have 4 other win slots totaling 22%', () => {
    const normalPrizes = SLOTS.filter((s) => s.isWin && !s.isGrandPrize);
    expect(normalPrizes).toHaveLength(4);
    const totalWeight = normalPrizes.reduce((acc, s) => acc + s.weight, 0);
    expect(totalWeight).toBeCloseTo(22.0, 5);
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
