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
    prizeKey: 'lucky_draw_1',
    label: "You've Entered the Lucky Draw!",
    isWin: true,
    isGrandPrize: false,
    isLuckyDraw: true,
    color: '#F59E0B',
    textColor: '#FEF08A',
    accentColor: '#FDE047',
  },
  {
    index: 1,
    prizeKey: 'prize_1000_voucher_1',
    label: 'Rs. 1,000 Gift Voucher',
    isWin: true,
    isGrandPrize: false,
    color: '#1D4ED8',
    textColor: '#FFFFFF',
    accentColor: '#60A5FA',
  },
  {
    index: 2,
    prizeKey: 'better_luck_1',
    label: 'Better Luck Next Time!',
    isWin: false,
    isGrandPrize: false,
    color: '#991B1B',
    textColor: '#FEE2E2',
    accentColor: '#F87171',
  },
  {
    index: 3,
    prizeKey: 'prize_500_voucher_1',
    label: 'Rs. 500 Gift Voucher',
    isWin: true,
    isGrandPrize: false,
    color: '#DC2626',
    textColor: '#FFFFFF',
    accentColor: '#F87171',
  },
  {
    index: 4,
    prizeKey: 'lucky_draw_2',
    label: "You've Entered the Lucky Draw!",
    isWin: true,
    isGrandPrize: false,
    isLuckyDraw: true,
    color: '#D97706',
    textColor: '#FEF08A',
    accentColor: '#FDE047',
  },
  {
    index: 5,
    prizeKey: 'prize_500_voucher_2',
    label: 'Rs. 500 Gift Voucher',
    isWin: true,
    isGrandPrize: false,
    color: '#EF4444',
    textColor: '#FFFFFF',
    accentColor: '#FCA5A5',
  },
  {
    index: 6,
    prizeKey: 'better_luck_2',
    label: 'Better Luck Next Time!',
    isWin: false,
    isGrandPrize: false,
    color: '#1E3A8A',
    textColor: '#DBEAFE',
    accentColor: '#60A5FA',
  },
  {
    index: 7,
    prizeKey: 'prize_1000_voucher_2',
    label: 'Rs. 1,000 Gift Voucher',
    isWin: true,
    isGrandPrize: false,
    color: '#2563EB',
    textColor: '#FFFFFF',
    accentColor: '#93C5FD',
  },
  {
    index: 8,
    prizeKey: 'lucky_draw_3',
    label: "You've Entered the Lucky Draw!",
    isWin: true,
    isGrandPrize: false,
    isLuckyDraw: true,
    color: '#F59E0B',
    textColor: '#FEF08A',
    accentColor: '#FDE047',
  },
  {
    index: 9,
    prizeKey: 'prize_500_voucher_3',
    label: 'Rs. 500 Gift Voucher',
    isWin: true,
    isGrandPrize: false,
    color: '#DC2626',
    textColor: '#FFFFFF',
    accentColor: '#F87171',
  },
  {
    index: 10,
    prizeKey: 'better_luck_3',
    label: 'Better Luck Next Time!',
    isWin: false,
    isGrandPrize: false,
    color: '#B45309',
    textColor: '#FEF3C7',
    accentColor: '#FDE047',
  },
  {
    index: 11,
    prizeKey: 'prize_500_voucher_4',
    label: 'Rs. 500 Gift Voucher',
    isWin: true,
    isGrandPrize: false,
    color: '#EF4444',
    textColor: '#FFFFFF',
    accentColor: '#FCA5A5',
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

    const tagEl = document.getElementById('verified-tag');
    if (tagEl) {
      if (this.currentUser) {
        tagEl.textContent = '✓ Counselling verified';
        tagEl.className = 'verified-tag';
      } else {
        tagEl.textContent = 'One spin after in-office counselling';
        tagEl.className = 'verified-tag is-guest';
      }
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
      const contactVal = this.currentUser.contact || this.currentUser.email || this.currentUser.phone || '';
      const status = await api.getUserStatus(contactVal);
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
    const emailInput = document.getElementById('reg-email') as HTMLInputElement | null;
    const phoneInput = document.getElementById('reg-phone') as HTMLInputElement | null;
    const intakeInput = document.getElementById('reg-intake') as HTMLSelectElement | null;
    const countryInput = document.getElementById('reg-country') as HTMLSelectElement | null;
    const counselledInput = document.getElementById('reg-counselled') as HTMLInputElement | null;
    const consentInput = document.getElementById('reg-consent') as HTMLInputElement | null;

    const nameError = document.getElementById('name-error');
    const emailError = document.getElementById('email-error');
    const phoneError = document.getElementById('phone-error');
    const consentError = document.getElementById('consent-error');
    const genError = document.getElementById('reg-general-error');

    if (nameError) nameError.textContent = '';
    if (emailError) emailError.textContent = '';
    if (phoneError) phoneError.textContent = '';
    if (consentError) consentError.textContent = '';
    if (genError) {
      genError.style.display = 'none';
      genError.textContent = '';
    }

    const payload = {
      name: nameInput?.value.trim() ?? '',
      email: emailInput?.value.trim() ?? '',
      phone: phoneInput?.value.trim() ?? '',
      contact: `${emailInput?.value.trim() ?? ''} | ${phoneInput?.value.trim() ?? ''}`.trim(),
      intake: intakeInput?.value.trim() || 'jan_2027',
      isCounselled: counselledInput ? Boolean(counselledInput.checked) : true,
      preferredCountry: countryInput?.value.trim() || 'Australia',
      consent: Boolean(consentInput?.checked),
      deviceId: 'device-id-placeholder-replaced-by-api',
    };

    // Client-side Zod validation
    const parsed = UserInfoSchema.safeParse(payload);
    if (!parsed.success) {
      for (const err of parsed.error.errors) {
        if (err.path[0] === 'name' && nameError) nameError.textContent = err.message;
        if (err.path[0] === 'email' && emailError) emailError.textContent = err.message;
        if (err.path[0] === 'phone' && phoneError) phoneError.textContent = err.message;
        if (err.path[0] === 'consent' && consentError) consentError.textContent = err.message;
      }
      return;
    }

    const submitBtn = document.getElementById('start-spinning-submit-btn') as HTMLButtonElement | null;
    if (submitBtn) submitBtn.disabled = true;

    try {
      this.currentUser = {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        contact: parsed.data.email || parsed.data.phone || parsed.data.contact || '',
        intake: parsed.data.intake,
        isCounselled: parsed.data.isCounselled,
        preferredCountry: parsed.data.preferredCountry,
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
        genError.textContent = err instanceof Error ? err.message : 'Verification failed. Try again.';
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
        email: this.currentUser.email,
        phone: this.currentUser.phone,
        contact: this.currentUser.contact,
        intake: this.currentUser.intake,
        isCounselled: this.currentUser.isCounselled,
        preferredCountry: this.currentUser.preferredCountry,
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

      // Step 3: Spin with a fresh randomizer (turns, timing, stop point) onto the drawn cabin
      await this.wheel.spinTo(spinResult.slotIndex);

      // Step 4: Play sound & trigger visual celebration + English Text-to-Speech
      const isLucky = Boolean(spinResult.prize.isLuckyDraw || spinResult.prize.id.startsWith('lucky_draw') || spinResult.prize.label.toLowerCase().includes('lucky draw'));
      if (isLucky) {
        soundManager.playWinFanfare();
        soundManager.speakLuckyDraw();
        this.confetti?.burst(160);
      } else if (spinResult.prize.isGrandPrize) {
        soundManager.playGrandPrizeFanfare();
        soundManager.speakWin(spinResult.prize.label, true);
        this.confetti?.burst(200);
      } else if (spinResult.prize.isWin) {
        soundManager.playWinFanfare();
        soundManager.speakWin(spinResult.prize.label, false);
        this.confetti?.burst(120);
      } else {
        soundManager.playLossChime();
        soundManager.speakLoss();
      }

      // Step 5: Present result modal
      this.showResultModal({
        isWin: spinResult.prize.isWin,
        isGrandPrize: spinResult.prize.isGrandPrize,
        isLuckyDraw: isLucky,
        title: isLucky
          ? "Congratulations! You've Entered the Lucky Draw!"
          : spinResult.prize.isGrandPrize
          ? 'Congratulations! Grand prize winner!'
          : spinResult.prize.isWin
          ? 'Congratulations!'
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
    readonly isLuckyDraw?: boolean;
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
    const spinsRemainingEl = document.getElementById('result-spins-left-text');

    const isLucky = Boolean(info.isLuckyDraw || info.prizeName.toLowerCase().includes('lucky draw'));
    const isVoucher = info.prizeName.toLowerCase().includes('voucher') || info.prizeName.toLowerCase().includes('500') || info.prizeName.toLowerCase().includes('1,000');

    if (badgeEl) {
      if (isLucky) {
        badgeEl.textContent = '⭐ LUCKY DRAW ENTRY ⭐';
        badgeEl.className = 'result-badge badge-accent';
      } else if (isVoucher) {
        badgeEl.textContent = '🎁 INSTANT PRIZE VOUCHER';
        badgeEl.className = 'result-badge badge-success';
      } else if (info.isWin) {
        badgeEl.textContent = 'WINNER';
        badgeEl.className = 'result-badge badge-success';
      } else {
        badgeEl.textContent = 'RESULT';
        badgeEl.className = 'result-badge badge-muted';
      }
    }

    if (titleEl) titleEl.textContent = info.title;

    if (iconEl) {
      if (isLucky) {
        iconEl.innerHTML = `<span style="font-size: 3.5rem;">🎟️</span>`;
      } else if (isVoucher) {
        iconEl.innerHTML = `<span style="font-size: 3.5rem;">🎁</span>`;
      } else if (info.image) {
        iconEl.innerHTML = `<div class="result-img-wrapper"><img src="${info.image}" alt="${info.prizeName}" class="result-won-img" /></div>`;
      } else {
        iconEl.innerHTML = `<span style="font-size: 3.5rem;">${info.isWin ? '🎁' : '🪔'}</span>`;
      }
    }

    if (prizeEl) prizeEl.textContent = info.prizeName;
    if (descEl) descEl.textContent = info.desc;

    const mysteryNotice = document.getElementById('mystery-box-notice');
    if (mysteryNotice) {
      mysteryNotice.style.display = 'none';
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
