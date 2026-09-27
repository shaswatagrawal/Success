import { UserInfoSchema } from '../../shared/schemas.js';
import type { PublicSlotConfig, UserInfo } from '../../shared/types.js';
import { AdminDashboard } from './admin.js';
import { api, ApiError } from './api.js';
import { soundManager } from './audio.js';
import { ConfettiCannon } from './confetti.js';
import { Wheel } from './wheel.js';

const DEFAULT_SLOTS: readonly PublicSlotConfig[] = [
  {
    index: 0,
    prizeKey: 'grand_prize',
    label: 'Smart Phone',
    visualWeight: 0.4,
    isWin: true,
    isGrandPrize: true,
    color: '#DC2626',
    textColor: '#FFFFFF',
    accentColor: '#EF4444',
    image: '/assets/mobile_flagship.jpg',
  },
  {
    index: 1,
    prizeKey: 'better_luck_1',
    label: 'Better Luck Next Time',
    isWin: false,
    isGrandPrize: false,
    color: '#1D4ED8',
    textColor: '#FFFFFF',
  },
  {
    index: 2,
    prizeKey: 'better_luck_2',
    label: 'Better Luck Next Time',
    isWin: false,
    isGrandPrize: false,
    color: '#1E40AF',
    textColor: '#FFFFFF',
  },
  {
    index: 3,
    prizeKey: 'prize_earpods',
    label: 'Earpods',
    isWin: true,
    isGrandPrize: false,
    color: '#B91C1C',
    textColor: '#FFFFFF',
    accentColor: '#F87171',
    image: '/assets/earpods_pro.jpg',
  },
  {
    index: 4,
    prizeKey: 'better_luck_3',
    label: 'Better Luck Next Time',
    isWin: false,
    isGrandPrize: false,
    color: '#1D4ED8',
    textColor: '#FFFFFF',
  },
  {
    index: 5,
    prizeKey: 'prize_powerbank',
    label: 'Powerbank',
    isWin: true,
    isGrandPrize: false,
    color: '#DC2626',
    textColor: '#FFFFFF',
    accentColor: '#EF4444',
    image: '/assets/powerbank_pro.jpg',
  },
  {
    index: 6,
    prizeKey: 'better_luck_4',
    label: 'Better Luck Next Time',
    isWin: false,
    isGrandPrize: false,
    color: '#1E40AF',
    textColor: '#FFFFFF',
  },
  {
    index: 7,
    prizeKey: 'prize_500_balance',
    label: '500 Topup',
    isWin: true,
    isGrandPrize: false,
    color: '#B91C1C',
    textColor: '#FFFFFF',
    accentColor: '#F87171',
    image: '/assets/ntc_logo.png',
  },
  {
    index: 8,
    prizeKey: 'better_luck_5',
    label: 'Better Luck Next Time',
    isWin: false,
    isGrandPrize: false,
    color: '#1D4ED8',
    textColor: '#FFFFFF',
  },
  {
    index: 9,
    prizeKey: 'prize_100_balance',
    label: '100 Topup',
    isWin: true,
    isGrandPrize: false,
    color: '#DC2626',
    textColor: '#FFFFFF',
    accentColor: '#EF4444',
    image: '/assets/ncell_logo.png',
  },
  {
    index: 10,
    prizeKey: 'prize_mystery_box',
    label: 'Mystery Box',
    visualWeight: 0.45,
    isWin: true,
    isGrandPrize: false,
    color: '#7C3AED',
    textColor: '#FFFFFF',
    accentColor: '#FDE047',
    image: '/assets/mystery_box.png',
  },
  {
    index: 11,
    prizeKey: 'better_luck_6',
    label: 'Better Luck Next Time',
    isWin: false,
    isGrandPrize: false,
    color: '#1D4ED8',
    textColor: '#FFFFFF',
  },
];

class App {
  private wheel: Wheel | null = null;
  private confetti: ConfettiCannon | null = null;
  private adminDashboard: AdminDashboard | null = null;
  private currentUser: UserInfo | null = null;
  private spinsLeft = 1;
  private spinLimit = 1;
  private spinsUsed = 0;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    this.loadSavedUser();
    this.setupAudioUi();
    this.setupModals();
    this.setupAdmin();
    await this.setupWheel();
    await this.refreshUserStatus();

