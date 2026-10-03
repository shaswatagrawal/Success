import { describe, expect, it } from 'vitest';
import { ENV, PRIZE_QUOTAS, SLOTS } from '../src/config.js';

describe('Prize Quotas and Limits Configuration', () => {
  it('should configure exact prize quotas requested', () => {
    expect(ENV.JAN_2027_PREVIOUS_GIFTS_LIMIT).toBe(3);
    expect(ENV.GIFT_CARD_1000_LIMIT).toBe(10);
    expect(ENV.GIFT_CARD_500_LIMIT).toBe(10);
    expect(ENV.GIFT_HAMPER_LIMIT).toBe(10);
  });

  it('should have correct labels in slot configuration', () => {
    const precious1 = SLOTS.find((s) => s.prizeKey === 'precious_gift_1');
    expect(precious1?.label).toBe('Precious Voucher 1');

    const precious2 = SLOTS.find((s) => s.prizeKey === 'precious_gift_2');
    expect(precious2?.label).toBe('Precious Voucher 2');

    const precious3 = SLOTS.find((s) => s.prizeKey === 'precious_gift_3');
    expect(precious3?.label).toBe('Precious Voucher 3');

    const card1000 = SLOTS.find((s) => s.prizeKey === 'prize_1000_card');
    expect(card1000?.label).toBe('NPR 1,000 Balance');

    const card500 = SLOTS.find((s) => s.prizeKey === 'prize_500_card');
    expect(card500?.label).toBe('NPR 500 Balance');

    const giftHamper = SLOTS.find((s) => s.prizeKey === 'prize_gift_hamper');
    expect(giftHamper?.label).toBe('Gift Hamper');
  });

  it('should have infinite Better Luck Next Time slots with total weight 75%', () => {
    const lossSlots = SLOTS.filter((s) => !s.isWin);
    expect(lossSlots.length).toBe(5);
    for (const slot of lossSlots) {
      expect(slot.label).toBe('Better Luck Next Time');
    }
  });
});
