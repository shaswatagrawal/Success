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

    // Strictly RED, BLUE, and YELLOW palette across all 12 slots
    // Slices 0, 2, 4, 6, 8: Radiant Golden Yellow
    // Slices 1, 7, 10: Electric Royal Blue
    // Slices 3, 5, 9, 11: Vibrant Ruby Crimson Red
    const isYellow = index === 0 || index === 2 || index === 4 || index === 6 || index === 8;
    const isBlue = index === 1 || index === 7 || index === 10;

    if (isYellow) {
      // 🌟 Luminous Golden Yellow
      grad.addColorStop(0, '#5C2B04');
      grad.addColorStop(0.25, '#92400E');
      grad.addColorStop(0.6, '#D97706');
      grad.addColorStop(0.88, '#F59E0B');
      grad.addColorStop(1, '#FDE047');
      return { fill: grad, accent: '#FDE047', isLuckyDraw, isGiftCard, isHamper, isBetterLuck };
    } else if (isBlue) {
      // 💎 Electric Royal Sapphire Blue
      grad.addColorStop(0, '#060F2E');
      grad.addColorStop(0.25, '#1E3A8A');
      grad.addColorStop(0.6, '#1D4ED8');
      grad.addColorStop(0.88, '#2563EB');
      grad.addColorStop(1, '#60A5FA');
      return { fill: grad, accent: '#60A5FA', isLuckyDraw, isGiftCard, isHamper, isBetterLuck };
    } else {
      // 🔥 Radiant Crimson Scarlet Red
      grad.addColorStop(0, '#300408');
      grad.addColorStop(0.25, '#7F1D1D');
      grad.addColorStop(0.6, '#B91C1C');
      grad.addColorStop(0.88, '#DC2626');
      grad.addColorStop(1, '#F87171');
      return { fill: grad, accent: '#FCA5A5', isLuckyDraw, isGiftCard, isHamper, isBetterLuck };
    }
  }

  /**
   * Main rendering method for the wheel circle with a realistic 3D metallic casino border and studs.
   */
  public draw(): void {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;
    const centerX = width / 2;
    const centerY = height / 2;
    const isMobile = width < 460;

    // Realistic border geometry
    const outerRadius = Math.min(centerX, centerY) - 2;
    const borderWidth = isMobile ? 18 : 24;
    const innerRadius = outerRadius - borderWidth;

    this.ctx.clearRect(0, 0, width, height);

    if (this.slots.length === 0) return;

    const sliceAngles = this.computeSliceAngles();

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(this.currentRotation);

    // ==========================================
    // 1. DRAW INNER ROTATING WEDGES & CONTENT
    // ==========================================
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i]!;
      const { start: startAngle, end: endAngle, angle: sliceAngle } = sliceAngles[i]!;
      const style = this.getSliceStyle(slot, i, innerRadius);

      // Wedge background with subtle 3D lighting vignette
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.arc(0, 0, innerRadius, startAngle, endAngle);
      this.ctx.closePath();
      this.ctx.fillStyle = style.fill;
      this.ctx.fill();

      // Realistic 3D slice divider spoke (embossed highlight & shadow)
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(Math.cos(startAngle) * innerRadius, Math.sin(startAngle) * innerRadius);
      this.ctx.lineWidth = 2.5;
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(Math.cos(startAngle) * innerRadius, Math.sin(startAngle) * innerRadius);
      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      this.ctx.stroke();

      // ==========================================
      // 2. SLICE CONTENT: ICON / BADGE & CLEAN TEXT
      // ==========================================
      this.ctx.save();
      const midAngle = startAngle + sliceAngle / 2;
      this.ctx.rotate(midAngle);

      // Proportional layout distances - text moved up and balanced with icon
      const iconDist = innerRadius * (isMobile ? 0.76 : 0.79);
      const textDist = innerRadius * (isMobile ? 0.46 : 0.49);
      const availableWidthAtIcon = 2 * iconDist * Math.tan(sliceAngle / 2);
      const availableTextWidth = 2 * textDist * Math.tan(sliceAngle / 2) * 0.98;

      // --- A) BADGE / ICON RENDERING ---
      this.renderSlotIcon(slot, style, iconDist, availableWidthAtIcon, isMobile);

      // --- B) CLEAN, SHARP TYPOGRAPHY ---
      this.renderSlotText(slot, style, textDist, availableTextWidth, isMobile);

      this.ctx.restore();
    }

    // Inner shadow chamfer separating wedges from outer border
    this.ctx.beginPath();
    this.ctx.arc(0, 0, innerRadius, 0, 2 * Math.PI);
    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
    this.ctx.stroke();

    // ==========================================
    // 3. REALISTIC 3D METALLIC GOLD BORDER (BEZEL)
    // ==========================================
    // Outer metallic ring fill
    this.ctx.beginPath();
    this.ctx.arc(0, 0, outerRadius, 0, 2 * Math.PI);
    this.ctx.arc(0, 0, innerRadius, 0, 2 * Math.PI, true);
    this.ctx.closePath();

    const bezelGrad = this.ctx.createRadialGradient(0, 0, innerRadius, 0, 0, outerRadius);
    bezelGrad.addColorStop(0, '#5C2B04');
    bezelGrad.addColorStop(0.18, '#B45309');
    bezelGrad.addColorStop(0.45, '#FDE047');
    bezelGrad.addColorStop(0.75, '#F59E0B');
    bezelGrad.addColorStop(0.92, '#78350F');
    bezelGrad.addColorStop(1, '#3B1A02');
    this.ctx.fillStyle = bezelGrad;
    this.ctx.fill();

    // Outer rim highlight hairline
    this.ctx.beginPath();
    this.ctx.arc(0, 0, outerRadius - 0.75, 0, 2 * Math.PI);
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    this.ctx.stroke();

    // Inner rim gold hairline
    this.ctx.beginPath();
    this.ctx.arc(0, 0, innerRadius + 0.75, 0, 2 * Math.PI);
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeStyle = 'rgba(253, 224, 71, 0.8)';
    this.ctx.stroke();

    // ==========================================
    // 4. 3D GOLDEN RIVET STUDS / PEGS ON THE RIM
    // ==========================================
    const studRadius = isMobile ? 3.5 : 4.5;
    const studCenterDist = (innerRadius + outerRadius) / 2;

    for (let i = 0; i < this.slots.length; i++) {
      const pinAngle = sliceAngles[i]!.start;
      const studX = Math.cos(pinAngle) * studCenterDist;
      const studY = Math.sin(pinAngle) * studCenterDist;

      // Soft drop shadow behind the peg
      this.ctx.beginPath();
      this.ctx.arc(studX + 1.2, studY + 1.5, studRadius, 0, 2 * Math.PI);
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      this.ctx.fill();

      // 3D spherical metallic gold body
      this.ctx.beginPath();
      this.ctx.arc(studX, studY, studRadius, 0, 2 * Math.PI);
      const studGrad = this.ctx.createRadialGradient(
        studX - studRadius * 0.35,
        studY - studRadius * 0.35,
        studRadius * 0.1,
        studX,
        studY,
        studRadius
      );
      studGrad.addColorStop(0, '#FFFFFF');
      studGrad.addColorStop(0.3, '#FEF08A');
      studGrad.addColorStop(0.7, '#F59E0B');
      studGrad.addColorStop(1, '#78350F');
      this.ctx.fillStyle = studGrad;
      this.ctx.fill();

      // Crisp chrome outline
      this.ctx.lineWidth = 0.75;
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
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

    const baseBadgeRadius = isMobile ? 19 : 25;
    const maxRadius = (availableWidth * 0.90) / 2;
    const badgeRadius = Math.max(14, Math.min(baseBadgeRadius, maxRadius));

    if (style.isBetterLuck) {
      // Better Luck Next Time: Crying Face Emoji 😭
      this.ctx.beginPath();
      this.ctx.arc(0, 0, badgeRadius, 0, 2 * Math.PI);
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      this.ctx.fill();
      this.ctx.lineWidth = 1.4;
      this.ctx.strokeStyle = style.accent;
      this.ctx.stroke();

      this.ctx.font = `${badgeRadius * 1.45}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('😭', 0, 1);
    } else if (style.isLuckyDraw) {
      // Lucky Draw Entry: Refined Frosted Gold Disc with ? Symbol
      this.ctx.beginPath();
      this.ctx.arc(0, 0, badgeRadius, 0, 2 * Math.PI);
      this.ctx.fillStyle = 'rgba(24, 18, 8, 0.95)';
      this.ctx.fill();
      this.ctx.lineWidth = 1.6;
      this.ctx.strokeStyle = '#FDE047';
      this.ctx.stroke();

      // Bold, stylish Question Mark ?
      this.ctx.font = `900 ${badgeRadius * 1.45}px var(--font-heading, 'Outfit', 'Inter', sans-serif)`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = '#FEF08A';
      this.ctx.shadowColor = 'rgba(245, 158, 11, 0.85)';
      this.ctx.shadowBlur = 6;
      this.ctx.fillText('?', 0, 1);
    } else if (style.isGiftCard) {
      // Gift Voucher: Luxury Sapphire / Emerald Badge with Gift Box
      this.ctx.beginPath();
      this.ctx.arc(0, 0, badgeRadius, 0, 2 * Math.PI);
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      this.ctx.fill();
      this.ctx.lineWidth = 1.4;
      this.ctx.strokeStyle = style.accent;
      this.ctx.stroke();

      this.ctx.font = `${badgeRadius * 1.45}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('🎁', 0, 1);
    } else {
      // General Prize
      this.ctx.beginPath();
      this.ctx.arc(0, 0, badgeRadius, 0, 2 * Math.PI);
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      this.ctx.fill();
      this.ctx.lineWidth = 1.4;
      this.ctx.strokeStyle = style.accent;
      this.ctx.stroke();

      this.ctx.font = `${badgeRadius * 1.45}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('🎁', 0, 1);
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
      let fontSize = isMobile ? 13 : 15.5;
      this.ctx.font = `700 ${fontSize}px var(--font-heading, 'Outfit', 'Inter', -apple-system, sans-serif)`;
      let m1 = this.ctx.measureText('Better Luck');
      let m2 = this.ctx.measureText('Next Time!');

      while ((m1.width > availableWidth || m2.width > availableWidth) && fontSize > 9) {
        fontSize -= 0.5;
        this.ctx.font = `700 ${fontSize}px var(--font-heading, 'Outfit', 'Inter', -apple-system, sans-serif)`;
        m1 = this.ctx.measureText('Better Luck');
        m2 = this.ctx.measureText('Next Time!');
      }

      const lineSpacing = fontSize * 0.72;
      this.ctx.fillStyle = '#CBD5E1';
      this.ctx.fillText('Better Luck', 0, -lineSpacing);
      this.ctx.fillText('Next Time!', 0, lineSpacing);
    } else if (style.isLuckyDraw) {
      // 2 stacked lines for You've Entered the Lucky Draw!
      const line1 = "You've Entered";
      const line2 = 'Lucky Draw!';

      let fontSize = isMobile ? 13 : 15.5;
      this.ctx.font = `800 ${fontSize}px var(--font-heading, 'Outfit', 'Inter', -apple-system, sans-serif)`;

      let mw1 = this.ctx.measureText(line1);
      let mw2 = this.ctx.measureText(line2);

      while ((mw1.width > availableWidth || mw2.width > availableWidth) && fontSize > 9) {
        fontSize -= 0.5;
        this.ctx.font = `800 ${fontSize}px var(--font-heading, 'Outfit', 'Inter', -apple-system, sans-serif)`;
        mw1 = this.ctx.measureText(line1);
        mw2 = this.ctx.measureText(line2);
      }

      const lineSpacing = fontSize * 0.74;
      this.ctx.fillStyle = '#FEF08A';
      this.ctx.fillText(line1, 0, -lineSpacing);
      this.ctx.fillText(line2, 0, lineSpacing);
    } else if (displayLabel.includes('Voucher')) {
      // 2 stacked lines for Rs. 1,000 / Rs. 500 Gift Voucher
      const is1000 = displayLabel.includes('1,000') || displayLabel.includes('1000');
      const line1 = is1000 ? 'Rs. 1,000' : 'Rs. 500';
      const line2 = 'Gift Voucher';

      let fontSize = isMobile ? 13.5 : 16.5;
      this.ctx.font = `800 ${fontSize}px var(--font-heading, 'Outfit', 'Inter', -apple-system, sans-serif)`;

      let mw1 = this.ctx.measureText(line1);
      let mw2 = this.ctx.measureText(line2);

      while ((mw1.width > availableWidth || mw2.width > availableWidth) && fontSize > 9) {
        fontSize -= 0.5;
        this.ctx.font = `800 ${fontSize}px var(--font-heading, 'Outfit', 'Inter', -apple-system, sans-serif)`;
        mw1 = this.ctx.measureText(line1);
        mw2 = this.ctx.measureText(line2);
      }

      const lineSpacing = fontSize * 0.74;
      this.ctx.fillStyle = slot.textColor || '#FFFFFF';
      this.ctx.fillText(line1, 0, -lineSpacing);
      this.ctx.fillText(line2, 0, lineSpacing);
    } else {
      // General prize formatting fallback
      let fontSize = isMobile ? 13.5 : 16.5;
      this.ctx.font = `800 ${fontSize}px var(--font-heading, 'Outfit', 'Inter', -apple-system, sans-serif)`;
      let textMetrics = this.ctx.measureText(displayLabel);
      while (textMetrics.width > availableWidth && fontSize > 9) {
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
