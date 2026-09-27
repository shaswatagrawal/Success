import type {
  AdminSpinListResponse,
  AdminSpinQuery,
  AdminStats,
  DistributionStat,
  SlotConfig,
  SpinRecord,
} from '../../../shared/types.js';
import {
  generateId,
  localDb,
  PrizeNameDoc,
  SpinDoc,
  SpinTokenDoc,
  UserDoc,
} from './index.js';

export async function findUserByIdentifier(identifier: string): Promise<UserDoc | null> {
  const user = localDb.data.users.find((u) => u.identifier === identifier);
  return user || null;
}

export async function findUserById(id: string): Promise<UserDoc | null> {
  const user = localDb.data.users.find((u) => u._id === id);
  return user || null;
}

export async function createUser(
  identifier: string,
  name: string,
  contact: string,
  deviceId: string,
  consent: boolean
): Promise<UserDoc> {
  const doc: UserDoc = {
    _id: generateId(),
    identifier,
    name,
    contact,
    deviceId,
    consent,
    createdAt: new Date().toISOString(),
  };

  localDb.data.users.push(doc);
  localDb.save();
  return doc;
}

export async function getUserSpinCount(userId: string): Promise<number> {
  return localDb.data.spins.filter((s) => s.userId === userId).length;
}

export async function getUserRecentSpins(
  userId: string,
  limit = 5
): Promise<readonly SpinDoc[]> {
  return localDb.data.spins
    .filter((s) => s.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function createSpinToken(
  token: string,
  userId: string,
  deviceId: string,
  expiresAt: number
): Promise<void> {
  const doc: SpinTokenDoc = {
    _id: generateId(),
    token,
    userId,
    deviceId,
    expiresAt,
    used: false,
    usedAt: null,
    createdAt: Date.now(),
  };

  localDb.data.spin_tokens.push(doc);
  localDb.save();
}

export async function findSpinToken(token: string): Promise<SpinTokenDoc | null> {
  const t = localDb.data.spin_tokens.find((item) => item.token === token);
  return t || null;
}

export async function markSpinTokenUsed(tokenId: string): Promise<void> {
  const token = localDb.data.spin_tokens.find((item) => item._id === tokenId);
  if (token) {
    token.used = true;
    token.usedAt = Date.now();
    localDb.save();
  }
}

export async function getGlobalSpinCount(): Promise<number> {
  return localDb.data.spins.length;
}

export async function insertSpin(params: {
  readonly userId: string;
  readonly userName: string;
  readonly userContact: string;
  readonly deviceId: string;
  readonly userSpinNumber: number;
  readonly globalSpinNumber: number;
  readonly slotIndex: number;
  readonly prizeKey: string;
  readonly prizeName: string;
  readonly isGrandPrize: boolean;
  readonly claimCode: string | null;
  readonly ipHash: string;
}): Promise<string> {
  const id = generateId();
  const doc: SpinDoc = {
    _id: id,
    userId: params.userId,
    userName: params.userName,
    userContact: params.userContact,
    deviceId: params.deviceId,
    userSpinNumber: params.userSpinNumber,
    globalSpinNumber: params.globalSpinNumber,
    slotIndex: params.slotIndex,
    prizeKey: params.prizeKey,
    prizeName: params.prizeName,
    isGrandPrize: params.isGrandPrize,
    claimCode: params.claimCode,
    ipHash: params.ipHash,
    createdAt: new Date().toISOString(),
  };

  localDb.data.spins.push(doc);
  localDb.save();
  return id;
}

export async function getCustomPrizeNames(): Promise<Record<number, string>> {
  const map: Record<number, string> = {};
  for (const doc of localDb.data.prize_names) {
    map[doc.slotIndex] = doc.customName;
  }
  return map;
}

export async function saveCustomPrizeNames(customNames: Record<number, string>): Promise<void> {
  for (const [key, value] of Object.entries(customNames)) {
    const slotIndex = Number(key);
    if (!Number.isNaN(slotIndex) && value.trim()) {
      const existing = localDb.data.prize_names.find((p) => p.slotIndex === slotIndex);
      if (existing) {
        existing.customName = value.trim();
        existing.updatedAt = new Date().toISOString();
      } else {
        localDb.data.prize_names.push({
          _id: generateId(),
          slotIndex,
          customName: value.trim(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }
  localDb.save();
}

export async function getAdminStats(configuredSlots: readonly SlotConfig[]): Promise<AdminStats> {
  const spins = localDb.data.spins;
  const totalSpins = spins.length;
  const uniqueUsers = new Set(spins.map((s) => s.userId)).size;
  const grandPrizeWinners = spins.filter((s) => s.isGrandPrize).length;
  const customNames = await getCustomPrizeNames();

  const slotCounts = new Map<number, number>();
  for (const s of spins) {
    slotCounts.set(s.slotIndex, (slotCounts.get(s.slotIndex) ?? 0) + 1);
  }

  let totalWins = 0;
  let totalLosses = 0;

  const distribution: DistributionStat[] = configuredSlots.map((slot) => {
    const actualCount = slotCounts.get(slot.index) ?? 0;
    const actualPct = totalSpins > 0 ? Number(((actualCount / totalSpins) * 100).toFixed(2)) : 0;
    const customLabel = customNames[slot.index];
    const label = customLabel && customLabel.length > 0 ? customLabel : slot.label;

    if (slot.isWin) {
      totalWins += actualCount;
    } else {
      totalLosses += actualCount;
    }

    return {
      slotIndex: slot.index,
      label,
      isWin: slot.isWin,
      isGrandPrize: slot.isGrandPrize,
      expectedPct: slot.weight,
      actualCount,
      actualPct,
    };
  });

  return {
    totalSpins,
    uniqueUsers,
    grandPrizeWinners,
    totalWins,
    totalLosses,
    distribution,
  };
}

export async function getAdminSpins(query: AdminSpinQuery): Promise<AdminSpinListResponse> {
  let list = [...localDb.data.spins];

  if (query.search && query.search.trim()) {
    const term = query.search.trim().toLowerCase();
    list = list.filter(
      (s) =>
        s.userName.toLowerCase().includes(term) ||
        s.userContact.toLowerCase().includes(term) ||
        (s.claimCode && s.claimCode.toLowerCase().includes(term)) ||
        s.prizeName.toLowerCase().includes(term)
    );
  }

  if (query.prizeType === 'grand') {
    list = list.filter((s) => s.isGrandPrize);
  } else if (query.prizeType === 'win') {
    list = list.filter((s) => !s.isGrandPrize && !s.prizeKey.startsWith('try_again'));
  } else if (query.prizeType === 'loss') {
    list = list.filter((s) => s.prizeKey.startsWith('try_again'));
  }

  if (query.fromDate) {
    const from = new Date(query.fromDate).getTime();
    list = list.filter((s) => new Date(s.createdAt).getTime() >= from);
  }
  if (query.toDate) {
    const to = new Date(query.toDate).getTime();
    list = list.filter((s) => new Date(s.createdAt).getTime() <= to);
  }

  // Sort descending by creation date
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = list.length;
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const offset = (page - 1) * limit;

  const paged = list.slice(offset, offset + limit);

  const spinRecords: SpinRecord[] = paged.map((doc) => ({
    id: doc._id,
    userId: doc.userId,
    userName: doc.userName,
    userContact: doc.userContact,
    deviceId: doc.deviceId,
    userSpinNumber: doc.userSpinNumber,
    globalSpinNumber: doc.globalSpinNumber,
    slotIndex: doc.slotIndex,
    prizeKey: doc.prizeKey,
    prizeName: doc.prizeName,
    isGrandPrize: doc.isGrandPrize,
    claimCode: doc.claimCode,
    ipHash: doc.ipHash,
    createdAt: doc.createdAt,
  }));

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    spins: spinRecords,
    total,
    page,
    totalPages,
  };
}

export async function getAllSpinsForExport(): Promise<readonly SpinRecord[]> {
  return localDb.data.spins
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((doc) => ({
      id: doc._id,
      userId: doc.userId,
      userName: doc.userName,
      userContact: doc.userContact,
      deviceId: doc.deviceId,
      userSpinNumber: doc.userSpinNumber,
      globalSpinNumber: doc.globalSpinNumber,
      slotIndex: doc.slotIndex,
      prizeKey: doc.prizeKey,
      prizeName: doc.prizeName,
      isGrandPrize: doc.isGrandPrize,
      claimCode: doc.claimCode,
      ipHash: doc.ipHash,
      createdAt: doc.createdAt,
    }));
}
