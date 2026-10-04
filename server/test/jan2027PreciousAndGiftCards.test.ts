import { beforeEach, describe, expect, it } from 'vitest';
import { localDb } from '../src/db/index.js';
import { executeSpin, startSpin } from '../src/services/spinService.js';

describe('SEVS In-Office Counseling Spin & Win Promotion Flow', () => {
  beforeEach(() => {
    // Reset local database state for test isolation
    localDb.data.users = [];
    localDb.data.spins = [];
    localDb.data.spin_tokens = [];
    localDb.save();
  });

  it('should allow eligible counseled participants to spin and record results', async () => {
    const res1 = await startSpin({
      name: 'Aditya Student',
      email: 'aditya@successedu.com.au',
      phone: '9841111111',
      intake: 'jan_2027',
      isCounselled: true,
      preferredCountry: 'Australia',
      consent: true,
      deviceId: 'device-test-1111111111',
    });
    expect(res1.success).toBe(true);
    expect(res1.token).toBeDefined();

    const spin1 = await executeSpin(res1.token, '127.0.0.1', 'device-test-1111111111');
    expect(spin1.success).toBe(true);
    expect(spin1.prize).toBeDefined();
    expect(spin1.slotIndex).toBeGreaterThanOrEqual(0);
    expect(spin1.slotIndex).toBeLessThan(12);

    if (spin1.prize.isLuckyDraw) {
      expect(spin1.claimCode).toMatch(/^LUCKY-/);
      expect(spin1.message).toContain("Congratulations! You've Entered the Lucky Draw!");
    } else if (spin1.prize.id.includes('1000')) {
      expect(spin1.claimCode).toMatch(/^GC1000-/);
      expect(spin1.message).toContain('Rs. 1,000 Gift Voucher');
    } else if (spin1.prize.id.includes('500')) {
      expect(spin1.claimCode).toMatch(/^GC500-/);
      expect(spin1.message).toContain('Rs. 500 Gift Voucher');
    } else {
      expect(spin1.message).toBe('Better Luck Next Time!');
    }
  });

  it('should enforce 1 spin limit per participant', async () => {
    const startRes = await startSpin({
      name: 'Test Student',
      email: 'student@example.com',
      phone: '9842222222',
      intake: 'jan_2027',
      isCounselled: true,
      consent: true,
      deviceId: 'device-test-2222222222',
    });

    await executeSpin(startRes.token, '127.0.0.1', 'device-test-2222222222');

    // Attempting a second spin must be rejected
    await expect(
      startSpin({
        name: 'Test Student',
        email: 'student@example.com',
        phone: '9842222222',
        intake: 'jan_2027',
        isCounselled: true,
        consent: true,
        deviceId: 'device-test-2222222222',
      })
    ).rejects.toThrowError(/already completed/);
  });
});
