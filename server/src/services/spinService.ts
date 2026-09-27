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
import { SpinLimitError, ValidationError } from '../errors.js';
import { sendSpinResultEmail } from './emailService.js';
import { generateSpinToken, verifyAndConsumeSpinToken } from './token.js';

export function hashIp(ip: string): string {
  const hmac = crypto.createHmac('sha256', ENV.IP_SALT);
  hmac.update(ip || '127.0.0.1');
  return hmac.digest('hex');
}

export function generateClaimCode(): string {
  // Generates clean format: GP-XXXX-XXXX
  const bytes = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `GP-${bytes.slice(0, 4)}-${bytes.slice(4, 8)}`;
}

/**
 * Normalizes contact information to prevent casing or spacing bypasses.
 */
export function normalizeContact(contact: string): string {
  return contact.trim().toLowerCase();
}

/**
 * Initiates a spin attempt for a user:
 * Upserts the user record, verifies remaining spin count,
 * and issues a single-use signed spin token valid for 60s.
 */
export async function startSpin(userInfo: UserInfo): Promise<StartSpinResponse> {
  const normalizedId = normalizeContact(userInfo.contact);

  let user = await findUserByIdentifier(normalizedId);
  if (!user) {
    user = await createUser(
      normalizedId,
      userInfo.name.trim(),
      userInfo.contact.trim(),
      userInfo.deviceId.trim(),
      userInfo.consent
    );
  }

  const currentSpins = await getUserSpinCount(user._id);
  if (currentSpins >= ENV.SPIN_LIMIT) {
    throw new SpinLimitError(
      `You have already completed your ${ENV.SPIN_LIMIT} spin allowed for this promotion.`
    );
  }

  const token = await generateSpinToken(user._id, userInfo.deviceId);
  const spinsUsed = currentSpins;
  const spinsLeft = Math.max(0, ENV.SPIN_LIMIT - spinsUsed);

  return {
    success: true,
    token,
    spinsLeft,
    spinsUsed,
    spinLimit: ENV.SPIN_LIMIT,
    userSpinNumber: currentSpins + 1,
  };
}

/**
 * Atomically performs the spin:
 * - Consumes the single-use token
 * - Enforces spin limit to prevent concurrency race conditions
 * - Computes winning slot using cryptographically secure weighted RNG
 * - Records spin and returns result
 */
