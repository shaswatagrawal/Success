import { beforeEach, describe, expect, it } from 'vitest';
import { localDb } from '../src/db/index.js';
import { executeSpin, startSpin } from '../src/services/spinService.js';

describe('Visa Jan 2027 Intake & Gift Cards Promotion Flow', () => {
  beforeEach(() => {
    // Reset local database state for isolation
    localDb.data.users = [];
    localDb.data.spins = [];
    localDb.data.spin_tokens = [];
    localDb.save();
  });

  it('should award 3 precious type gifts to the first 3 Jan 2027 visa intake students', async () => {
    // Student 1: Jan 2027 Visa Intake
    const res1 = await startSpin({
      name: 'Aditya Student One',
      email: 'student1@successedu.com.au',
      phone: '9841111111',
      intake: 'jan_2027',
      isCounselled: true,
      preferredCountry: 'Australia',
      consent: true,
      deviceId: 'device-test-1111111111',
    });
    expect(res1.success).toBe(true);

    const spin1 = await executeSpin(res1.token, '127.0.0.1', 'device-test-1111111111');
    expect(spin1.success).toBe(true);
    expect(spin1.prize.id).toBe('precious_gift_1');
    expect(spin1.prize.isGrandPrize).toBe(true);
    expect(spin1.claimCode).toMatch(/^PRECIOUS-JAN27-/);
    expect(spin1.message).toContain('VISA JAN 2027 INTAKE WINNER #1');

    // Student 2: Jan 2027 Visa Intake
    const res2 = await startSpin({
      name: 'Binod Student Two',
      email: 'student2@successedu.com.au',
      phone: '9842222222',
      intake: 'jan_2027',
      isCounselled: true,
      preferredCountry: 'United Kingdom',
      consent: true,
      deviceId: 'device-test-2222222222',
    });
    const spin2 = await executeSpin(res2.token, '127.0.0.1', 'device-test-2222222222');
    expect(spin2.success).toBe(true);
    expect(spin2.prize.id).toBe('precious_gift_2');
    expect(spin2.prize.isGrandPrize).toBe(true);
    expect(spin2.claimCode).toMatch(/^PRECIOUS-JAN27-/);
    expect(spin2.message).toContain('VISA JAN 2027 INTAKE WINNER #2');

    // Student 3: Jan 2027 Visa Intake
    const res3 = await startSpin({
      name: 'Chirag Student Three',
      email: 'student3@successedu.com.au',
      phone: '9843333333',
      intake: 'jan_2027',
      isCounselled: true,
      preferredCountry: 'USA',
      consent: true,
      deviceId: 'device-test-3333333333',
    });
    const spin3 = await executeSpin(res3.token, '127.0.0.1', 'device-test-3333333333');
    expect(spin3.success).toBe(true);
    expect(spin3.prize.id).toBe('precious_gift_3');
    expect(spin3.prize.isGrandPrize).toBe(true);
    expect(spin3.claimCode).toMatch(/^PRECIOUS-JAN27-/);
    expect(spin3.message).toContain('VISA JAN 2027 INTAKE WINNER #3');
  });

  it('should award NPR 1,000 and NPR 500 gift cards to the next 5 to 6 participants', async () => {
    // 3 Jan 2027 winners are already awarded or other participants visit
    const giftCardWinners = [
      { name: 'Participant 4', email: 'p4@example.com', phone: '9844444444' },
      { name: 'Participant 5', email: 'p5@example.com', phone: '9845555555' },
      { name: 'Participant 6', email: 'p6@example.com', phone: '9846666666' },
      { name: 'Participant 7', email: 'p7@example.com', phone: '9847777777' },
      { name: 'Participant 8', email: 'p8@example.com', phone: '9848888888' },
      { name: 'Participant 9', email: 'p9@example.com', phone: '9849999999' },
    ];

    for (let i = 0; i < giftCardWinners.length; i++) {
      const p = giftCardWinners[i]!;
      const deviceId = `device-p-${i}-123456789`;
      const startRes = await startSpin({
        name: p.name,
        email: p.email,
        phone: p.phone,
        intake: 'general_counseling',
        isCounselled: true,
        consent: true,
        deviceId,
      });

      const spin = await executeSpin(startRes.token, '127.0.0.1', deviceId);
      expect(spin.success).toBe(true);
      expect(spin.prize.isWin).toBe(true);
      // Must be either NPR 1,000 Card or NPR 500 Card
      const isCard = spin.prize.id.includes('card');
      expect(isCard).toBe(true);
      expect(spin.claimCode).toMatch(/^GC(1000|500)-/);
    }
  });
});
