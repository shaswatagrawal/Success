import { beforeAll, describe, expect, it } from 'vitest';
import { initDatabase } from '../src/db/index.js';
import { getSpinResetStatus, resetSpinNumbers } from '../src/db/queries.js';

describe('Admin Spin Reset 24-Hour Enforcement', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  it('should allow initial reset and then strictly enforce the 24-hour cooldown', async () => {
    // Check initial status
    const initialStatus = await getSpinResetStatus();
    expect(typeof initialStatus.canReset).toBe('boolean');

    if (initialStatus.canReset) {
      // Execute reset
      const resetResult = await resetSpinNumbers();
      expect(resetResult.success).toBe(true);
      expect(resetResult.canReset).toBe(false);
      expect(resetResult.lastResetAt).toBeDefined();

      // Immediately attempt a second reset -> must be rejected by 24h cooldown
      const secondStatus = await getSpinResetStatus();
      expect(secondStatus.canReset).toBe(false);
      expect(secondStatus.remainingSeconds).toBeGreaterThan(0);
      expect(secondStatus.remainingSeconds).toBeLessThanOrEqual(24 * 3600);

      // Attempting reset again must throw 24h error
      await expect(resetSpinNumbers()).rejects.toThrowError(/once every 24 hours/);
    } else {
      // If already in cooldown, verify error is thrown
      expect(initialStatus.remainingSeconds).toBeGreaterThan(0);
      await expect(resetSpinNumbers()).rejects.toThrowError(/once every 24 hours/);
    }
  });
});
