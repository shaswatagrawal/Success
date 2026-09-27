import crypto from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { ENV } from '../src/config.js';
import { initDatabase } from '../src/db/index.js';
import { SpinLimitError } from '../src/errors.js';
import { executeSpin, startSpin } from '../src/services/spinService.js';

describe('Spin Limit Enforcement', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  it('should allow spins up to the limit and reject attempts beyond it', async () => {
    const testEmail = `tester_${crypto.randomBytes(4).toString('hex')}@example.com`;
    const deviceId = crypto.randomUUID();
    const userInfo = {
      name: 'Test Participant',
      contact: testEmail,
      consent: true,
      deviceId,
    };

    const spinLimit = ENV.SPIN_LIMIT; // default 3

    // Execute allowed spins
    for (let i = 1; i <= spinLimit; i++) {
      const startResult = await startSpin(userInfo);
      expect(startResult.success).toBe(true);
      expect(startResult.spinsUsed).toBe(i - 1);
      expect(startResult.spinsLeft).toBe(spinLimit - (i - 1));

      const spinResult = await executeSpin(startResult.token, '127.0.0.1', deviceId);
      expect(spinResult.success).toBe(true);
      expect(spinResult.userSpinNumber).toBe(i);
      expect(spinResult.spinsUsed).toBe(i);
      expect(spinResult.spinsLeft).toBe(spinLimit - i);
    }

    // Attempting another spin must throw SpinLimitError at startSpin
    await expect(startSpin(userInfo)).rejects.toThrowError(SpinLimitError);
  });
});
