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
  getGiftCard500And1000WonCount,
  getGlobalSpinCount,
  getGrandPrizeWonCount,
  getJan2027PreciousWonCount,
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

/**
 * Atomically performs the spin:
 * - Consumes the single-use token
 * - Enforces spin limit to prevent concurrency race conditions
 * - First 3 students appearing for Visa Jan 2027 Intake get 3 Precious Type Gifts
 * - Next 5 to 6 participants get NPR 1,000 and NPR 500 Gift Cards
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

  // 4. Determine Prize Allocation according to Promotion Rules:
  // - First 3 students appearing for Visa Jan 2027 Intake from Success Education & Visa Services get the 3 Precious Type Gifts
  // - Next 5 to 6 participants get around NPR 500 and NPR 1000 Gift Cards
  // - Otherwise randomized weighted RNG with infinite Better Luck Next Time
  let winningSlot: (typeof SLOTS)[number];

  const preciousSlot1 = SLOTS[0]!; // Precious Voucher 1 (Smart Tablet + Visa Fee Waiver)
  const preciousSlot2 = SLOTS[3]!; // Precious Voucher 2 (Premium ANC Headphones + IELTS Scholarship)
  const preciousSlot3 = SLOTS[7]!; // Precious Voucher 3 (Travel Luggage Suite + Study Abroad Kit)

  const card1000Slot1 = SLOTS[2]!; // NPR 1,000 Card
  const card1000Slot2 = SLOTS[9]!; // NPR 1,000 Card
  const card500Slot = SLOTS[5]!;   // NPR 500 Card
  const hamperSlot = SLOTS[10]!;   // Gift Hamper
  const lossSlots = SLOTS.filter((s) => !s.isWin);

  const getRandomLossSlot = () => {
    const randomLossIndex = crypto.randomInt(0, lossSlots.length);
    return lossSlots[randomLossIndex] ?? lossSlots[0]!;
  };

  const isJan2027Student = Boolean(
    user.intake === 'jan_2027' ||
    user.intake?.toLowerCase().includes('jan 2027') ||
    user.intake?.toLowerCase().includes('2027')
  );

  const [jan2027PreciousCount, giftCardsWonCount] = await Promise.all([
    getJan2027PreciousWonCount(),
    getGiftCard500And1000WonCount(),
  ]);

  if (isJan2027Student && jan2027PreciousCount < 3) {
    // === FIRST 3 STUDENTS FOR VISA JAN 2027 INTAKE GET 3 PREVIOUS GIFTS ===
    if (jan2027PreciousCount === 0) {
      winningSlot = preciousSlot1;
    } else if (jan2027PreciousCount === 1) {
      winningSlot = preciousSlot2;
    } else {
      winningSlot = preciousSlot3;
    }
  } else if (giftCardsWonCount < 6) {
    // === NEXT 5 TO 6 PARTICIPANTS GET NPR 500 AND NPR 1,000 GIFT CARDS ===
    // Alternating between NPR 1,000 and NPR 500
    switch (giftCardsWonCount) {
      case 0:
        winningSlot = card1000Slot1;
        break;
      case 1:
        winningSlot = card500Slot;
        break;
      case 2:
        winningSlot = card1000Slot2;
        break;
      case 3:
        winningSlot = card500Slot;
        break;
      case 4:
        winningSlot = card1000Slot1;
        break;
      case 5:
      default:
        winningSlot = card500Slot;
        break;
    }
  } else {
    // === STANDARD RANDOMIZED DISTRIBUTION ===
    const selectedSlot = pickWinningSlot(SLOTS);
    if (selectedSlot.isGrandPrize) {
      winningSlot = getRandomLossSlot();
    } else if (selectedSlot.prizeKey.includes('card') || selectedSlot.prizeKey.includes('hamper')) {
      winningSlot = selectedSlot;
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
  if (winningSlot.prizeKey === 'precious_gift_1') {
    prizeImage = '/assets/mobile_flagship.jpg';
  } else if (winningSlot.prizeKey === 'precious_gift_2') {
    prizeImage = '/assets/earpods_pro.jpg';
  } else if (winningSlot.prizeKey === 'precious_gift_3') {
    prizeImage = undefined;
  } else if (lower.includes('1000') || lower.includes('500') || lower.includes('card')) {
    prizeImage = '/assets/rs500_note.jpg';
  } else if (lower.includes('hamper') || lower.includes('mystery')) {
    prizeImage = '/assets/mystery_box.png';
  }

  // 6. Generate claim code for vouchers and gift cards
  let claimCode: string | null = null;
  if (winningSlot.prizeKey.startsWith('precious_gift')) {
    claimCode = generateClaimCode('PRECIOUS-JAN27');
  } else if (winningSlot.prizeKey.includes('1000')) {
    claimCode = generateClaimCode('GC1000');
  } else if (winningSlot.prizeKey.includes('500')) {
    claimCode = generateClaimCode('GC500');
  } else if (winningSlot.isWin) {
    claimCode = generateClaimCode('SUCCESS');
  }

  const ipHash = hashIp(clientIp);

  // 7. Persist spin record
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

  let message = 'Better luck next time! Thank you for counseling with Success Education & Visa Services.';
  if (winningSlot.prizeKey === 'precious_gift_1') {
    message = '🎉 CONGRATULATIONS! VISA JAN 2027 INTAKE WINNER #1! You won Precious Gift Voucher 1: Smart Tablet + Full Visa Processing Fee Waiver!';
  } else if (winningSlot.prizeKey === 'precious_gift_2') {
    message = '🎉 CONGRATULATIONS! VISA JAN 2027 INTAKE WINNER #2! You won Precious Gift Voucher 2: Premium ANC Headphones + Full IELTS/PTE Scholarship!';
  } else if (winningSlot.prizeKey === 'precious_gift_3') {
    message = '🎉 CONGRATULATIONS! VISA JAN 2027 INTAKE WINNER #3! You won Precious Gift Voucher 3: Luxury Travel Luggage Suite + Study Abroad Kit!';
  } else if (winningSlot.prizeKey.includes('1000')) {
    message = '🎁 CONGRATULATIONS! You won an NPR 1,000 Gift Card Voucher!';
  } else if (winningSlot.prizeKey.includes('500')) {
    message = '🎁 CONGRATULATIONS! You won an NPR 500 Gift Card Voucher!';
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
    if (slot.prizeKey === 'precious_gift_1') {
      image = '/assets/mobile_flagship.jpg';
    } else if (slot.prizeKey === 'precious_gift_2') {
      image = '/assets/earpods_pro.jpg';
    } else if (slot.prizeKey === 'precious_gift_3') {
      image = undefined;
    } else if (lower.includes('1000') || lower.includes('500') || lower.includes('balance') || lower.includes('card')) {
      image = '/assets/ntc_logo.png';
    } else if (lower.includes('hamper') || lower.includes('mystery') || lower.includes('box') || lower.includes('gift')) {
      image = '/assets/mystery_box.png';
    } else if (lower.includes('powerbank') || lower.includes('power bank')) {
      image = '/assets/powerbank_pro.jpg';
    } else if (lower.includes('earpod') || lower.includes('earbud')) {
      image = '/assets/earpods_pro.jpg';
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
