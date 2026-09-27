import crypto from 'node:crypto';
import { ENV } from '../config.js';
import { createSpinToken, findSpinToken, markSpinTokenUsed } from '../db/queries.js';
import { TokenError } from '../errors.js';

const TOKEN_EXPIRY_MS = 60 * 1000; // 60 seconds lifetime

function signToken(raw: string): string {
  const hmac = crypto.createHmac('sha256', ENV.SESSION_SECRET);
  hmac.update(raw);
  return hmac.digest('hex');
}

/**
 * Creates and stores a signed one-time spin token valid for 60 seconds.
 */
export async function generateSpinToken(
  userId: string,
  deviceId: string
): Promise<string> {
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const timestamp = Date.now();
  const rawPayload = `${userId}:${deviceId}:${timestamp}:${randomBytes}`;
  const signature = signToken(rawPayload);
  const fullToken = `${Buffer.from(rawPayload).toString('base64url')}.${signature}`;

  const expiresAt = timestamp + TOKEN_EXPIRY_MS;
  await createSpinToken(fullToken, userId, deviceId, expiresAt);

  return fullToken;
}

/**
 * Validates cryptographic signature, expiry, and single-use status of a spin token.
 * Marks token as consumed atomically if valid.
 */
export async function verifyAndConsumeSpinToken(
  fullToken: string,
  providedDeviceId?: string
): Promise<{ userId: string; deviceId: string }> {
  const parts = fullToken.split('.');
  if (parts.length !== 2) {
    throw new TokenError('Malformed spin token structure', 'TOKEN_MALFORMED');
  }

  const encodedPayload = parts[0];
  const signature = parts[1];

  if (!encodedPayload || !signature) {
    throw new TokenError('Invalid token segments', 'TOKEN_INVALID');
  }

  const rawPayload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
  const expectedSignature = signToken(rawPayload);

  // Constant-time signature comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedSigBuffer = Buffer.from(expectedSignature, 'hex');
  if (
    sigBuffer.length !== expectedSigBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)
  ) {
    throw new TokenError('Invalid spin token signature', 'TOKEN_SIGNATURE_MISMATCH');
  }

  // Parse payload components
  const [tokenUserId, tokenDeviceId, tokenTimestampStr] = rawPayload.split(':');
  const tokenTimestamp = Number(tokenTimestampStr);

  if (!tokenUserId || !tokenDeviceId || Number.isNaN(tokenTimestamp)) {
    throw new TokenError('Invalid spin token payload', 'TOKEN_INVALID');
  }

  // Enforce 60-second validity window
  const now = Date.now();
  if (now > tokenTimestamp + TOKEN_EXPIRY_MS || now < tokenTimestamp - 10000) {
    throw new TokenError('Spin token has expired. Please request a new spin.', 'TOKEN_EXPIRED');
  }

  if (providedDeviceId && providedDeviceId !== tokenDeviceId) {
    throw new TokenError('Device identifier mismatch for token', 'DEVICE_MISMATCH');
  }

  const record = await findSpinToken(fullToken);
  if (record) {
    if (record.used) {
      throw new TokenError('Spin token has already been used', 'TOKEN_ALREADY_USED');
    }
    if (Date.now() > record.expiresAt) {
      throw new TokenError('Spin token has expired. Please request a new spin.', 'TOKEN_EXPIRED');
    }
    await markSpinTokenUsed(record._id);
  } else {
    // Record in local store and mark consumed
    await createSpinToken(fullToken, tokenUserId, tokenDeviceId, tokenTimestamp + TOKEN_EXPIRY_MS);
    const newRecord = await findSpinToken(fullToken);
    if (newRecord) {
      await markSpinTokenUsed(newRecord._id);
    }
  }

  return {
    userId: tokenUserId,
    deviceId: tokenDeviceId,
  };
}
