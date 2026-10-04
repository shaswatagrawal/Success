import crypto from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { initDatabase } from '../src/db/index.js';
import { createUser } from '../src/db/queries.js';
import { generateSpinToken, verifyAndConsumeSpinToken } from '../src/services/token.js';

describe('Spin Token Lifecycle and Single-Use Security', () => {
  let testUserId: string;
  const deviceId = 'test-device-uuid-12345';

  beforeAll(async () => {
    await initDatabase();
    const user = await createUser(
      `token_test_${crypto.randomBytes(4).toString('hex')}@example.com`,
      'Token Tester',
      '1234567890',
      deviceId,
      true
    );
    testUserId = user._id.toString();
  });

  it('should successfully issue and verify a single-use token', async () => {
    const token = await generateSpinToken(testUserId, deviceId);
    expect(typeof token).toBe('string');
    expect(token.includes('.')).toBe(true);

    const verified = await verifyAndConsumeSpinToken(token, deviceId);
    expect(verified.userId).toBe(testUserId);
    expect(verified.deviceId).toBe(deviceId);
  });

  it('should reject a token when used a second time', async () => {
    const token = await generateSpinToken(testUserId, deviceId);
    // First consumption succeeds
    await verifyAndConsumeSpinToken(token, deviceId);

    // Second consumption must fail
    await expect(verifyAndConsumeSpinToken(token, deviceId)).rejects.toThrowError(
      'Spin token has already been used'
    );
  });

  it('should reject a tampered token signature', async () => {
    const token = await generateSpinToken(testUserId, deviceId);
    const [payload, sig] = token.split('.');
    expect(payload).toBeDefined();
    expect(sig).toBeDefined();

    // Invert first hex char of signature
    const tamperedSig = sig![0] === 'a' ? `b${sig!.slice(1)}` : `a${sig!.slice(1)}`;
    const tamperedToken = `${payload}.${tamperedSig}`;

    await expect(verifyAndConsumeSpinToken(tamperedToken, deviceId)).rejects.toThrowError(
      'Invalid spin token signature'
    );
  });
});
