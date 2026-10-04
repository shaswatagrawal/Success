import type {
  AdminLoginRequest,
  AdminLoginResponse,
  AdminSpinListResponse,
  AdminSpinQuery,
  AdminStats,
  ApiErrorResponse,
  ResetSpinsResponse,
  ResetStatusResponse,
  SpinRequest,
  SpinResponse,
  StartSpinRequest,
  StartSpinResponse,
  UpdatePrizeNamesRequest,
  UpdatePrizeNamesResponse,
  UserStatusResponse,
  WheelConfigResponse,
} from '../../shared/types.js';

export class ApiError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code = 'API_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Returns or generates a persistent device UUID in localStorage.
 */
export function getOrCreateDeviceId(): string {
  const STORAGE_KEY = 'wheel_device_uuid';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  if (!deviceId) {
    deviceId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  return deviceId;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    if (isJson) {
      const errData = (await res.json()) as any;
      let errorMsg = 'Server request failed';
      if (typeof errData?.error === 'string') {
        errorMsg = errData.error;
      } else if (typeof errData?.message === 'string') {
        errorMsg = errData.message;
      } else if (typeof errData === 'string') {
        errorMsg = errData;
      } else if (errData?.error && typeof errData.error === 'object') {
        errorMsg = errData.error.message || JSON.stringify(errData.error);
      }
      throw new ApiError(errorMsg, errData?.code, errData?.details);
    }
    const text = await res.text();
    let displayMessage = text;
    try {
      const parsed = JSON.parse(text);
      displayMessage = parsed.error || parsed.message || text;
    } catch {
      // Not JSON
    }
    throw new ApiError(displayMessage || `Request failed with status ${res.status}`);
  }

  return (isJson ? await res.json() : (undefined as unknown)) as T;
}

export const api = {
  getWheelConfig(): Promise<WheelConfigResponse> {
    return request<WheelConfigResponse>('/api/wheel-config');
  },

  startSpin(data: Omit<StartSpinRequest, 'deviceId'>): Promise<StartSpinResponse> {
    const deviceId = getOrCreateDeviceId();
    return request<StartSpinResponse>('/api/spin/start', {
      method: 'POST',
      body: JSON.stringify({ ...data, deviceId }),
    });
  },

  executeSpin(token: string): Promise<SpinResponse> {
    const deviceId = getOrCreateDeviceId();
    const payload: SpinRequest = { token, deviceId };
    return request<SpinResponse>('/api/spin', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getUserStatus(contact: string): Promise<UserStatusResponse> {
    const query = new URLSearchParams({ contact });
    return request<UserStatusResponse>(`/api/user/status?${query.toString()}`);
  },

  // Admin APIs
  adminLogin(data: AdminLoginRequest): Promise<AdminLoginResponse> {
    return request<AdminLoginResponse>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  adminLogout(): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/api/admin/logout', {
      method: 'POST',
    });
  },

  checkAdminAuth(): Promise<{ authenticated: boolean }> {
    return request<{ authenticated: boolean }>('/api/admin/me');
  },

  getAdminStats(): Promise<AdminStats> {
    return request<AdminStats>('/api/admin/stats');
  },

  getAdminSpins(query: AdminSpinQuery): Promise<AdminSpinListResponse> {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.search) params.set('search', query.search);
    if (query.prizeType) params.set('prizeType', query.prizeType);
    if (query.fromDate) params.set('fromDate', query.fromDate);
    if (query.toDate) params.set('toDate', query.toDate);

    return request<AdminSpinListResponse>(`/api/admin/spins?${params.toString()}`);
  },

  updatePrizes(customNames: Record<number, string>): Promise<UpdatePrizeNamesResponse> {
    const payload: UpdatePrizeNamesRequest = { customNames };
    return request<UpdatePrizeNamesResponse>('/api/admin/prizes', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  getResetStatus(): Promise<ResetStatusResponse> {
    return request<ResetStatusResponse>('/api/admin/reset-status');
  },

  resetSpins(): Promise<ResetSpinsResponse> {
    return request<ResetSpinsResponse>('/api/admin/reset-spins', {
      method: 'POST',
    });
  },
};
