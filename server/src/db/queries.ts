import type {
  AdminSpinListResponse,
  AdminSpinQuery,
  AdminStats,
  DistributionStat,
  ResetSpinsResponse,
  ResetStatusResponse,
  SlotConfig,
  SpinRecord,
} from '../../../shared/types.js';
import {
  generateId,
  getDb,
  isMongoConnected,
  localDb,
  PrizeNameDoc,
  SpinDoc,
  SpinTokenDoc,
  SystemSettingDoc,
  UserDoc,
} from './index.js';

export async function findUserByIdentifier(identifier: string): Promise<UserDoc | null> {
  if (isMongoConnected()) {
    try {
      const user = await getDb().collection<UserDoc>('users').findOne({ identifier });
      if (user) return user;
    } catch {
      // Fallback to local store
    }
  }
  const user = localDb.data.users.find((u) => u.identifier === identifier);
  return user || null;
}

export async function findUserById(id: string): Promise<UserDoc | null> {
  if (isMongoConnected()) {
    try {
      const user = await getDb().collection<UserDoc>('users').findOne({ _id: id });
      if (user) return user;
    } catch {
      // Fallback
    }
  }
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

  if (isMongoConnected()) {
    try {
      await getDb().collection<UserDoc>('users').insertOne(doc);
    } catch (err) {
      console.warn('MongoDB insert error, saving to local store:', err);
    }
  }

  localDb.data.users.push(doc);
  localDb.save();
  return doc;
}

export async function getUserSpinCount(userId: string): Promise<number> {
  if (isMongoConnected()) {
    try {
      return await getDb().collection<SpinDoc>('spins').countDocuments({ userId });
    } catch {
      // Fallback
    }
  }
  return localDb.data.spins.filter((s) => s.userId === userId).length;
}

export async function getUserRecentSpins(
  userId: string,
  limit = 5
): Promise<readonly SpinDoc[]> {
  if (isMongoConnected()) {
    try {
      const docs = await getDb()
        .collection<SpinDoc>('spins')
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
      if (docs.length > 0) return docs;
    } catch {
      // Fallback
    }
  }
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

  if (isMongoConnected()) {
    try {
      await getDb().collection<SpinTokenDoc>('spin_tokens').insertOne(doc);
    } catch (err) {
      console.warn('MongoDB token error:', err);
    }
  }

  localDb.data.spin_tokens.push(doc);
  localDb.save();
}

export async function findSpinToken(token: string): Promise<SpinTokenDoc | null> {
  if (isMongoConnected()) {
    try {
      const t = await getDb().collection<SpinTokenDoc>('spin_tokens').findOne({ token });
      if (t) return t;
    } catch {
      // Fallback
    }
  }
  const t = localDb.data.spin_tokens.find((item) => item.token === token);
  return t || null;
}

export async function markSpinTokenUsed(tokenId: string): Promise<void> {
  if (isMongoConnected()) {
    try {
      await getDb()
        .collection<SpinTokenDoc>('spin_tokens')
        .updateOne({ _id: tokenId }, { $set: { used: true, usedAt: Date.now() } });
    } catch {
      // Fallback
    }
  }
  const token = localDb.data.spin_tokens.find((item) => item._id === tokenId);
  if (token) {
    token.used = true;
    token.usedAt = Date.now();
    localDb.save();
  }
}

export async function getGlobalSpinCount(): Promise<number> {
  if (isMongoConnected()) {
    try {
      return await getDb().collection<SpinDoc>('spins').countDocuments({});
    } catch {
      // Fallback
    }
  }
  return localDb.data.spins.length;
}

export async function getPrizeWonCount(prizeKey: string | readonly string[], slotIndex?: number): Promise<number> {
  const keys = Array.isArray(prizeKey) ? prizeKey : [prizeKey];
  if (isMongoConnected()) {
    try {
      const orClauses: any[] = [{ prizeKey: { $in: keys } }];
      if (slotIndex !== undefined) {
        orClauses.push({ slotIndex });
      }
      return await getDb().collection<SpinDoc>('spins').countDocuments({ $or: orClauses });
    } catch {
      // Fallback
    }
  }
  return localDb.data.spins.filter((s) => keys.includes(s.prizeKey) || (slotIndex !== undefined && s.slotIndex === slotIndex)).length;
}

export async function getGrandPrizeWonCount(): Promise<number> {
  if (isMongoConnected()) {
    try {
      return await getDb().collection<SpinDoc>('spins').countDocuments({
        $or: [{ isGrandPrize: true }, { prizeKey: 'grand_prize' }, { slotIndex: 0 }],
      });
    } catch {
      // Fallback
    }
  }
  return localDb.data.spins.filter((s) => s.isGrandPrize || s.prizeKey === 'grand_prize' || s.slotIndex === 0).length;
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

  if (isMongoConnected()) {
    try {
      await getDb().collection<SpinDoc>('spins').insertOne(doc);
    } catch (err) {
      console.warn('MongoDB spin insert error:', err);
    }
  }

  localDb.data.spins.push(doc);
  localDb.save();
  return id;
}

