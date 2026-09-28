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
  getGrandPrizeWonCount,
  getPrizeWonCount,
  getUserRecentSpins,
  getUserSpinCount,
  insertSpin,
} from '../db/queries.js';
import { SpinLimitError, ValidationError } from '../errors.js';
import { sendSpinResultEmail } from './emailService.js';
import { pickWinningSlot } from './rng.js';
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
  const spinLimit = Math.max(1, ENV.SPIN_LIMIT || 1);

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

  // 4. Spin Outcome Distribution:
  // - Phase 1 (Spins 1 to 20): Showcase distribution so all item categories (Grand Prize, Earbud, Powerbank, Gift Hamper, 500 Rs Topup, 100 Rs Topup) are won across the first 20 spins along with Better Luck Next Time.
  // - Phase 2 (Spins 21+): Fully randomized (weighted CSPRNG) among all available prizes with remaining quota, with infinite Better Luck Next Time.
  let winningSlot: (typeof SLOTS)[number];

  const grandSlot = SLOTS.find((s) => s.isGrandPrize) ?? SLOTS[0]!;
  const earbudSlot = SLOTS.find((s) => s.prizeKey === 'prize_earpods' || s.index === 3);
  const powerbankSlot = SLOTS.find((s) => s.prizeKey === 'prize_powerbank' || s.index === 5);
  const hamperSlot = SLOTS.find((s) => s.prizeKey === 'prize_mystery_box' || s.prizeKey === 'prize_gift_hamper' || s.index === 10);
  const topup500Slot = SLOTS.find((s) => s.prizeKey === 'prize_500_balance' || s.index === 7);
  const topup100Slot = SLOTS.find((s) => s.prizeKey === 'prize_100_balance' || s.index === 9);
  const lossSlots = SLOTS.filter((s) => !s.isWin);

  const [
    grandPrizeWonCount,
    earbudWonCount,
    powerbankWonCount,
    giftHamperWonCount,
    topup500WonCount,
    topup100WonCount,
  ] = await Promise.all([
    getGrandPrizeWonCount(),
    getPrizeWonCount(['prize_earpods'], 3),
    getPrizeWonCount(['prize_powerbank'], 5),
    getPrizeWonCount(['prize_mystery_box', 'prize_gift_hamper'], 10),
    getPrizeWonCount(['prize_500_balance'], 7),
    getPrizeWonCount(['prize_100_balance'], 9),
  ]);

  const canWinGrand = grandPrizeWonCount < ENV.GRAND_PRIZE_LIMIT;
  const canWinEarbud = earbudWonCount < ENV.EARBUD_LIMIT;
  const canWinPowerbank = powerbankWonCount < ENV.POWERBANK_LIMIT;
  const canWinGiftHamper = giftHamperWonCount < ENV.GIFT_HAMPER_LIMIT;
  const canWin500 = topup500WonCount < ENV.TOPUP_500_LIMIT;
  const canWin100 = topup100WonCount < ENV.TOPUP_100_LIMIT;

  const getRandomLossSlot = () => {
    const randomLossIndex = crypto.randomInt(0, lossSlots.length);
    return lossSlots[randomLossIndex] ?? lossSlots[0]!;
  };

  if (globalSpinNumber <= 20) {
    // --- PHASE 1: First 20 spins ensure all items are awarded across the promotion start ---
    // Spin 2:  100 Rs Topup
    // Spin 5:  Earbud
    // Spin 8:  Powerbank
    // Spin 11: 500 Rs Topup
    // Spin 14: Gift Hamper
    // Spin 17: 100 Rs Topup
    // Spin 20: Grand Prize
    // Spins 1, 3, 4, 6, 7, 9, 10, 12, 13, 15, 16, 18, 19: Better Luck Next Time
    switch (globalSpinNumber) {
      case 2:
        winningSlot = topup100Slot && canWin100 ? topup100Slot : getRandomLossSlot();
        break;
      case 5:
        winningSlot = earbudSlot && canWinEarbud ? earbudSlot : getRandomLossSlot();
        break;
      case 8:
        winningSlot = powerbankSlot && canWinPowerbank ? powerbankSlot : getRandomLossSlot();
        break;
      case 11:
        winningSlot = topup500Slot && canWin500 ? topup500Slot : getRandomLossSlot();
        break;
      case 14:
        winningSlot = hamperSlot && canWinGiftHamper ? hamperSlot : getRandomLossSlot();
        break;
      case 17:
        winningSlot = topup100Slot && canWin100 ? topup100Slot : getRandomLossSlot();
        break;
      case 20:
        winningSlot = grandSlot && canWinGrand ? grandSlot : getRandomLossSlot();
        break;
      default:
        winningSlot = getRandomLossSlot();
        break;
    }
  } else {
    // --- PHASE 2: Spins 21+ Fully Randomized ---
    // Cryptographically secure weighted RNG across all wheel slots.
    // If a selected prize has reached its winner quota, automatically falls back to Better Luck Next Time.
    const selectedSlot = pickWinningSlot(SLOTS);

    if (selectedSlot.isGrandPrize) {
      winningSlot = canWinGrand ? selectedSlot : getRandomLossSlot();
    } else if (selectedSlot.prizeKey === 'prize_earpods' || selectedSlot.index === 3) {
      winningSlot = canWinEarbud ? selectedSlot : getRandomLossSlot();
    } else if (selectedSlot.prizeKey === 'prize_powerbank' || selectedSlot.index === 5) {
      winningSlot = canWinPowerbank ? selectedSlot : getRandomLossSlot();
    } else if (selectedSlot.prizeKey === 'prize_500_balance' || selectedSlot.index === 7) {
      winningSlot = canWin500 ? selectedSlot : getRandomLossSlot();
    } else if (selectedSlot.prizeKey === 'prize_100_balance' || selectedSlot.index === 9) {
      winningSlot = canWin100 ? selectedSlot : getRandomLossSlot();
    } else if (
      selectedSlot.prizeKey === 'prize_mystery_box' ||
      selectedSlot.prizeKey === 'prize_gift_hamper' ||
      selectedSlot.index === 10
    ) {
      winningSlot = canWinGiftHamper ? selectedSlot : getRandomLossSlot();
    } else if (!selectedSlot.isWin) {
      winningSlot = selectedSlot;
    } else {
      winningSlot = getRandomLossSlot();
    }
  }

  // 5. Fetch any admin-configured custom prize labels
  const customNames = await getCustomPrizeNames();
  const customLabel = customNames[winningSlot.index];
  const prizeLabel = customLabel && customLabel.length > 0 ? customLabel : winningSlot.label;

  let prizeImage = winningSlot.image;
  const lower = prizeLabel.toLowerCase();
  if (winningSlot.isGrandPrize || winningSlot.prizeKey === 'grand_prize') {
    prizeImage = undefined;
  } else if (lower.includes('powerbank') || lower.includes('power bank') || lower.includes('charger')) {
    prizeImage = '/assets/powerbank_pro.jpg';
  } else if (lower.includes('earpod') || lower.includes('earbud') || lower.includes('airpod')) {
    prizeImage = '/assets/earpods_pro.jpg';
  } else if (lower.includes('500') || lower.includes('ntc')) {
    prizeImage = '/assets/ntc_logo.png';
  } else if (lower.includes('100') || lower.includes('ncell') || lower.includes('cash') || lower.includes('bonus')) {
    prizeImage = '/assets/ncell_logo.png';
  } else if (lower.includes('hamper') || lower.includes('mystery') || lower.includes('box') || lower.includes('gift')) {
    prizeImage = '/assets/mystery_box.png';
  } else if (lower.includes('kite') || lower.includes('changa')) {
    prizeImage = '/assets/kite_rainbow.png';
  }

  // 6. Generate claim code for grand prize and physical/gift items
  const isPhysicalPrize = winningSlot.isGrandPrize ||
    winningSlot.prizeKey === 'prize_mystery_box' ||
    winningSlot.prizeKey === 'prize_gift_hamper' ||
    winningSlot.prizeKey === 'prize_earpods' ||
    winningSlot.prizeKey === 'prize_powerbank';
  const claimCode = (winningSlot.isWin && isPhysicalPrize) ? generateClaimCode() : null;
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
  } else if (winningSlot.prizeKey === 'prize_mystery_box' || winningSlot.prizeKey === 'prize_gift_hamper' || lower.includes('hamper')) {
    message = `🎁 WOW! YOU UNLOCKED THE EXCLUSIVE ${prizeLabel.toUpperCase()}! 🎉`;
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
    if (slot.isGrandPrize || slot.prizeKey === 'grand_prize') {
      image = undefined;
    } else if (lower.includes('powerbank') || lower.includes('power bank') || lower.includes('charger')) {
      image = '/assets/powerbank_pro.jpg';
    } else if (lower.includes('earpod') || lower.includes('earbud') || lower.includes('airpod')) {
      image = '/assets/earpods_pro.jpg';
    } else if (lower.includes('500') || lower.includes('ntc')) {
      image = '/assets/ntc_logo.png';
    } else if (lower.includes('100') || lower.includes('ncell') || lower.includes('cash') || lower.includes('bonus')) {
      image = '/assets/ncell_logo.png';
    } else if (lower.includes('hamper') || lower.includes('mystery') || lower.includes('box') || lower.includes('gift')) {
      image = '/assets/mystery_box.png';
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
