import type { PublicSlotConfig } from '../../shared/types.js';

export interface WheelOptions {
  readonly onTick?: () => void;
  readonly onSpinStart?: () => void;
}

export class Wheel {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private slots: readonly PublicSlotConfig[];
  private currentRotation = 0; // Current angle in radians
  private isSpinning = false;
  private onTick?: () => void;
  private onSpinStart?: () => void;
  private imageCache = new Map<string, HTMLImageElement>();
  private lastTickedSlice = -1;

  constructor(
    canvas: HTMLCanvasElement,
    slots: readonly PublicSlotConfig[],
    options?: WheelOptions
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context not supported');
    }
    this.ctx = context;
    this.slots = slots;
    this.onTick = options?.onTick;
    this.onSpinStart = options?.onSpinStart;

    this.preloadImages();
    this.setupDpi();

    window.addEventListener('resize', () => {
      this.setupDpi();
      this.draw();
    });

    this.draw();
  }

  private preloadImages(): void {
    const essentialImages = [
      '/assets/ntc_logo.png',
      '/assets/ncell_logo.png',
      '/assets/clover.png',
      '/assets/mobile_flagship.jpg',
      '/assets/earpods_pro.jpg',
      '/assets/powerbank_pro.jpg',
      '/assets/mystery_box.png',
    ];
    for (const src of essentialImages) {
      if (!this.imageCache.has(src)) {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          this.imageCache.set(src, img);
          this.draw();
        };
        this.imageCache.set(src, img);
      }
    }

    for (const slot of this.slots) {
      if (slot.image && !this.imageCache.has(slot.image)) {
        const img = new Image();
        img.src = slot.image;
        img.onload = () => {
          this.imageCache.set(slot.image!, img);
          this.draw();
        };
        this.imageCache.set(slot.image, img);
      }
    }
  }

  /**
   * Compute start/end angles for each slot based on visualWeight.
   * Slots without visualWeight default to 1.
   */
  private computeSliceAngles(): { start: number; end: number; angle: number }[] {
    const totalVisualWeight = this.slots.reduce(
      (sum, s) => sum + (s.visualWeight ?? 1),
      0
    );
    const result: { start: number; end: number; angle: number }[] = [];
    let cumulative = 0;
    for (const slot of this.slots) {
      const w = slot.visualWeight ?? 1;
      const sliceAngle = (w / totalVisualWeight) * 2 * Math.PI;
      result.push({ start: cumulative, end: cumulative + sliceAngle, angle: sliceAngle });
      cumulative += sliceAngle;
    }
    return result;
  }

  public updateSlots(newSlots: readonly PublicSlotConfig[]): void {
    this.slots = newSlots;
    this.preloadImages();
    this.draw();
  }

  private setupDpi(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const size = Math.max(320, Math.min(rect.width, rect.height) || 600);

    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
  }

  /**
   * Pure luxury studio palette generator for slots:
   * Sharp, deep obsidian/jewel tones with clean contrast, zero muddy gradients.
   */
  private getSliceStyle(slot: PublicSlotConfig, index: number, radius: number): {
    fill: CanvasGradient | string;
    accent: string;
    isLuckyDraw: boolean;
    isGiftCard: boolean;
    isHamper: boolean;
    isBetterLuck: boolean;
  } {
    const labelLower = slot.label.toLowerCase();
    const isLuckyDraw = Boolean(
      slot.isLuckyDraw ||
      slot.prizeKey?.startsWith('lucky_draw') ||
      labelLower.includes('lucky draw')
    );
    const isGiftCard = Boolean(
      slot.prizeKey?.includes('voucher') ||
      slot.prizeKey?.includes('card') ||
      labelLower.includes('voucher') ||
      labelLower.includes('1,000') ||
      labelLower.includes('500')
    ) && !isLuckyDraw;
    const isHamper = false;
    const isBetterLuck = !slot.isWin || labelLower.includes('better luck');

    const grad = this.ctx.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius);

    if (isLuckyDraw) {
      // Champagne gold for Lucky Draw entries
      grad.addColorStop(0, '#2D200E');
      grad.addColorStop(0.45, '#1E1609');
      grad.addColorStop(0.85, '#120E06');
      grad.addColorStop(1, '#090703');
      return { fill: grad, accent: '#F59E0B', isLuckyDraw, isGiftCard, isHamper, isBetterLuck };
    }

    if (isGiftCard) {
      // Deep Emerald / Sapphire Slate
      const is500 = labelLower.includes('500');
      if (is500) {
        grad.addColorStop(0, '#0E3628');
        grad.addColorStop(0.5, '#09251C');
        grad.addColorStop(0.85, '#051610');
        grad.addColorStop(1, '#020B08');
        return { fill: grad, accent: '#10B981', isLuckyDraw, isGiftCard, isHamper, isBetterLuck };
      } else {
        grad.addColorStop(0, '#152C4D');
        grad.addColorStop(0.5, '#0C1C33');
        grad.addColorStop(0.85, '#071221');
        grad.addColorStop(1, '#03080F');
        return { fill: grad, accent: '#38BDF8', isLuckyDraw, isGiftCard, isHamper, isBetterLuck };
      }
    }

    if (isHamper) {
      // Deep Imperial Amethyst
      grad.addColorStop(0, '#2C134A');
      grad.addColorStop(0.5, '#1B0930');
      grad.addColorStop(0.85, '#110520');
      grad.addColorStop(1, '#08020F');
      return { fill: grad, accent: '#C084FC', isLuckyDraw, isGiftCard, isHamper, isBetterLuck };
    }

    // Better Luck Next Time: Clean Matte Obsidian / Slate alternating pattern
    const isAlt = index % 2 === 0;
    if (isAlt) {
      grad.addColorStop(0, '#1E2533');
      grad.addColorStop(0.5, '#141A24');
      grad.addColorStop(0.85, '#0D1117');
      grad.addColorStop(1, '#080A0E');
    } else {
      grad.addColorStop(0, '#1A202C');
      grad.addColorStop(0.5, '#12161F');
      grad.addColorStop(0.85, '#0B0D13');
      grad.addColorStop(1, '#06070A');
    }
    return { fill: grad, accent: 'rgba(255, 255, 255, 0.15)', isLuckyDraw, isGiftCard, isHamper, isBetterLuck };
  }

  /**
   * Main rendering method for the wheel circle.
   * Delivers an edgeless, spotless, razor-sharp studio aesthetic.
   */
  public draw(): void {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;
    const centerX = width / 2;
    const centerY = height / 2;
    // Edgeless: extends all the way near the canvas boundary with 2px clearance
    const radius = Math.min(centerX, centerY) - 2;

    this.ctx.clearRect(0, 0, width, height);

    if (this.slots.length === 0) return;

    const sliceAngles = this.computeSliceAngles();
    const isMobile = width < 460;

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(this.currentRotation);

    // ==========================================
    // 1. DRAW WEDGES & CONTENT
    // ==========================================
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i]!;
      const { start: startAngle, end: endAngle, angle: sliceAngle } = sliceAngles[i]!;
      const style = this.getSliceStyle(slot, i, radius);

      // Wedge background
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.arc(0, 0, radius, startAngle, endAngle);
      this.ctx.closePath();
      this.ctx.fillStyle = style.fill;
      this.ctx.fill();

      // Subtle inner rim accent arc for precious & win slots
      if (style.isLuckyDraw) {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius - 2, startAngle, endAngle);
        this.ctx.lineWidth = 2.5;
        this.ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
        this.ctx.stroke();
      } else if (style.isGiftCard) {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius - 2, startAngle, endAngle);
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeStyle = style.accent;
        this.ctx.stroke();
      }

      // Razor-sharp 1px divider hairline
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(Math.cos(startAngle) * radius, Math.sin(startAngle) * radius);
      this.ctx.lineWidth = style.isLuckyDraw ? 1.5 : 1;
      this.ctx.strokeStyle = style.isLuckyDraw
        ? 'rgba(245, 158, 11, 0.65)'
        : 'rgba(255, 255, 255, 0.12)';
      this.ctx.stroke();

      // ==========================================
      // 2. SLICE CONTENT: ICON / BADGE & CLEAN TEXT
      // ==========================================
      this.ctx.save();
      const midAngle = startAngle + sliceAngle / 2;
      this.ctx.rotate(midAngle);

      // Proportional layout distances
      const iconDist = radius * (isMobile ? 0.76 : 0.77);
      const textDist = radius * (isMobile ? 0.44 : 0.46);
      const availableWidthAtIcon = 2 * iconDist * Math.tan(sliceAngle / 2);
      const availableTextWidth = 2 * textDist * Math.tan(sliceAngle / 2) * 0.95;

      // --- A) BADGE / ICON RENDERING ---
      this.renderSlotIcon(slot, style, iconDist, availableWidthAtIcon, isMobile);

      // --- B) CLEAN, SHARP TYPOGRAPHY ---
      this.renderSlotText(slot, style, textDist, availableTextWidth, isMobile);

      this.ctx.restore();
    }

    // Outer subtle concentric track line (precision gauge detail)
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius * 0.94, 0, 2 * Math.PI);
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.stroke();

    // ==========================================
    // 3. EDGELESS PRECISION PERIMETER & NOTCHES
    // ==========================================
    // Razor-thin titanium/gold perimeter hairline
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius - 0.75, 0, 2 * Math.PI);
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    this.ctx.stroke();

    // Minimalist Micro-Tick Notches at each slice boundary (like a luxury chronograph)
    for (let i = 0; i < this.slots.length; i++) {
      const pinAngle = sliceAngles[i]!.start;
      const notchOuterX = Math.cos(pinAngle) * radius;
      const notchOuterY = Math.sin(pinAngle) * radius;
      const notchInnerX = Math.cos(pinAngle) * (radius - 5.5);
      const notchInnerY = Math.sin(pinAngle) * (radius - 5.5);

      this.ctx.beginPath();
      this.ctx.moveTo(notchOuterX, notchOuterY);
      this.ctx.lineTo(notchInnerX, notchInnerY);
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeStyle = '#F59E0B';
      this.ctx.stroke();
    }

    this.ctx.restore(); // Undo canvas rotation and translation
  }

  /**
   * Renders high-DPI, spotless vector badges and image cutouts.
   */
  private renderSlotIcon(
    slot: PublicSlotConfig,
    style: { isLuckyDraw: boolean; isGiftCard: boolean; isHamper: boolean; isBetterLuck: boolean; accent: string },
    iconDist: number,
    availableWidth: number,
    isMobile: boolean
  ): void {
    this.ctx.save();
    this.ctx.translate(iconDist, 0);
    this.ctx.rotate(Math.PI / 2);

    const baseBadgeRadius = isMobile ? 22 : 30;
    const maxRadius = (availableWidth * 0.92) / 2;
    const badgeRadius = Math.max(14, Math.min(baseBadgeRadius, maxRadius));

    if (style.isBetterLuck) {
      // Minimalist Clover / Luck Glyph
      const cloverImg = this.imageCache.get('/assets/clover.png');
      if (cloverImg && cloverImg.complete && cloverImg.naturalWidth > 0) {
        const size = badgeRadius * 2.1;
        this.ctx.save();
        this.ctx.globalAlpha = 0.85;
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        this.ctx.shadowBlur = 4;
        this.ctx.drawImage(cloverImg, -size / 2, -size / 2, size, size);
        this.ctx.restore();
      } else {
        // Crisp vector four-point star / clover
        this.ctx.beginPath();
        this.ctx.arc(0, 0, badgeRadius * 0.7, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        this.ctx.fill();
        this.ctx.font = `${badgeRadius * 0.9}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('✦', 0, 0);
      }
    } else if (style.isLuckyDraw) {
      // Lucky Draw Entry: Refined Frosted Gold Disc with Golden Star Emblem
      this.ctx.beginPath();
      this.ctx.arc(0, 0, badgeRadius, 0, 2 * Math.PI);
      this.ctx.fillStyle = 'rgba(24, 18, 8, 0.92)';
      this.ctx.fill();
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeStyle = '#F59E0B';
      this.ctx.stroke();

      this.ctx.font = `${badgeRadius * 1.15}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('⭐', 0, 0);
    } else if (style.isGiftCard) {
      // Gift Voucher: Luxury Sapphire / Emerald Badge
      this.ctx.beginPath();
      this.ctx.arc(0, 0, badgeRadius, 0, 2 * Math.PI);
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      this.ctx.fill();
      this.ctx.lineWidth = 1.2;
      this.ctx.strokeStyle = style.accent;
      this.ctx.stroke();

      this.ctx.font = `${badgeRadius * 1.1}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('🎁', 0, 0);
    } else {
      // General Prize
      this.ctx.font = `${badgeRadius * 1.1}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('🎁', 0, 0);
    }

    this.ctx.restore();
  }

  /**
   * Renders sharp, non-AI typography without cartoon black stroke outlines.
   */
  private renderSlotText(
    slot: PublicSlotConfig,
    style: { isLuckyDraw: boolean; isGiftCard: boolean; isHamper: boolean; isBetterLuck: boolean; accent: string },
    textDist: number,
    availableWidth: number,
    isMobile: boolean
  ): void {
    this.ctx.save();
    this.ctx.translate(textDist, 0);
    this.ctx.rotate(Math.PI / 2);

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Spotless subtle micro-shadow for crisp legibility
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    this.ctx.shadowBlur = 3;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 1;

    const displayLabel = slot.label;

    if (style.isBetterLuck) {
      // 2 clean stacked lines for Better Luck Next Time
      let fontSize = isMobile ? 11.5 : 13.5;
      this.ctx.font = `700 ${fontSize}px var(--font-heading, 'Outfit', 'Inter', -apple-system, sans-serif)`;
      let m1 = this.ctx.measureText('Better Luck');
      let m2 = this.ctx.measureText('Next Time!');

      while ((m1.width > availableWidth || m2.width > availableWidth) && fontSize > 8.5) {
        fontSize -= 0.5;
        this.ctx.font = `700 ${fontSize}px var(--font-heading, 'Outfit', 'Inter', -apple-system, sans-serif)`;
        m1 = this.ctx.measureText('Better Luck');
        m2 = this.ctx.measureText('Next Time!');
      }

      const lineSpacing = fontSize * 0.75;
      this.ctx.fillStyle = '#CBD5E1';
      this.ctx.fillText('Better Luck', 0, -lineSpacing);
      this.ctx.fillText('Next Time!', 0, lineSpacing);
    } else if (style.isLuckyDraw) {
      // 2 stacked lines for You've Entered the Lucky Draw!
      const line1 = "You've Entered";
      const line2 = 'Lucky Draw!';

      let fontSize = isMobile ? 11.5 : 13.5;
      this.ctx.font = `800 ${fontSize}px var(--font-heading, 'Outfit', 'Inter', -apple-system, sans-serif)`;

      let mw1 = this.ctx.measureText(line1);
      let mw2 = this.ctx.measureText(line2);

      while ((mw1.width > availableWidth || mw2.width > availableWidth) && fontSize > 8.5) {
        fontSize -= 0.5;
        this.ctx.font = `800 ${fontSize}px var(--font-heading, 'Outfit', 'Inter', -apple-system, sans-serif)`;
        mw1 = this.ctx.measureText(line1);
        mw2 = this.ctx.measureText(line2);
      }

      const lineSpacing = fontSize * 0.78;
      this.ctx.fillStyle = '#FEF08A';
      this.ctx.fillText(line1, 0, -lineSpacing);
      this.ctx.fillText(line2, 0, lineSpacing);
    } else if (displayLabel.includes('Voucher')) {
      // 2 stacked lines for Rs. 1,000 / Rs. 500 Gift Voucher
      const is1000 = displayLabel.includes('1,000') || displayLabel.includes('1000');
      const line1 = is1000 ? 'Rs. 1,000' : 'Rs. 500';
      const line2 = 'Gift Voucher';

      let fontSize = isMobile ? 12 : 14;
      this.ctx.font = `800 ${fontSize}px var(--font-heading, 'Outfit', 'Inter', -apple-system, sans-serif)`;

      let mw1 = this.ctx.measureText(line1);
      let mw2 = this.ctx.measureText(line2);

      while ((mw1.width > availableWidth || mw2.width > availableWidth) && fontSize > 8.5) {
        fontSize -= 0.5;
        this.ctx.font = `800 ${fontSize}px var(--font-heading, 'Outfit', 'Inter', -apple-system, sans-serif)`;
        mw1 = this.ctx.measureText(line1);
        mw2 = this.ctx.measureText(line2);
      }

      const lineSpacing = fontSize * 0.78;
      this.ctx.fillStyle = slot.textColor || '#FFFFFF';
      this.ctx.fillText(line1, 0, -lineSpacing);
      this.ctx.fillText(line2, 0, lineSpacing);
    } else {
      // General prize formatting fallback
      let fontSize = isMobile ? 12 : 14;
      this.ctx.font = `800 ${fontSize}px var(--font-heading, 'Outfit', 'Inter', -apple-system, sans-serif)`;
      let textMetrics = this.ctx.measureText(displayLabel);
      while (textMetrics.width > availableWidth && fontSize > 8.5) {
        fontSize -= 0.5;
        this.ctx.font = `800 ${fontSize}px var(--font-heading, 'Outfit', 'Inter', -apple-system, sans-serif)`;
        textMetrics = this.ctx.measureText(displayLabel);
      }

      this.ctx.fillStyle = slot.textColor || '#FFFFFF';
      this.ctx.fillText(displayLabel, 0, 0);
    }

    this.ctx.restore();
  }

  /**
   * Helper to draw a rounded rectangle.
   */
  private roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  /**
   * Suspense deceleration easing function.
   * Starts with rapid momentum, slows smoothly to build authentic tension.
   */
  private easeOutSuspense(t: number): number {
    return 1 - Math.pow(1 - t, 4.4);
  }

  /**
   * Animates the wheel from current position to land accurately on target slot index.
   */
  public spinTo(targetSlotIndex: number): Promise<void> {
    if (this.isSpinning) {
      return Promise.reject(new Error('Wheel is already spinning'));
    }

    this.isSpinning = true;
    this.onSpinStart?.();

    return new Promise((resolve) => {
      const sliceAngles = this.computeSliceAngles();

      // Pointer is stationary at top: -PI/2 radians (270 degrees)
      const pointerAngle = -Math.PI / 2;

      // Center angle of target slot inside unrotated wheel:
      const targetSlice = sliceAngles[targetSlotIndex]!;
      const targetCenterAngle = targetSlice.start + targetSlice.angle / 2;

      // Subtle natural jitter inside slot slice ([-18%, +18%] of slice width)
      const jitter = (Math.random() - 0.5) * targetSlice.angle * 0.36;

      // Calculate angle difference
      const currentNorm = this.currentRotation % (2 * Math.PI);
      let angleDiff = (pointerAngle - (targetCenterAngle + jitter) - currentNorm) % (2 * Math.PI);
      if (angleDiff < 0) {
        angleDiff += 2 * Math.PI;
      }

      // 8 full rotations for crisp cinematic spin
      const fullRotations = 8 * (2 * Math.PI);
      const startRotation = this.currentRotation;
      const finalRotation = this.currentRotation + fullRotations + angleDiff;

      // 8.6 seconds duration for suspense
      const durationMs = 8600;
      const startTime = performance.now();

      const pointerEl = document.getElementById('wheel-pointer');

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        const easedProgress = this.easeOutSuspense(progress);

        this.currentRotation = startRotation + (finalRotation - startRotation) * easedProgress;

        // Check if pointer crossed a notch
        const angleUnderPointer =
          ((pointerAngle - this.currentRotation) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        let currentSliceUnderPointer = 0;
        for (let s = 0; s < sliceAngles.length; s++) {
          if (angleUnderPointer >= sliceAngles[s]!.start && angleUnderPointer < sliceAngles[s]!.end) {
            currentSliceUnderPointer = s;
            break;
          }
        }

        if (currentSliceUnderPointer !== this.lastTickedSlice) {
          this.lastTickedSlice = currentSliceUnderPointer;
          this.onTick?.();

          // Pointer tick bounce effect
          if (pointerEl) {
            pointerEl.classList.add('ticking');
            setTimeout(() => pointerEl.classList.remove('ticking'), 50);
          }
        }

        this.draw();

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.currentRotation = finalRotation;
          this.draw();
          this.isSpinning = false;
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  public getIsSpinning(): boolean {
    return this.isSpinning;
  }
}
