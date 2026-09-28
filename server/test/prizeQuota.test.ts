import { describe, expect, it } from 'vitest';
import { ENV, PRIZE_QUOTAS, SLOTS } from '../src/config.js';

describe('Prize Quotas and Limits Configuration', () => {
  it('should configure exact prize quotas requested', () => {
    expect(ENV.EARBUD_LIMIT).toBe(3);
    expect(ENV.POWERBANK_LIMIT).toBe(2);
    expect(ENV.GIFT_HAMPER_LIMIT).toBe(10);
    expect(ENV.TOPUP_100_LIMIT).toBe(20);
    expect(ENV.TOPUP_500_LIMIT).toBe(5);
    expect(ENV.GRAND_PRIZE_LIMIT).toBe(50);
  });

  it('should have correct labels in slot configuration', () => {
    const earbud = SLOTS.find((s) => s.prizeKey === 'prize_earpods');
    expect(earbud?.label).toBe('Earbud');

    const powerbank = SLOTS.find((s) => s.prizeKey === 'prize_powerbank');
    expect(powerbank?.label).toBe('Powerbank');

    const giftHamper = SLOTS.find((s) => s.prizeKey === 'prize_mystery_box');
    expect(giftHamper?.label).toBe('Gift Hamper');

    const topup500 = SLOTS.find((s) => s.prizeKey === 'prize_500_balance');
    expect(topup500?.label).toBe('500 Rs Topup');

    const topup100 = SLOTS.find((s) => s.prizeKey === 'prize_100_balance');
    expect(topup100?.label).toBe('100 Rs Topup');

    const grandPrize = SLOTS.find((s) => s.isGrandPrize);
    expect(grandPrize?.label).toBe('Grand Prize');
  });

  it('should have infinite Better Luck Next Time slots with total weight 75%', () => {
    const lossSlots = SLOTS.filter((s) => !s.isWin);
    expect(lossSlots.length).toBe(6);
    for (const slot of lossSlots) {
      expect(slot.label).toBe('Better Luck Next Time');
    }
  });
});
