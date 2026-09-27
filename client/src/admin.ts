import type { PublicSlotConfig } from '../../shared/types.js';
import { api, ApiError } from './api.js';

export interface AdminDashboardCallbacks {
  readonly onPrizesUpdated: (updatedSlots: readonly PublicSlotConfig[]) => void;
  readonly onReturnToWheel: () => void;
}

export class AdminDashboard {
  private callbacks: AdminDashboardCallbacks;
  private currentPage = 1;
  private currentSearch = '';
  private currentPrizeType: 'all' | 'grand' | 'win' | 'loss' = 'all';
  private searchTimeout: number | null = null;

  constructor(callbacks: AdminDashboardCallbacks) {
    this.callbacks = callbacks;
    this.bindEvents();
  }

  private bindEvents(): void {
    // Return to wheel button
    document.getElementById('back-to-wheel-btn')?.addEventListener('click', () => {
      this.callbacks.onReturnToWheel();
    });

    // Admin Logout button
    document.getElementById('admin-logout-btn')?.addEventListener('click', async () => {
      try {
        await api.adminLogout();
        this.callbacks.onReturnToWheel();
      } catch (err) {
        console.error('Logout error:', err);
      }
    });

    // Admin Login Form
    const loginForm = document.getElementById('admin-login-form') as HTMLFormElement | null;
    loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const passwordInput = document.getElementById('admin-password-input') as HTMLInputElement | null;
      const errorEl = document.getElementById('admin-login-error');
      if (!passwordInput || !errorEl) return;

      errorEl.textContent = '';
      try {
        await api.adminLogin({ password: passwordInput.value });
        passwordInput.value = '';
        this.closeLoginModal();
        await this.loadDashboard();
      } catch (err) {
        if (err instanceof ApiError) {
          errorEl.textContent = err.message;
        } else {
          errorEl.textContent = 'Invalid administrator password';
        }
      }
    });

    // Close admin login modal button
    document.getElementById('close-admin-login-btn')?.addEventListener('click', () => {
      this.closeLoginModal();
      this.callbacks.onReturnToWheel();
    });

    // Table Search Input with debounce
    const searchInput = document.getElementById('admin-search-input') as HTMLInputElement | null;
    searchInput?.addEventListener('input', () => {
      if (this.searchTimeout) {
        window.clearTimeout(this.searchTimeout);
      }
      this.searchTimeout = window.setTimeout(() => {
        this.currentSearch = searchInput.value.trim();
        this.currentPage = 1;
        this.loadSpinsTable();
      }, 350);
    });

    // Prize Type Filter
    const filterSelect = document.getElementById('admin-prize-filter') as HTMLSelectElement | null;
    filterSelect?.addEventListener('change', () => {
      this.currentPrizeType = (filterSelect.value as 'all' | 'grand' | 'win' | 'loss') || 'all';
      this.currentPage = 1;
      this.loadSpinsTable();
    });

    // Refresh Table Button
    document.getElementById('refresh-table-btn')?.addEventListener('click', () => {
      this.loadSpinsTable();
      this.loadStats();
    });

    // Pagination Buttons
    document.getElementById('prev-page-btn')?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.loadSpinsTable();
      }
    });

    document.getElementById('next-page-btn')?.addEventListener('click', () => {
      this.currentPage++;
      this.loadSpinsTable();
    });

    // Export CSV Button
    document.getElementById('export-csv-btn')?.addEventListener('click', () => {
      window.location.href = '/api/admin/export-csv';
    });

    // Prize Editor Form
    const prizeForm = document.getElementById('prize-editor-form') as HTMLFormElement | null;
    prizeForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.savePrizeNames();
    });
  }

  public showLoginModal(): void {
    const modal = document.getElementById('admin-login-modal');
    modal?.classList.add('active');
    const pwd = document.getElementById('admin-password-input');
    pwd?.focus();
  }

  public closeLoginModal(): void {
    const modal = document.getElementById('admin-login-modal');
    modal?.classList.remove('active');
  }

  public async checkAuthAndLoad(): Promise<boolean> {
    try {
      const auth = await api.checkAdminAuth();
      if (auth.authenticated) {
        await this.loadDashboard();
        return true;
      }
    } catch {
      // Not logged in
    }
    this.showLoginModal();
    return false;
  }

  public async loadDashboard(): Promise<void> {
    await Promise.all([this.loadStats(), this.loadPrizeEditor(), this.loadSpinsTable()]);
  }

  private async loadStats(): Promise<void> {
    try {
      const stats = await api.getAdminStats();

      const totalSpinsEl = document.getElementById('stat-total-spins');
      const uniqueUsersEl = document.getElementById('stat-unique-users');
      const grandPrizesEl = document.getElementById('stat-grand-prizes');
      const totalWinsEl = document.getElementById('stat-total-wins');

      if (totalSpinsEl) totalSpinsEl.textContent = stats.totalSpins.toLocaleString();
      if (uniqueUsersEl) uniqueUsersEl.textContent = stats.uniqueUsers.toLocaleString();
      if (grandPrizesEl) grandPrizesEl.textContent = stats.grandPrizeWinners.toLocaleString();
      if (totalWinsEl) totalWinsEl.textContent = stats.totalWins.toLocaleString();

      this.renderDistributionChart(stats.distribution, stats.totalSpins);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    }
  }

  private renderDistributionChart(
    distribution: readonly {
      slotIndex: number;
      label: string;
      expectedPct: number;
      actualCount: number;
      actualPct: number;
      isWin: boolean;
      isGrandPrize: boolean;
    }[],
    totalSpins: number
  ): void {
    const container = document.getElementById('distribution-chart-container');
    if (!container) return;

    container.innerHTML = '';

    for (const item of distribution) {
      const row = document.createElement('div');
      row.className = 'chart-bar-row';

      const maxScale = 25; // Scale for normal/grand prizes bar visually (Try Again might be 60% grouped, but individually 15%)
      const fillWidth = Math.min(100, (item.actualPct / maxScale) * 100);
      const expectedLeft = Math.min(100, (item.expectedPct / maxScale) * 100);

      const variance = (item.actualPct - item.expectedPct).toFixed(2);
      const varianceSign = Number(variance) >= 0 ? '+' : '';

      const isLoss = !item.isWin;
      const barColorClass = isLoss ? 'loss' : '';

      row.innerHTML = `
        <div class="chart-bar-header">
          <span class="chart-bar-label">
            #${item.slotIndex}: <strong>${escapeHtml(item.label)}</strong>
          </span>
          <span class="chart-bar-values">
            Exp: ${item.expectedPct.toFixed(1)}% | Act: ${item.actualPct.toFixed(1)}% (${item.actualCount.toLocaleString()})
            <span style="color: ${Number(variance) >= 0 ? '#10B981' : '#F59E0B'}">(${varianceSign}${variance}%)</span>
          </span>
        </div>
        <div class="chart-bar-track" title="Target marker: ${item.expectedPct}%, Actual: ${item.actualPct}%">
          <div class="chart-bar-fill-actual ${barColorClass}" style="width: ${totalSpins > 0 ? fillWidth : 0}%"></div>
          <div class="chart-bar-marker-expected" style="left: ${expectedLeft}%"></div>
        </div>
      `;

      container.appendChild(row);
    }
  }

  private async loadPrizeEditor(): Promise<void> {
    try {
      const config = await api.getWheelConfig();
      const container = document.getElementById('prize-inputs-container');
      if (!container) return;

      container.innerHTML = '';

      // Allow editing normal prizes (slots 2, 4, 5, 7, 8) and Grand Prize (slot 0)
      const editableSlots = config.slots.filter((s) => s.isWin);

      for (const slot of editableSlots) {
        const row = document.createElement('div');
        row.className = 'prize-input-row';
        row.innerHTML = `
          <span class="prize-slot-label">Slot #${slot.index}${slot.isGrandPrize ? ' (★)' : ''}:</span>
          <input
            type="text"
            class="form-control"
            name="slot_${slot.index}"
            data-slot-index="${slot.index}"
            value="${escapeHtml(slot.label)}"
            maxlength="50"
            required
          />
        `;
        container.appendChild(row);
      }
    } catch (err) {
      console.error('Failed to load prize editor:', err);
    }
  }

  private async savePrizeNames(): Promise<void> {
    const container = document.getElementById('prize-inputs-container');
    const msgEl = document.getElementById('prize-save-msg');
    const saveBtn = document.getElementById('save-prizes-btn') as HTMLButtonElement | null;
    if (!container || !msgEl) return;

    const inputs = container.querySelectorAll<HTMLInputElement>('input[data-slot-index]');
    const customNames: Record<number, string> = {};

    inputs.forEach((input) => {
      const slotIndex = Number(input.dataset['slotIndex']);
      if (!Number.isNaN(slotIndex) && input.value.trim()) {
        customNames[slotIndex] = input.value.trim();
      }
    });

    try {
      if (saveBtn) saveBtn.disabled = true;
      msgEl.textContent = 'Saving...';
      const result = await api.updatePrizes(customNames);
      msgEl.textContent = '✓ Saved successfully!';
      setTimeout(() => {
        msgEl.textContent = '';
      }, 3000);

      this.callbacks.onPrizesUpdated(result.updatedSlots);
      await this.loadStats();
    } catch (err) {
      msgEl.textContent = err instanceof Error ? err.message : 'Save failed';
      msgEl.style.color = '#F43F5E';
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  private async loadSpinsTable(): Promise<void> {
    const tbody = document.getElementById('admin-spins-table-body');
    const pageNumEl = document.getElementById('current-page-num');
    const pageInfoEl = document.getElementById('pagination-info');
    const prevBtn = document.getElementById('prev-page-btn') as HTMLButtonElement | null;
    const nextBtn = document.getElementById('next-page-btn') as HTMLButtonElement | null;

    if (!tbody) return;

    try {
      const data = await api.getAdminSpins({
        page: this.currentPage,
        limit: 15,
        search: this.currentSearch,
        prizeType: this.currentPrizeType,
      });

      if (pageNumEl) pageNumEl.textContent = String(data.page);
      if (prevBtn) prevBtn.disabled = data.page <= 1;
      if (nextBtn) nextBtn.disabled = data.page >= data.totalPages;

      const startCount = data.total > 0 ? (data.page - 1) * 15 + 1 : 0;
      const endCount = Math.min(data.page * 15, data.total);
      if (pageInfoEl) pageInfoEl.textContent = `Showing ${startCount}-${endCount} of ${data.total}`;

      if (data.spins.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No spin records match your filters.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.spins
        .map((s) => {
          const dateStr = new Date(s.createdAt).toLocaleString(undefined, {
            dateStyle: 'short',
            timeStyle: 'medium',
          });

          let badgeHtml = '';
          if (s.isGrandPrize) {
            badgeHtml = `<span class="badge badge-accent">⭐ GRAND PRIZE</span>`;
          } else if (s.prizeKey.startsWith('try_again')) {
            badgeHtml = `<span class="badge badge-muted">Try Again</span>`;
          } else {
            badgeHtml = `<span class="badge badge-success">Won Prize</span>`;
          }

          const claimCodeHtml = s.claimCode
            ? `<span class="badge badge-accent" style="font-family: monospace;">${escapeHtml(s.claimCode)}</span>`
            : '<span class="text-muted">—</span>';

          const ipShort = s.ipHash ? `${s.ipHash.slice(0, 10)}...` : '—';

          return `
            <tr>
              <td><strong>#${s.globalSpinNumber}</strong></td>
              <td>${dateStr}</td>
              <td><strong>${escapeHtml(s.userName)}</strong></td>
              <td>${escapeHtml(s.userContact)}</td>
              <td>${s.userSpinNumber}</td>
              <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  ${badgeHtml}
                  <span>${escapeHtml(s.prizeName)}</span>
                </div>
              </td>
              <td>${claimCodeHtml}</td>
              <td><code>${ipShort}</code></td>
            </tr>
          `;
        })
        .join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">Error loading records: ${err instanceof Error ? err.message : 'Unknown'}</td></tr>`;
    }
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
