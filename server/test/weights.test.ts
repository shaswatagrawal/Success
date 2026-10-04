import { describe, expect, it } from 'vitest';
import { SLOTS, validateWeights } from '../src/config.js';

describe('Wheel Configuration & Weights (12 Equal Slots - All Winning)', () => {
  it('should have exactly 12 equal slots', () => {
    expect(SLOTS).toHaveLength(12);
    for (const slot of SLOTS) {
      expect(slot.weight).toBeCloseTo(100 / 12, 4);
    }
  });

  it('should have weights that sum to exactly 100%', () => {
    const sum = SLOTS.reduce((acc, slot) => acc + slot.weight, 0);
    expect(sum).toBeCloseTo(100.0, 5);
  });

  it('should have 5 Lucky Draw Entry slots (41.67% total)', () => {
    const luckySlots = SLOTS.filter((s) => s.isLuckyDraw || s.prizeKey.startsWith('lucky_draw'));
    expect(luckySlots).toHaveLength(5);
    const totalWeight = luckySlots.reduce((acc, s) => acc + s.weight, 0);
    expect(totalWeight).toBeCloseTo((500 / 12), 4);
    for (const slot of luckySlots) {
      expect(slot.label).toBe("You've Entered the Lucky Draw!");
      expect(slot.isWin).toBe(true);
    }
  });

  it('should have 3 Rs. 1,000 Gift Voucher slots (25.00% total)', () => {
    const voucher1000Slots = SLOTS.filter((s) => s.prizeKey.includes('1000'));
    expect(voucher1000Slots).toHaveLength(3);
    const totalWeight = voucher1000Slots.reduce((acc, s) => acc + s.weight, 0);
    expect(totalWeight).toBeCloseTo(25.0, 4);
    for (const slot of voucher1000Slots) {
      expect(slot.label).toBe('Rs. 1,000 Gift Voucher');
      expect(slot.isWin).toBe(true);
    }
  });

  it('should have 4 Rs. 500 Gift Voucher slots (33.33% total)', () => {
    const voucher500Slots = SLOTS.filter((s) => s.prizeKey.includes('500'));
    expect(voucher500Slots).toHaveLength(4);
    const totalWeight = voucher500Slots.reduce((acc, s) => acc + s.weight, 0);
    expect(totalWeight).toBeCloseTo((400 / 12), 4);
    for (const slot of voucher500Slots) {
      expect(slot.label).toBe('Rs. 500 Gift Voucher');
      expect(slot.isWin).toBe(true);
    }
  });

  it('should have zero loss slots (all 12 slots are winning)', () => {
    const lossSlots = SLOTS.filter((s) => !s.isWin);
    expect(lossSlots).toHaveLength(0);
  });

  it('should throw if weights do not sum to 100 or slots length is not 12', () => {
    const invalidSlots = [
      ...SLOTS.slice(0, 11),
      {
        ...SLOTS[11]!,
        weight: 5.0,
      },
    ];
    expect(() => validateWeights(invalidSlots)).toThrowError(/Wheel weights must sum to exactly 100/);
  });
});