export async function executeSpin(
  tokenString: string,
  clientIp: string,
  providedDeviceId?: string
): Promise<SpinResponse> {
  // 1. Verify and consume the single-use token
  const { userId, deviceId } = await verifyAndConsumeSpinToken(
    tokenString,
    providedDeviceId
  );

  const user = await findUserById(userId);
  if (!user) {
    throw new ValidationError('Associated participant account not found');
  }

  // 2. Strict check on spin limit
  const currentSpins = await getUserSpinCount(user._id);
  if (currentSpins >= ENV.SPIN_LIMIT) {
    throw new SpinLimitError(
      `Spin limit of ${ENV.SPIN_LIMIT} reached. No more spins permitted.`
    );
  }

  // 3. Spin counters
  const userSpinNumber = currentSpins + 1;
  const globalSpinNumber = (await getGlobalSpinCount()) + 1;

  // 4. Controlled spin distribution:
  // - Grand Prize every 60 spins (60, 120, 180, ...)
  // - Normal Prize every 10 spins (10, 20, 30, 40, 50, 70, ...)
  // - Better Luck for all other spins (randomly distributed among Better Luck slices)
  let winningSlot: (typeof SLOTS)[number];

  const grandSlot = SLOTS.find((s) => s.isGrandPrize) ?? SLOTS[0]!;
  const mysterySlot = SLOTS.find((s) => s.prizeKey === 'prize_mystery_box');
  const normalSlots = SLOTS.filter((s) => s.isWin && !s.isGrandPrize && s.prizeKey !== 'prize_mystery_box');
  const lossSlots = SLOTS.filter((s) => !s.isWin);

  if (globalSpinNumber > 0 && globalSpinNumber % ENV.GRAND_PRIZE_INTERVAL === 0) {
    // Grand Prize milestone (every 60 spins)
    winningSlot = grandSlot;
  } else if (mysterySlot && globalSpinNumber > 0 && globalSpinNumber % ENV.MYSTERY_BOX_INTERVAL === 0) {
    // Rare Mystery Box milestone (every 40 spins)
    winningSlot = mysterySlot;
  } else if (globalSpinNumber > 0 && globalSpinNumber % ENV.NORMAL_PRIZE_INTERVAL === 0) {
    // Normal Prize milestone (every 10 spins)
    const randomNormalIndex = crypto.randomInt(0, normalSlots.length);
    winningSlot = normalSlots[randomNormalIndex] ?? normalSlots[0]!;
  } else {
    // Better Luck Next Time for all other spins
    const randomLossIndex = crypto.randomInt(0, lossSlots.length);
    winningSlot = lossSlots[randomLossIndex] ?? lossSlots[0]!;
  }

  // 5. Fetch any admin-configured custom prize labels
  const customNames = await getCustomPrizeNames();
  const customLabel = customNames[winningSlot.index];
  const prizeLabel = customLabel && customLabel.length > 0 ? customLabel : winningSlot.label;

  let prizeImage = winningSlot.image;
  const lower = prizeLabel.toLowerCase();
  if (lower.includes('powerbank') || lower.includes('power bank') || lower.includes('charger')) {
    prizeImage = '/assets/powerbank_pro.jpg';
  } else if (lower.includes('mobile') || lower.includes('phone') || lower.includes('smartphone')) {
    prizeImage = '/assets/mobile_flagship.jpg';
  } else if (lower.includes('earpod') || lower.includes('earbud') || lower.includes('airpod')) {
    prizeImage = '/assets/earpods_pro.jpg';
  } else if (lower.includes('500')) {
    prizeImage = '/assets/rs500_note.jpg';
  } else if (lower.includes('100') || lower.includes('cash') || lower.includes('bonus')) {
    prizeImage = '/assets/rs100_note.jpg';
  } else if (lower.includes('mystery') || lower.includes('box')) {
    prizeImage = '/assets/mystery_box.png';
  } else if (lower.includes('kite') || lower.includes('changa')) {
    prizeImage = '/assets/kite_rainbow.png';
  }

  // 6. Generate claim code if grand prize winner or mystery box
  const claimCode = (winningSlot.isGrandPrize || winningSlot.prizeKey === 'prize_mystery_box') ? generateClaimCode() : null;
  const ipHash = hashIp(clientIp);

      // 7. Persist spin record
      await insertSpin({
        userId: user._id,
        userName: user.name,
        userContact: user.contact,
        deviceId: providedDeviceId || deviceId,
        userSpinNumber,
        globalSpinNumber,
        slotIndex: winningSlot.index,
        prizeKey: winningSlot.prizeKey,
        prizeName: prizeLabel,
        isGrandPrize: winningSlot.isGrandPrize,
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
        color: winningSlot.color,
        textColor: winningSlot.textColor,
        accentColor: winningSlot.accentColor,
        image: prizeImage,
      };

      let message = 'Better luck next time! Thanks for participating.';
      if (winningSlot.isGrandPrize) {
        message = '🎉 CONGRATULATIONS! YOU WON THE GRAND PRIZE! 🎉';
      } else if (winningSlot.prizeKey === 'prize_mystery_box') {
        message = '🎁 WOW! YOU UNLOCKED THE EXCLUSIVE MYSTERY BOX! 🎁';
      } else if (winningSlot.isWin) {
        message = `🎉 Congratulations! You won: ${prizeLabel}!`;
      }

      // 8. Send branded confirmation email to participant asynchronously
      if (user.contact && user.contact.includes('@')) {
        sendSpinResultEmail({
          recipientEmail: user.contact,
          recipientName: user.name,
          prizeName: prizeLabel,
          isWin: winningSlot.isWin,
          isGrandPrize: winningSlot.isGrandPrize,
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

  if (!user) {
    return {
      identified: false,
      spinsUsed: 0,
      spinsLeft: ENV.SPIN_LIMIT,
      spinLimit: ENV.SPIN_LIMIT,
      canSpin: true,
      recentSpins: [],
    };
  }

  const spinsUsed = await getUserSpinCount(user._id);
  const spinsLeft = Math.max(0, ENV.SPIN_LIMIT - spinsUsed);
  const recentRows = await getUserRecentSpins(user._id, 5);

  return {
    identified: true,
    spinsUsed,
    spinsLeft,
    spinLimit: ENV.SPIN_LIMIT,
    canSpin: spinsLeft > 0,
    recentSpins: recentRows.map((r) => ({
      prizeName: r.prizeName,
      isWin: !r.prizeKey.startsWith('try_again'),
      isGrandPrize: Boolean(r.isGrandPrize),
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
    let image = slot.image;

    const lower = label.toLowerCase();
    if (lower.includes('powerbank') || lower.includes('power bank') || lower.includes('charger')) {
      image = '/assets/powerbank_pro.jpg';
    } else if (lower.includes('mobile') || lower.includes('phone') || lower.includes('smartphone')) {
      image = '/assets/mobile_flagship.jpg';
    } else if (lower.includes('earpod') || lower.includes('earbud') || lower.includes('airpod')) {
      image = '/assets/earpods_pro.jpg';
    } else if (lower.includes('500')) {
      image = '/assets/rs500_note.jpg';
    } else if (lower.includes('100') || lower.includes('cash') || lower.includes('bonus')) {
      image = '/assets/rs100_note.jpg';
    } else if (lower.includes('kite') || lower.includes('changa')) {
      image = '/assets/kite_rainbow.png';
    }

    return {
      index: slot.index,
      prizeKey: slot.prizeKey,
      label,
      visualWeight: slot.visualWeight,
      isWin: slot.isWin,
      isGrandPrize: slot.isGrandPrize,
      color: slot.color,
      textColor: slot.textColor,
      accentColor: slot.accentColor,
      image,
    };
  });
}
