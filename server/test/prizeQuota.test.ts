import { describe, expect, it } from 'vitest';
import { SLOTS } from '../src/config.js';

describe('Slot Configuration and Labels', () => {
  it('should have 12 slots matching the exact sequence requested', () => {
    expect(SLOTS).toHaveLength(12);

    expect(SLOTS[0]!.label).toBe("You've Entered the Lucky Draw!");
    expect(SLOTS[1]!.label).toBe('Rs. 1,000 Gift Voucher');
    expect(SLOTS[2]!.label).toBe('Rs. 500 Gift Voucher');
    expect(SLOTS[3]!.label).toBe("You've Entered the Lucky Draw!");
    expect(SLOTS[4]!.label).toBe('Rs. 500 Gift Voucher');
    expect(SLOTS[5]!.label).toBe('Rs. 1,000 Gift Voucher');
    expect(SLOTS[6]!.label).toBe("You've Entered the Lucky Draw!");
    expect(SLOTS[7]!.label).toBe('Rs. 500 Gift Voucher');
    expect(SLOTS[8]!.label).toBe('Rs. 1,000 Gift Voucher');
    expect(SLOTS[9]!.label).toBe("You've Entered the Lucky Draw!");
    expect(SLOTS[10]!.label).toBe('Rs. 500 Gift Voucher');
    expect(SLOTS[11]!.label).toBe("You've Entered the Lucky Draw!");
  });

  it('should have 5 Lucky Draw Entry slots', () => {
    const luckySlots = SLOTS.filter((s) => s.isLuckyDraw || s.prizeKey.startsWith('lucky_draw'));
    expect(luckySlots).toHaveLength(5);
    for (const slot of luckySlots) {
      expect(slot.label).toBe("You've Entered the Lucky Draw!");
    }
  });

  it('should have 3 Rs. 1,000 Voucher slots', () => {
    const voucher1000 = SLOTS.filter((s) => s.prizeKey.includes('1000'));
    expect(voucher1000).toHaveLength(3);
  });

  it('should have 4 Rs. 500 Voucher slots', () => {
    const voucher500 = SLOTS.filter((s) => s.prizeKey.includes('500'));
    expect(voucher500).toHaveLength(4);
  });
});