export async function getCustomPrizeNames(): Promise<Record<number, string>> {
  const map: Record<number, string> = {};
  if (isMongoConnected()) {
    try {
      const docs = await getDb().collection<PrizeNameDoc>('prize_names').find({}).toArray();
      for (const doc of docs) {
        map[doc.slotIndex] = doc.customName;
      }
      if (docs.length > 0) return map;
    } catch {
      // Fallback
    }
  }
  for (const doc of localDb.data.prize_names) {
    map[doc.slotIndex] = doc.customName;
  }
  return map;
}

export async function saveCustomPrizeNames(customNames: Record<number, string>): Promise<void> {
  for (const [key, value] of Object.entries(customNames)) {
    const slotIndex = Number(key);
    if (!Number.isNaN(slotIndex) && value.trim()) {
      if (isMongoConnected()) {
        try {
          await getDb()
            .collection<PrizeNameDoc>('prize_names')
            .updateOne(
              { slotIndex },
              { $set: { customName: value.trim(), updatedAt: new Date().toISOString() } },
              { upsert: true }
            );
        } catch {
          // Fallback
        }
      }
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
  let spins = localDb.data.spins;
  if (isMongoConnected()) {
    try {
      spins = await getDb().collection<SpinDoc>('spins').find({}).toArray();
    } catch {
      spins = localDb.data.spins;
    }
  }

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
  if (isMongoConnected()) {
    try {
      list = await getDb().collection<SpinDoc>('spins').find({}).toArray();
    } catch {
      list = [...localDb.data.spins];
    }
  }

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
  let list = localDb.data.spins;
  if (isMongoConnected()) {
    try {
      list = await getDb().collection<SpinDoc>('spins').find({}).toArray();
    } catch {
      list = localDb.data.spins;
    }
  }

  return list
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

const RESET_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function getSpinResetStatus(): Promise<ResetStatusResponse> {
  let lastResetIso: string | null = null;

  if (isMongoConnected()) {
    try {
      const doc = await getDb()
        .collection<SystemSettingDoc>('system_settings')
        .findOne({ key: 'last_spin_reset' });
      if (doc && typeof doc.value === 'string') {
        lastResetIso = doc.value;
      }
    } catch {
      // Fallback
    }
  }

  if (!lastResetIso) {
    const setting = (localDb.data.system_settings || []).find((s) => s.key === 'last_spin_reset');
    if (setting && typeof setting.value === 'string') {
      lastResetIso = setting.value;
    }
  }

  if (!lastResetIso) {
    return {
      canReset: true,
      lastResetAt: null,
      nextResetAvailableAt: null,
      remainingSeconds: 0,
    };
  }

  const lastResetTime = new Date(lastResetIso).getTime();
  const now = Date.now();
  const elapsed = now - lastResetTime;
  const remainingMs = Math.max(0, RESET_INTERVAL_MS - elapsed);
  const canReset = remainingMs === 0;
  const nextResetAvailableAt = new Date(lastResetTime + RESET_INTERVAL_MS).toISOString();

  return {
    canReset,
    lastResetAt: lastResetIso,
    nextResetAvailableAt,
    remainingSeconds: Math.ceil(remainingMs / 1000),
  };
}

export async function resetSpinNumbers(): Promise<ResetSpinsResponse> {
  const status = await getSpinResetStatus();
  if (!status.canReset) {
    const hours = Math.floor(status.remainingSeconds / 3600);
    const minutes = Math.floor((status.remainingSeconds % 3600) / 60);
    const seconds = status.remainingSeconds % 60;
    throw new Error(
      `Spin reset can only be executed once every 24 hours. Next reset available in ${hours}h ${minutes}m ${seconds}s.`
    );
  }

  const nowIso = new Date().toISOString();
  let totalSpinsCleared = localDb.data.spins.length;

  if (isMongoConnected()) {
    try {
      const deleteResult = await getDb().collection<SpinDoc>('spins').deleteMany({});
      totalSpinsCleared = deleteResult.deletedCount ?? totalSpinsCleared;
      await getDb().collection<SpinTokenDoc>('spin_tokens').deleteMany({});
      await getDb().collection<SystemSettingDoc>('system_settings').updateOne(
        { key: 'last_spin_reset' },
        { $set: { key: 'last_spin_reset', value: nowIso, updatedAt: nowIso } },
        { upsert: true }
      );
    } catch (err) {
      console.warn('MongoDB spin reset error:', err);
    }
  }

  // Clear local database spins & tokens
  totalSpinsCleared = Math.max(totalSpinsCleared, localDb.data.spins.length);
  localDb.data.spins = [];
  localDb.data.spin_tokens = [];

  if (!localDb.data.system_settings) {
    localDb.data.system_settings = [];
  }
  const existing = localDb.data.system_settings.find((s) => s.key === 'last_spin_reset');
  if (existing) {
    existing.value = nowIso;
    existing.updatedAt = nowIso;
  } else {
    localDb.data.system_settings.push({
      _id: generateId(),
      key: 'last_spin_reset',
      value: nowIso,
      updatedAt: nowIso,
    });
  }
  localDb.save();

  const nextResetAvailableAt = new Date(Date.now() + RESET_INTERVAL_MS).toISOString();

  return {
    success: true,
    message: `All spin numbers and records (${totalSpinsCleared} records) have been successfully reset.`,
    lastResetAt: nowIso,
    nextResetAvailableAt,
    canReset: false,
    totalSpinsCleared,
  };
}
