/**
 * Web Audio API Sound Effects Synthesizer & Web Speech API Text-to-Speech Engine.
 * Provides crisp mechanical tick sounds, win fanfares, loss chimes, and
 * expressive English voice speech announcements with full mute control.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private englishVoice: SpeechSynthesisVoice | null = null;
  private bgMusic: HTMLAudioElement | null = null;
  private hasUserInteracted = false;

  constructor() {
    const saved = localStorage.getItem('wheel_sound_muted');
    if (saved !== null) {
      this.isMuted = saved === 'true';
    }

    this.initVoice();
    this.initBgMusic();
  }

  private initBgMusic(): void {
    if (typeof window === 'undefined') return;

    try {
      this.bgMusic = new Audio('/assets/bg_music.mp3');
      this.bgMusic.loop = true;
      this.bgMusic.volume = 0.38;
      this.bgMusic.preload = 'auto';

      const startMusicOnInteraction = () => {
        if (!this.hasUserInteracted) {
          this.hasUserInteracted = true;
          this.initContext();
          if (!this.isMuted) {
            this.playBgMusic();
          }
        }
      };

      ['pointerdown', 'click', 'keydown', 'touchstart'].forEach((evt) => {
        window.addEventListener(evt, startMusicOnInteraction, { once: true, passive: true });
      });

      if (!this.isMuted) {
        this.playBgMusic();
      }
    } catch (err) {
      console.warn('Failed to initialize background music:', err);
    }
  }

  public playBgMusic(): void {
    if (!this.bgMusic || this.isMuted) return;
    this.bgMusic.play().catch(() => {
      // Browser requires user interaction before playing audio
    });
  }

  public pauseBgMusic(): void {
    if (this.bgMusic) {
      this.bgMusic.pause();
    }
  }

  public duckBgMusic(duck: boolean): void {
    if (!this.bgMusic) return;
    this.bgMusic.volume = duck ? 0.12 : 0.38;
  }

  private initVoice(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      // Prioritize natural English voices
      const enVoice =
        voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('David'))) ||
        voices.find((v) => v.lang.startsWith('en-US')) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        null;
      this.englishVoice = enVoice;
    };

    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }

  private initContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // User gesture will unlock audio
      });
    }
    return this.ctx;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    localStorage.setItem('wheel_sound_muted', String(muted));
    if (muted) {
      this.stopSpeech();
      this.pauseBgMusic();
    } else {
      this.playBgMusic();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * English Text-to-Speech Engine using standard Web Speech API.
   */
  public speak(text: string, options?: { rate?: number; pitch?: number }): void {
    if (this.isMuted) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // Stop any pending speech
      this.duckBgMusic(true);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = options?.rate ?? 1.05;
      utterance.pitch = options?.pitch ?? 1.08;
      utterance.volume = 1.0;

      utterance.onend = () => {
        this.duckBgMusic(false);
      };
      utterance.onerror = () => {
        this.duckBgMusic(false);
      };

      if (this.englishVoice) {
        utterance.voice = this.englishVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      this.duckBgMusic(false);
      console.warn('Text-to-speech error:', err);
    }
  }

  public stopSpeech(): void {
    this.duckBgMusic(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignored
      }
    }
  }

  /**
   * Speaks winning prize announcement in clear, enthusiastic English.
   */
  public speakWin(prizeLabel: string, isGrandPrize: boolean): void {
    // Clean up label for smooth pronunciation (e.g. Rs. -> Rupees)
    const cleanLabel = prizeLabel.replace(/^⭐\s*/, '').replace(/Rs\.\s*/i, 'Rupees ');

    const text = isGrandPrize
      ? `Congratulations! You won the Grand Prize, ${cleanLabel}!`
      : `Congratulations! You won ${cleanLabel}!`;

    // Speak shortly after fanfare starts
    setTimeout(() => {
      this.speak(text, { rate: 1.05, pitch: isGrandPrize ? 1.15 : 1.08 });
    }, 350);
  }

  /**
   * Speaks Lucky Draw qualification announcement.
   */
  public speakLuckyDraw(): void {
    const text = "Congratulations! You've Entered the Lucky Draw!";
    setTimeout(() => {
      this.speak(text, { rate: 1.05, pitch: 1.12 });
    }, 350);
  }

  /**
   * Speaks encouraging message when participant doesn't win a prize.
   */
  public speakLoss(): void {
    const text = 'Better luck next time! Thank you for playing.';
    setTimeout(() => {
      this.speak(text, { rate: 1.0, pitch: 1.0 });
    }, 300);
  }

  /**
   * Crisp mechanical click sound when pointer strikes a wheel pin.
   */
  public playTick(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Audio playback gracefully handles browser restrictions
    }
  }

  /**
   * Harmonious arpeggiated fanfare for normal prize winners.
   */
  public playWinFanfare(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);

        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + idx * 0.1 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.5);
      });
    } catch {
      // Ignore audio failure
    }
  }

  /**
   * Majestic multi-voice fanfare for Grand Prize winner!
   */
  public playGrandPrizeFanfare(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const melody = [
        { f: 523.25, t: 0.0 }, // C5
        { f: 659.25, t: 0.12 }, // E5
        { f: 783.99, t: 0.24 }, // G5
        { f: 1046.5, t: 0.36 }, // C6
        { f: 880.0, t: 0.52 }, // A5
        { f: 1046.5, t: 0.7 }, // C6
        { f: 1318.51, t: 0.9 }, // E6
      ];

      for (const item of melody) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(item.f, ctx.currentTime + item.t);

        gain.gain.setValueAtTime(0, ctx.currentTime + item.t);
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + item.t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + item.t + 0.7);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + item.t);
        osc.stop(ctx.currentTime + item.t + 0.7);
      }
    } catch {
      // Ignore audio failure
    }
  }

  /**
   * Gentle, friendly descending chime for Try Again Later.
   */
  public playLossChime(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const notes = [440, 392, 349.23]; // A4, G4, F4
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.18);

        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.18 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.18);
        osc.stop(ctx.currentTime + idx * 0.18 + 0.35);
      });
    } catch {
      // Ignore audio failure
    }
  }
}

export const soundManager = new SoundManager();
