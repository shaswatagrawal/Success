/**
 * Shared TypeScript type definitions for the Spin the Wheel promotional application.
 * Shared across /server, /client, and /shared.
 */

export interface Prize {
  readonly id: string;
  readonly label: string;
  readonly isWin: boolean;
  readonly isGrandPrize: boolean;
  readonly color: string;
  readonly textColor: string;
  readonly accentColor?: string;
  readonly image?: string;
}

export interface SlotConfig {
  readonly index: number;
  readonly prizeKey: string;
  readonly label: string;
  readonly weight: number; // Percentage, e.g. 15 for 15%
  readonly visualWeight?: number; // Controls visual slice size on the wheel (relative proportion)
  readonly isWin: boolean;
  readonly isGrandPrize: boolean;
  readonly color: string;
  readonly textColor: string;
  readonly accentColor?: string;
  readonly image?: string;
}

export interface PublicSlotConfig {
  readonly index: number;
  readonly prizeKey: string;
  readonly label: string;
  readonly visualWeight?: number; // Controls visual slice size on the wheel (relative proportion)
  readonly isWin: boolean;
  readonly isGrandPrize: boolean;
  readonly color: string;
  readonly textColor: string;
  readonly accentColor?: string;
  readonly image?: string;
}

export interface WheelConfigResponse {
  readonly totalSlots: number;
  readonly slots: readonly PublicSlotConfig[];
  readonly spinLimit: number;
}

export interface UserInfo {
  readonly name: string;
  readonly contact: string; // Phone number or email
  readonly consent: boolean;
  readonly deviceId: string;
}

export interface StartSpinRequest {
  readonly name: string;
  readonly contact: string;
  readonly consent: boolean;
  readonly deviceId: string;
}

export interface StartSpinResponse {
  readonly success: boolean;
  readonly token: string;
  readonly spinsLeft: number;
  readonly spinsUsed: number;
  readonly spinLimit: number;
  readonly userSpinNumber: number;
}

export interface SpinRequest {
  readonly token: string;
  readonly deviceId?: string;
}

export interface SpinResponse {
  readonly success: boolean;
  readonly slotIndex: number;
  readonly prize: Prize;
  readonly spinsLeft: number;
  readonly spinsUsed: number;
  readonly userSpinNumber: number;
  readonly globalSpinNumber: number;
  readonly claimCode?: string;
  readonly message: string;
}

export interface SpinRecord {
  readonly id: string;
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
  readonly createdAt: string;
}

export interface UserStatusResponse {
  readonly identified: boolean;
  readonly spinsUsed: number;
  readonly spinsLeft: number;
  readonly spinLimit: number;
  readonly canSpin: boolean;
  readonly recentSpins: readonly {
    readonly prizeName: string;
    readonly isWin: boolean;
    readonly isGrandPrize: boolean;
    readonly claimCode?: string;
    readonly createdAt: string;
  }[];
}

export interface DistributionStat {
  readonly slotIndex: number;
  readonly label: string;
  readonly isWin: boolean;
  readonly isGrandPrize: boolean;
  readonly expectedPct: number;
  readonly actualCount: number;
  readonly actualPct: number;
}

export interface AdminStats {
  readonly totalSpins: number;
  readonly uniqueUsers: number;
  readonly grandPrizeWinners: number;
  readonly totalWins: number;
  readonly totalLosses: number;
  readonly distribution: readonly DistributionStat[];
}

export interface AdminSpinQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly search?: string;
  readonly prizeType?: 'all' | 'grand' | 'win' | 'loss';
  readonly fromDate?: string;
  readonly toDate?: string;
}

export interface AdminSpinListResponse {
  readonly spins: readonly SpinRecord[];
  readonly total: number;
  readonly page: number;
  readonly totalPages: number;
}

export interface AdminLoginRequest {
  readonly password: string;
}

export interface AdminLoginResponse {
  readonly success: boolean;
  readonly message: string;
}

export interface UpdatePrizeNamesRequest {
  readonly customNames: Record<number, string>;
}

export interface UpdatePrizeNamesResponse {
  readonly success: boolean;
  readonly message: string;
  readonly updatedSlots: readonly PublicSlotConfig[];
}

export interface ApiErrorResponse {
  readonly error: string;
  readonly code: string;
  readonly details?: unknown;
}
