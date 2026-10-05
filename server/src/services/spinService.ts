import crypto from 'node:crypto';
import type {
  Prize,
  PublicSlotConfig,
  SpinResponse,
  StartSpinResponse,
  UserInfo,
  UserStatusResponse,
} from '../../../shared/types.js';
import { ENV, SLOTS } from '../config.js';
import {
  createUser,
  findUserById,
  findUserByIdentifier,
  getCustomPrizeNames,
  getGlobalSpinCount,
  getUserRecentSpins,
  getUserSpinCount,
  insertSpin,
} from '../db/queries.js';
import { SpinLimitError } from '../errors.js';
import { sendSpinResultEmail } from './emailService.js';
import { pickWinningSlot } from './rng.js';
import { generateSpinToken, verifyAndConsumeSpinToken } from './token.js';

export function hashIp(ip: string): string {
  const hmac = crypto.createHmac('sha256', ENV.IP_SALT);
  hmac.update(ip || '127.0.0.1');
  return hmac.digest('hex');
}

export function generateClaimCode(prefix = 'GP'): string {
  const bytes = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${bytes.slice(0, 3)}-${bytes.slice(3, 6)}`;
}

/**
 * Normalizes contact information to prevent casing or spacing bypasses.
 */
export function normalizeContact(contact: string): string {
  return contact.trim().toLowerCase();
}

/**
 * Initiates a spin attempt for a user:
 * Upserts the user record with counseling & intake metadata,
 * verifies remaining spin count, and issues a single-use signed spin token valid for 60s.
 */
export async function startSpin(userInfo: UserInfo): Promise<StartSpinResponse> {
  const email = (userInfo.email || '').trim().toLowerCase();
  const phone = (userInfo.phone || '').trim();
  const contact = userInfo.contact || (email && phone ? `${email} | ${phone}` : email || phone || '');
  const normalizedId = normalizeContact(email || phone || contact);
  const spinLimit = Math.max(1, ENV.SPIN_LIMIT || 1);

  let user = await findUserByIdentifier(normalizedId, email, phone);
  if (!user) {
    user = await createUser(
      normalizedId,
      userInfo.name.trim(),
      contact.trim(),
      userInfo.deviceId.trim(),
      userInfo.consent,
      email,
      phone,
      userInfo.intake,
      userInfo.isCounselled,
      userInfo.preferredCountry
    );
  }

  const currentSpins = await getUserSpinCount(user._id);
  if (currentSpins >= spinLimit) {
    throw new SpinLimitError(
      `You have already completed your ${spinLimit} spin allowed for this promotion.`
    );
  }

  const token = await generateSpinToken(user._id, userInfo.deviceId);
  const spinsUsed = currentSpins;
  const spinsLeft = Math.max(0, spinLimit - spinsUsed);

  return {
    success: true,
    token,
    spinsLeft,
    spinsUsed,
    spinLimit,
    userSpinNumber: currentSpins + 1,
  };
}

export function isLuckyDrawSlot(slot: { prizeKey: string; isLuckyDraw?: boolean }): boolean {
  return Boolean(slot.isLuckyDraw || slot.prizeKey.startsWith('lucky_draw'));
}

/**
 * Atomically performs the spin:
 * - Consumes the single-use token
 * - Enforces one spin per participant
 * - Lands on one of 12 equal slots
 * - Instant prizes: Rs. 500 / Rs. 1,000 Gift Vouchers
 * - Lucky Draw entries are recorded separately for the January 2027 intake pool
 */
export async function executeSpin(
  tokenString: string,
  clientIp: string,
  providedDeviceId?: string
): Promise<SpinResponse> {
  const { userId, deviceId } = await verifyAndConsumeSpinToken(
    tokenString,
    providedDeviceId
  );

  let user = await findUserById(userId);
  if (!user) {
    user = {
      _id: userId,
      identifier: providedDeviceId || deviceId,
      name: 'Participant',
      contact: providedDeviceId || deviceId,
      deviceId: providedDeviceId || deviceId,
      consent: true,
      createdAt: new Date().toISOString(),
    };
  }

  const currentSpins = await getUserSpinCount(user._id);
  if (currentSpins >= ENV.SPIN_LIMIT) {
    throw new SpinLimitError(
      `Spin limit of ${ENV.SPIN_LIMIT} reached. No more spins permitted.`
    );
  }

  const userSpinNumber = currentSpins + 1;
  const globalSpinNumber = (await getGlobalSpinCount()) + 1;
  const winningSlot = pickWinningSlot(SLOTS);
  const luckyDraw = isLuckyDrawSlot(winningSlot);

  const customNames = await getCustomPrizeNames();
  const customLabel = customNames[winningSlot.index];
  const prizeLabel = customLabel && customLabel.length > 0 ? customLabel : winningSlot.label;

  let claimCode: string | null = null;
  if (winningSlot.prizeKey.includes('1000')) {
    claimCode = generateClaimCode('GC1000');
  } else if (winningSlot.prizeKey.includes('500')) {
    claimCode = generateClaimCode('GC500');
  } else if (luckyDraw) {
    claimCode = generateClaimCode('LUCKY');
  }

  const ipHash = hashIp(clientIp);

  await insertSpin({
    userId: user._id,
    userName: user.name,
    userContact: user.contact,
    deviceId: providedDeviceId || deviceId,
    intake: user.intake,
    isCounselled: user.isCounselled,
    preferredCountry: user.preferredCountry,
    userSpinNumber,
    globalSpinNumber,
    slotIndex: winningSlot.index,
    prizeKey: winningSlot.prizeKey,
    prizeName: prizeLabel,
    isGrandPrize: winningSlot.isGrandPrize,
    isLuckyDraw: luckyDraw,
    claimCode,
    ipHash,
  });

  const spinsUsed = userSpinNumber;
  const spinsLeft = Math.max(0, ENV.SPIN_LIMIT - spinsUsed);

  const prize: Prize = {
    id: winningSlot.prizeKey,
    label: prizeLabel,
    isWin: winningSlot.isWin,
    isGrandPrize: winningSlot.isGrandPrize,
    isLuckyDraw: luckyDraw,
    color: winningSlot.color,
    textColor: winningSlot.textColor,
    accentColor: winningSlot.accentColor,
    image: winningSlot.image,
  };

  let message = `Congratulations! You won: ${prizeLabel}!`;
  if (!winningSlot.isWin || winningSlot.prizeKey.startsWith('better_luck') || prizeLabel.toLowerCase().includes('better luck')) {
    message = 'Better Luck Next Time!';
  } else if (luckyDraw) {
    message =
      "Congratulations! You've Entered the Lucky Draw! ";
  } else if (winningSlot.prizeKey.includes('1000')) {
    message = 'Congratulations! You won an instant Rs. 1,000 Gift Voucher.';
  } else if (winningSlot.prizeKey.includes('500')) {
    message = 'Congratulations! You won an instant Rs. 500 Gift Voucher.';
  }

  // 8. Send branded confirmation email to participant asynchronously
  if (user.contact && user.contact.includes('@')) {
    sendSpinResultEmail({
      recipientEmail: user.contact,
      recipientName: user.name,
      prizeName: prizeLabel,
      isWin: winningSlot.isWin,
      isGrandPrize: winningSlot.isGrandPrize,
      isLuckyDraw: luckyDraw,
      claimCode,
    }).catch((err) => {
      console.warn('[SpinService] Non-blocking email sending failed:', err);
    });
  }

  return {
    success: true,
    slotIndex: winningSlot.index,
    prize,
    spinsLeft,
    spinsUsed,
    userSpinNumber,
    globalSpinNumber,
    claimCode: claimCode ?? undefined,
    message,
  };
}

/**
 * Returns user promotion status (spins used, spins left, recent spins).
 */
export async function getUserStatus(identifierRaw: string): Promise<UserStatusResponse> {
  const normalizedId = normalizeContact(identifierRaw);
  const user = await findUserByIdentifier(normalizedId);
  const spinLimit = Math.max(1, ENV.SPIN_LIMIT || 1);

  if (!user) {
    return {
      identified: false,
      spinsUsed: 0,
      spinsLeft: spinLimit,
      spinLimit,
      canSpin: true,
      recentSpins: [],
    };
  }

  const spinsUsed = await getUserSpinCount(user._id);
  const spinsLeft = Math.max(0, spinLimit - spinsUsed);
  const recentRows = await getUserRecentSpins(user._id, 5);

  return {
    identified: true,
    spinsUsed,
    spinsLeft,
    spinLimit,
    canSpin: spinsLeft > 0,
    recentSpins: recentRows.map((r) => ({
      prizeName: r.prizeName,
      isWin: !r.prizeKey.startsWith('try_again') && !r.prizeKey.startsWith('better_luck'),
      isGrandPrize: Boolean(r.isGrandPrize),
      isLuckyDraw: Boolean(r.isLuckyDraw || r.prizeKey.startsWith('lucky_draw')),
      claimCode: r.claimCode ?? undefined,
      createdAt: r.createdAt,
    })),
  };
}

/**
 * Returns public slot configuration for the frontend wheel.
 * Crucially, probabilities/weights are NEVER included.
 */
export async function getPublicWheelConfig(): Promise<readonly PublicSlotConfig[]> {
  const customNames = await getCustomPrizeNames();

  return SLOTS.map((slot) => {
    const customLabel = customNames[slot.index];
    const label = customLabel && customLabel.length > 0 ? customLabel : slot.label;

    return {
      index: slot.index,
      prizeKey: slot.prizeKey,
      label,
      visualWeight: slot.visualWeight ?? 1,
      isWin: slot.isWin,
      isGrandPrize: slot.isGrandPrize,
      isLuckyDraw: isLuckyDrawSlot(slot),
      color: slot.color,
      textColor: slot.textColor,
      accentColor: slot.accentColor,
      image: slot.image,
    };
  });
}