    // Check for initial URL hash (e.g. #admin)
    if (window.location.hash === '#admin') {
      this.switchView('admin');
    }
  }

  private loadSavedUser(): void {
    const saved = localStorage.getItem('wheel_user_info');
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved) as UserInfo;
        this.updateUserDisplay();
      } catch {
        localStorage.removeItem('wheel_user_info');
      }
    }
  }

  private updateUserDisplay(): void {
    const nameEl = document.getElementById('participant-name-display');
    const badgeEl = document.getElementById('spins-count-badge');
    const spinBtn = document.getElementById('spin-center-btn') as HTMLButtonElement | null;

    if (nameEl) {
      nameEl.textContent = this.currentUser ? `Welcome, ${this.currentUser.name}!` : 'Welcome, Guest!';
    }

    const validLimit = Math.max(1, Number(this.spinLimit) || 1);
    const validLeft = typeof this.spinsLeft === 'number' && !Number.isNaN(this.spinsLeft)
      ? Math.max(0, this.spinsLeft)
      : Math.max(0, validLimit - (Number(this.spinsUsed) || 0));

    this.spinLimit = validLimit;
    this.spinsLeft = validLeft;

    if (badgeEl) {
      badgeEl.textContent = `${this.spinsLeft} / ${this.spinLimit}`;
      if (this.spinsLeft === 0) {
        badgeEl.className = 'badge badge-muted';
      } else {
        badgeEl.className = 'badge badge-accent';
      }
    }

    if (spinBtn) {
      if (this.spinsLeft === 0) {
        spinBtn.disabled = true;
        const sub = spinBtn.querySelector('.hub-sub-text');
        if (sub) sub.textContent = 'LIMIT REACHED';
      } else if (!this.wheel?.getIsSpinning()) {
        spinBtn.disabled = false;
        const sub = spinBtn.querySelector('.hub-sub-text');
        if (sub) sub.textContent = 'NOW';
      }
    }
  }

  private async refreshUserStatus(): Promise<void> {
    if (!this.currentUser) return;
    try {
      const status = await api.getUserStatus(this.currentUser.contact);
      this.spinsUsed = Number(status?.spinsUsed) || 0;
      this.spinLimit = Math.max(1, Number(status?.spinLimit) || 1);
      this.spinsLeft = typeof status?.spinsLeft === 'number' && !Number.isNaN(status.spinsLeft)
        ? status.spinsLeft
        : Math.max(0, this.spinLimit - this.spinsUsed);
      this.updateUserDisplay();
    } catch (err) {
      console.warn('Could not refresh user status:', err);
    }
  }

  private async setupWheel(): Promise<void> {
    const canvas = document.getElementById('wheel-canvas') as HTMLCanvasElement | null;
    const confettiCanvas = document.getElementById('confetti-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;

    if (confettiCanvas) {
      this.confetti = new ConfettiCannon(confettiCanvas);
    }

    // Initialize immediately with rich default slots & images
    this.wheel = new Wheel(canvas, DEFAULT_SLOTS, {
      onTick: () => soundManager.playTick(),
    });

    try {
      const config = await api.getWheelConfig();
      if (config && typeof config.spinLimit === 'number') {
        this.spinLimit = Math.max(1, config.spinLimit);
        if (!this.currentUser) {
          this.spinsLeft = this.spinLimit;
        }
      }
      if (config && config.slots && config.slots.length > 0) {
        this.wheel.updateSlots(config.slots);
      }
      this.updateUserDisplay();
    } catch (err) {
      console.warn('Using default wheel configuration:', err);
    }

    // Center Hub Spin Button Click
    const spinBtn = document.getElementById('spin-center-btn');
    spinBtn?.addEventListener('click', () => {
      this.handleSpinClick();
    });
  }

  private setupAudioUi(): void {
    const soundBtn = document.getElementById('sound-toggle-btn');
    const soundIcon = document.getElementById('sound-icon');

    const updateIcon = () => {
      if (soundIcon) {
        soundIcon.textContent = soundManager.getMuted() ? '🔇' : '🔊';
      }
    };

    updateIcon();

    soundBtn?.addEventListener('click', () => {
      soundManager.toggleMute();
      updateIcon();
    });
  }

  private setupModals(): void {
    // Switch User Button
    document.getElementById('change-user-btn')?.addEventListener('click', () => {
      this.currentUser = null;
      localStorage.removeItem('wheel_user_info');
      this.spinsLeft = this.spinLimit;
      this.spinsUsed = 0;
      this.updateUserDisplay();
      this.openRegistrationModal();
    });

    // Registration Modal Back & Close Buttons
    document.getElementById('back-reg-btn')?.addEventListener('click', () => {
      this.closeRegistrationModal();
    });

    document.getElementById('close-reg-btn')?.addEventListener('click', () => {
      this.closeRegistrationModal();
    });

    // View Rules Button
    document.getElementById('view-rules-btn')?.addEventListener('click', () => {
      document.getElementById('rules-modal')?.classList.add('active');
    });

    document.getElementById('close-rules-btn')?.addEventListener('click', () => {
      document.getElementById('rules-modal')?.classList.remove('active');
    });

    document.getElementById('rules-agree-btn')?.addEventListener('click', () => {
      document.getElementById('rules-modal')?.classList.remove('active');
    });

    // Result Modal Close
    document.getElementById('result-close-btn')?.addEventListener('click', () => {
      document.getElementById('result-modal')?.classList.remove('active');
      this.confetti?.stop();
      soundManager.stopSpeech();
      this.updateUserDisplay();
    });

    // Copy Claim Code Button
    document.getElementById('copy-claim-btn')?.addEventListener('click', async () => {
      const codeEl = document.getElementById('claim-code-value');
      const copyBtn = document.getElementById('copy-claim-btn');
      if (codeEl?.textContent) {
        try {
          await navigator.clipboard.writeText(codeEl.textContent.trim());
          if (copyBtn) {
            const original = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
              copyBtn.textContent = original;
            }, 2000);
          }
        } catch {
          // Fallback if clipboard blocked
        }
      }
    });

    // Registration Form Submit
    const regForm = document.getElementById('registration-form') as HTMLFormElement | null;
    regForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleRegistrationSubmit();
    });
  }

  private setupAdmin(): void {
    this.adminDashboard = new AdminDashboard({
      onPrizesUpdated: (updatedSlots: readonly PublicSlotConfig[]) => {
        this.wheel?.updateSlots(updatedSlots);
      },
      onReturnToWheel: () => {
        this.switchView('main');
      },
    });

    document.getElementById('admin-nav-btn')?.addEventListener('click', async () => {
      this.switchView('admin');
      await this.adminDashboard?.checkAuthAndLoad();
    });
  }

  private switchView(view: 'main' | 'admin'): void {
    const mainView = document.getElementById('main-view');
    const adminView = document.getElementById('admin-view');

    if (view === 'main') {
      window.location.hash = '';
      mainView?.classList.add('active');
      adminView?.classList.remove('active');
    } else {
      window.location.hash = '#admin';
      mainView?.classList.remove('active');
      adminView?.classList.add('active');
    }
  }

  private openRegistrationModal(): void {
    const modal = document.getElementById('registration-modal');
    modal?.classList.add('active');
    document.getElementById('reg-name')?.focus();
  }

  private closeRegistrationModal(): void {
    const modal = document.getElementById('registration-modal');
    modal?.classList.remove('active');
  }

  private async handleRegistrationSubmit(): Promise<void> {
    const nameInput = document.getElementById('reg-name') as HTMLInputElement | null;
    const contactInput = document.getElementById('reg-contact') as HTMLInputElement | null;
    const consentInput = document.getElementById('reg-consent') as HTMLInputElement | null;

    const nameError = document.getElementById('name-error');
    const contactError = document.getElementById('contact-error');
    const consentError = document.getElementById('consent-error');
    const genError = document.getElementById('reg-general-error');

    if (nameError) nameError.textContent = '';
    if (contactError) contactError.textContent = '';
    if (consentError) consentError.textContent = '';
    if (genError) {
      genError.style.display = 'none';
      genError.textContent = '';
    }

    const payload = {
      name: nameInput?.value.trim() ?? '',
      contact: contactInput?.value.trim() ?? '',
      consent: Boolean(consentInput?.checked),
      deviceId: 'device-id-placeholder-replaced-by-api',
    };

    // Client-side Zod validation
    const parsed = UserInfoSchema.safeParse(payload);
    if (!parsed.success) {
      for (const err of parsed.error.errors) {
        if (err.path[0] === 'name' && nameError) nameError.textContent = err.message;
        if (err.path[0] === 'contact' && contactError) contactError.textContent = err.message;
        if (err.path[0] === 'consent' && consentError) consentError.textContent = err.message;
      }
      return;
    }

    const submitBtn = document.getElementById('start-spinning-submit-btn') as HTMLButtonElement | null;
    if (submitBtn) submitBtn.disabled = true;

    try {
      this.currentUser = {
        name: parsed.data.name,
        contact: parsed.data.contact,
        consent: parsed.data.consent,
        deviceId: parsed.data.deviceId,
      };

      localStorage.setItem('wheel_user_info', JSON.stringify(this.currentUser));

      // Fetch user status to get remaining spins
      await this.refreshUserStatus();

      this.closeRegistrationModal();
      this.updateUserDisplay();
    } catch (err) {
      if (genError) {
        genError.style.display = 'block';
        genError.textContent = err instanceof Error ? err.message : 'Registration failed. Try again.';
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  private async handleSpinClick(): Promise<void> {
    if (!this.wheel || this.wheel.getIsSpinning()) return;

    if (!this.currentUser) {
      this.openRegistrationModal();
      return;
    }

    if (this.spinsLeft <= 0) {
      this.showResultModal({
        isWin: false,
        isGrandPrize: false,
        title: 'Promotion Limit Reached',
        prizeName: '0 Spins Remaining',
        desc: `You have completed all ${this.spinLimit} promotional spins allowed for this campaign. Thank you for participating!`,
        spinsRemaining: 0,
      });
      return;
    }

    const spinBtn = document.getElementById('spin-center-btn') as HTMLButtonElement | null;
    if (spinBtn) spinBtn.disabled = true;

    try {
      // Step 1: Request one-time spin token
      const startData = await api.startSpin({
        name: this.currentUser.name,
        contact: this.currentUser.contact,
        consent: this.currentUser.consent,
      });

      await this.triggerSpinWithToken(startData.token);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SPIN_LIMIT_REACHED') {
        this.spinsLeft = 0;
        this.updateUserDisplay();
      }
      alert(err instanceof Error ? err.message : 'Failed to initialize spin');
      if (spinBtn) spinBtn.disabled = false;
    }
  }

  private async triggerSpinWithToken(token: string): Promise<void> {
    if (!this.wheel) return;
    const spinBtn = document.getElementById('spin-center-btn') as HTMLButtonElement | null;
    if (spinBtn) spinBtn.disabled = true;

    try {
      // Step 2: Request spin result atomically from server
      const spinResult = await api.executeSpin(token);

      this.spinsLeft = spinResult.spinsLeft;
      this.spinsUsed = spinResult.spinsUsed;

      // Step 3: Run smooth 5.5s easing wheel animation to land on exact returned slot index
      await this.wheel.spinTo(spinResult.slotIndex);

      // Step 4: Play sound & trigger visual celebration + English Text-to-Speech
      if (spinResult.prize.isGrandPrize) {
        soundManager.playGrandPrizeFanfare();
        soundManager.speakWin(spinResult.prize.label, true);
        this.confetti?.burst(200);
      } else if (spinResult.prize.isWin) {
        soundManager.playWinFanfare();
        soundManager.speakWin(spinResult.prize.label, false);
        this.confetti?.burst(100);
      } else {
        soundManager.playLossChime();
        soundManager.speakLoss();
      }

      // Step 5: Present result modal
      this.showResultModal({
        isWin: spinResult.prize.isWin,
        isGrandPrize: spinResult.prize.isGrandPrize,
        title: spinResult.prize.isGrandPrize
          ? '🎉 GRAND PRIZE WINNER! 🎉'
          : spinResult.prize.isWin
          ? '🎉 CONGRATULATIONS! 🎉'
          : 'Better Luck Next Time!',
        prizeName: spinResult.prize.label,
        desc: spinResult.message,
        claimCode: spinResult.claimCode,
        spinsRemaining: spinResult.spinsLeft,
        image: spinResult.prize.image,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error executing spin');
    } finally {
      this.updateUserDisplay();
    }
  }

  private showResultModal(info: {
    readonly isWin: boolean;
    readonly isGrandPrize: boolean;
    readonly title: string;
    readonly prizeName: string;
    readonly desc: string;
    readonly claimCode?: string;
    readonly spinsRemaining: number;
    readonly image?: string;
  }): void {
    const modal = document.getElementById('result-modal');
    const badgeEl = document.getElementById('result-badge');
    const titleEl = document.getElementById('result-title');
    const iconEl = document.getElementById('result-prize-icon');
    const prizeEl = document.getElementById('result-prize-name');
    const descEl = document.getElementById('result-desc');
    const claimBox = document.getElementById('claim-code-container');
    const claimVal = document.getElementById('claim-code-value');
    const spinsRemainingEl = document.getElementById('result-spins-left-text');

    if (badgeEl) {
      badgeEl.textContent = info.isGrandPrize
        ? '⭐ GRAND PRIZE ⭐'
        : info.isWin
        ? 'WINNER'
        : 'RESULT';
      badgeEl.className = info.isGrandPrize
        ? 'result-badge badge-accent'
        : info.isWin
        ? 'result-badge badge-success'
        : 'result-badge badge-muted';
    }

    if (titleEl) titleEl.textContent = info.title;
    if (iconEl) {
      if (info.image) {
        const isTelecom = info.image.includes('telecom') || info.image.includes('topup') || info.image.includes('ncell') || info.image.includes('ntc') || info.prizeName.toLowerCase().includes('topup') || info.prizeName.toLowerCase().includes('balance');
        if (isTelecom) {
          iconEl.innerHTML = `
            <div class="result-telecom-dual-wrapper">
              <div class="telecom-badge ntc-badge" title="Nepal Telecom (NTC)"><img src="/assets/ntc_logo.png" alt="NTC" class="telecom-logo-img" /></div>
              <div class="telecom-badge ncell-badge" title="Ncell"><img src="/assets/ncell_logo.png" alt="Ncell" class="telecom-logo-img" /></div>
            </div>
          `;
        } else {
          const isNote = (info.image.includes('note') || info.image.includes('rs'));
          iconEl.innerHTML = `<div class="result-img-wrapper ${isNote ? 'note-wrapper' : ''}"><img src="${info.image}" alt="${info.prizeName}" class="result-won-img ${isNote ? 'is-note' : ''}" /></div>`;
        }
      } else {
        iconEl.textContent = info.isGrandPrize ? '🏆' : info.isWin ? '🎁' : '🍀';
      }
    }
    if (prizeEl) prizeEl.textContent = info.prizeName;
    if (descEl) descEl.textContent = info.desc;

    const isMystery = info.prizeName.toLowerCase().includes('mystery') || info.title.toLowerCase().includes('mystery');
    const mysteryNotice = document.getElementById('mystery-box-notice');
    if (mysteryNotice) {
      mysteryNotice.style.display = isMystery ? 'flex' : 'none';
    }

    if (claimBox && claimVal) {
      if (info.claimCode) {
        claimBox.style.display = 'flex';
        claimVal.textContent = info.claimCode;
      } else {
        claimBox.style.display = 'none';
      }
    }

    if (spinsRemainingEl) {
      spinsRemainingEl.textContent = `Promotional spins remaining: ${info.spinsRemaining}`;
    }

    modal?.classList.add('active');
  }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
