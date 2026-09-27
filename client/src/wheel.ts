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
   * Main rendering method for the wheel circle.
   */
  public draw(): void {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 14;

    this.ctx.clearRect(0, 0, width, height);

    if (this.slots.length === 0) return;

    const sliceAngles = this.computeSliceAngles();

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(this.currentRotation);

    // 1. Draw Each Slot Slice Wedge & Content
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i]!;
      const { start: startAngle, end: endAngle, angle: sliceAngle } = sliceAngles[i]!;

      // Slice Background Wedge
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.arc(0, 0, radius, startAngle, endAngle);
      this.ctx.closePath();

      // Radial Gradient per Slice strictly in Red and Blue theme
      const isRed = i % 2 === 0;
      const grad = this.ctx.createRadialGradient(0, 0, 20, 0, 0, radius);

      if (isRed) {
        // Radiant Crimson Red Slice
        grad.addColorStop(0, '#EF4444');
        grad.addColorStop(0.4, '#DC2626');
        grad.addColorStop(0.75, '#991B1B');
        grad.addColorStop(1, '#500724');
      } else {
        // Electric Royal Blue Slice
        grad.addColorStop(0, '#60A5FA');
        grad.addColorStop(0.4, '#2563EB');
        grad.addColorStop(0.75, '#1E3A8A');
        grad.addColorStop(1, '#0F172A');
      }
      this.ctx.fillStyle = grad;
      this.ctx.fill();

      // Slice Outer Border / Golden Separator Line
      this.ctx.lineWidth = 2.5;
      this.ctx.strokeStyle = slot.isGrandPrize
        ? 'rgba(254, 240, 138, 0.9)'
        : 'rgba(255, 255, 255, 0.28)';
      this.ctx.stroke();

      // Draw Inner Concentric Highlight Ring
      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius * 0.96, startAngle, endAngle);
      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      this.ctx.stroke();

      // 2. Draw Slice Content (Image Icon + Label)
      this.ctx.save();
      const midAngle = startAngle + sliceAngle / 2;
      this.ctx.rotate(midAngle);

      const isMobile = width < 460;
      const iconDist = radius * (isMobile ? 0.46 : 0.48);
      const textDist = radius * (isMobile ? 0.82 : 0.80);

      // Available width at icon distance based on the slice gap/angle
      const availableWidthAtIcon = 2 * iconDist * Math.tan(sliceAngle / 2);

      // A) Draw Image Asset if available
      if (slot.image && this.imageCache.has(slot.image)) {
        const img = this.imageCache.get(slot.image);
        if (img && img.complete && img.naturalWidth > 0) {
          this.ctx.save();
          this.ctx.translate(iconDist, 0);

          const isNote = slot.image.includes('note') || slot.image.includes('rs') || slot.label.toLowerCase().includes('balance');
          const isGadget =
            slot.image.includes('mobile') ||
            slot.image.includes('phone') ||
            slot.image.includes('earpod') ||
            slot.image.includes('powerbank') ||
            slot.image.includes('charger');

          if (isGadget) {
            // Flagship Mobile Phone, Earpods, Powerbank & Tech Gadgets
            this.ctx.rotate(Math.PI / 2);
            const baseBadgeRadius = isMobile ? 18 : 22;
            const maxAllowedRadius = (availableWidthAtIcon * 0.76) / 2;
            const badgeRadius = Math.max(9, Math.min(baseBadgeRadius, maxAllowedRadius));

            // Draw glowing backdrop disc
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(0, 0, badgeRadius, 0, 2 * Math.PI);
            this.ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            this.ctx.shadowColor = slot.isGrandPrize ? 'rgba(245, 158, 11, 0.9)' : 'rgba(0, 0, 0, 0.7)';
            this.ctx.shadowBlur = slot.isGrandPrize ? Math.max(4, badgeRadius * 0.5) : 6;
            this.ctx.fill();

            // Clip and draw image cleanly inside circular badge
            this.ctx.beginPath();
            this.ctx.arc(0, 0, Math.max(1, badgeRadius - 1), 0, 2 * Math.PI);
            this.ctx.clip();
            const iconSize = badgeRadius * 2.1;
            this.ctx.drawImage(img, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
            this.ctx.restore();

            // Gold / Accent rim
            this.ctx.beginPath();
            this.ctx.arc(0, 0, badgeRadius, 0, 2 * Math.PI);
            this.ctx.lineWidth = slot.isGrandPrize ? Math.max(1.5, badgeRadius * 0.12) : 1.5;
            this.ctx.strokeStyle = slot.isGrandPrize ? '#FDE047' : 'rgba(255, 255, 255, 0.45)';
            this.ctx.stroke();
          } else if (isNote) {
            // Nepalese Banknote: Proportional to gap width
            this.ctx.rotate(-Math.PI / 2);
            const baseNoteW = isMobile ? 36 : 44;
            const maxNoteW = Math.max(18, Math.min(baseNoteW, availableWidthAtIcon * 0.78));
            const noteW = maxNoteW;
            const noteH = noteW * 0.56;

            // Draw soft shadow & card border
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
            this.ctx.shadowBlur = 5;
            this.ctx.shadowOffsetY = 2;

            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            this.roundRect(-noteW / 2 - 1.5, -noteH / 2 - 1.5, noteW + 3, noteH + 3, 3);
            this.ctx.fill();

            // Clip to rounded rectangle
            this.ctx.save();
            this.ctx.beginPath();
            this.roundRect(-noteW / 2, -noteH / 2, noteW, noteH, 2.5);
            this.ctx.clip();
            this.ctx.drawImage(img, -noteW / 2, -noteH / 2, noteW, noteH);
            this.ctx.restore();

            // Gold border
            this.ctx.beginPath();
            this.roundRect(-noteW / 2, -noteH / 2, noteW, noteH, 2.5);
            this.ctx.lineWidth = 1.2;
            this.ctx.strokeStyle = '#FDE047';
            this.ctx.stroke();
          } else {
            // Graphic icon: Proportional to gap
            this.ctx.rotate(Math.PI / 2);
            const baseSize = isMobile ? 32 : 38;
            const kiteSize = Math.max(16, Math.min(baseSize, availableWidthAtIcon * 0.75));

            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            this.ctx.shadowBlur = 6;
            this.ctx.shadowOffsetY = 2;

            this.ctx.drawImage(
              img,
              -kiteSize / 2,
              -kiteSize / 2,
              kiteSize,
              kiteSize
            );
          }

          this.ctx.restore();
        }
      } else if (!slot.isWin) {
        // Better Luck Stylized Vector Reload Arrow Icon sized to gap
        this.ctx.save();
        this.ctx.translate(iconDist, 0);
        this.ctx.rotate(Math.PI / 2);

        const baseIconR = isMobile ? 10 : 12;
        const iconR = Math.max(6, Math.min(baseIconR, (availableWidthAtIcon * 0.42) / 2));

        this.ctx.beginPath();
        this.ctx.arc(0, 0, iconR, -Math.PI * 0.7, Math.PI * 0.9);
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = isMobile ? 2.0 : 2.5;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();

        // Arrow head on reload circle
        const arrowHeadX = Math.cos(Math.PI * 0.9) * iconR;
        const arrowHeadY = Math.sin(Math.PI * 0.9) * iconR;
        const headSize = Math.max(2.5, iconR * 0.35);
        this.ctx.beginPath();
        this.ctx.moveTo(arrowHeadX - headSize, arrowHeadY - headSize);
        this.ctx.lineTo(arrowHeadX, arrowHeadY);
        this.ctx.lineTo(arrowHeadX + headSize + 1, arrowHeadY - 1);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fill();
        this.ctx.restore();
      }

      // B) Draw Slot Text Label
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      const availableTextWidth = 2 * textDist * Math.tan(sliceAngle / 2) * 0.88;
      let displayLabel = slot.label;
      if (slot.isGrandPrize) {
        if (sliceAngle >= 0.35 && !displayLabel.includes('⭐')) {
          displayLabel = `⭐ ${slot.label}`;
        }
      }

      let fontSize = slot.isGrandPrize
        ? (isMobile ? 11 : 13)
        : (isMobile ? 10 : 12);

      this.ctx.font = slot.isGrandPrize
        ? `900 ${fontSize}px var(--font-heading, 'Outfit', sans-serif)`
        : `700 ${fontSize}px var(--font-heading, 'Outfit', sans-serif)`;

      // Dynamically shrink font size if text exceeds available slice width
      let textMetrics = this.ctx.measureText(displayLabel);
      while (textMetrics.width > availableTextWidth && fontSize > 6.5) {
        fontSize -= 0.5;
        this.ctx.font = slot.isGrandPrize
          ? `900 ${fontSize}px var(--font-heading, 'Outfit', sans-serif)`
          : `700 ${fontSize}px var(--font-heading, 'Outfit', sans-serif)`;
        textMetrics = this.ctx.measureText(displayLabel);
      }

      this.ctx.fillStyle = slot.textColor || '#FFFFFF';

      // Text Shadow for Readability
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      this.ctx.shadowBlur = 5;
      this.ctx.shadowOffsetX = 1;
      this.ctx.shadowOffsetY = 1;

      // Draw label rotated outward with maxWidth safety
      this.ctx.save();
      this.ctx.translate(textDist, 0);
      this.ctx.rotate(Math.PI / 2);
      this.ctx.fillText(displayLabel, 0, 0, Math.max(30, availableTextWidth));
      this.ctx.restore();

      this.ctx.restore();

      this.ctx.restore();
    }

    // 3. Draw Outer Decorative Ring with Metallic Gold Rim
    this.ctx.restore(); // Undo rotation for stationary border elements

    this.ctx.save();
    this.ctx.translate(centerX, centerY);

    // Outer Casino Ring Base
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius + 2, 0, 2 * Math.PI);
    this.ctx.lineWidth = 16;
    const rimGrad = this.ctx.createLinearGradient(-radius, -radius, radius, radius);
    rimGrad.addColorStop(0, '#FEF08A');
    rimGrad.addColorStop(0.25, '#F59E0B');
    rimGrad.addColorStop(0.5, '#78350F');
    rimGrad.addColorStop(0.75, '#FBBF24');
    rimGrad.addColorStop(1, '#FEF08A');
    this.ctx.strokeStyle = rimGrad;
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = 12;
    this.ctx.stroke();

    // Inner Gold Bevel Line
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius - 6, 0, 2 * Math.PI);
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeStyle = 'rgba(254, 240, 138, 0.8)';
    this.ctx.shadowBlur = 0;
    this.ctx.stroke();

    // 4. Draw Edge Pins (Ticking Pegs) on the Rim (rotating with the wheel)
    this.ctx.rotate(this.currentRotation);
    for (let i = 0; i < this.slots.length; i++) {
      const pinAngle = sliceAngles[i]!.start;
      const pinX = Math.cos(pinAngle) * (radius + 2);
      const pinY = Math.sin(pinAngle) * (radius + 2);

      // Pin Shadow & Outer Chrome/Gold Rim
      this.ctx.beginPath();
      this.ctx.arc(pinX, pinY, 5.5, 0, 2 * Math.PI);
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      this.ctx.shadowBlur = 4;
      this.ctx.fill();

      // Pin Core Gem
      this.ctx.beginPath();
      this.ctx.arc(pinX, pinY, 3.5, 0, 2 * Math.PI);
      this.ctx.fillStyle = '#F59E0B';
      this.ctx.shadowBlur = 0;
      this.ctx.fill();

      // Pin Light Glint
      this.ctx.beginPath();
      this.ctx.arc(pinX - 1, pinY - 1, 1.2, 0, 2 * Math.PI);
      this.ctx.fillStyle = '#FFFBEB';
      this.ctx.fill();
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

  private darkenHex(hex: string, amount: number): string {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    const num = parseInt(clean, 16);
    let r = Math.max(0, Math.floor(((num >> 16) & 255) * (1 - amount)));
    let g = Math.max(0, Math.floor(((num >> 8) & 255) * (1 - amount)));
    let b = Math.max(0, Math.floor((num & 255) * (1 - amount)));
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Smooth quintic deceleration easing function.
   */
  private easeOutQuint(t: number): number {
    return 1 - Math.pow(1 - t, 5);
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

      // Center angle of target slot inside unrotated wheel (using proportional angles):
      const targetSlice = sliceAngles[targetSlotIndex]!;
      const targetCenterAngle = targetSlice.start + targetSlice.angle / 2;

      // Slight natural jitter inside slot slice ([-20%, +20%] of slice width)
      const jitter = (Math.random() - 0.5) * targetSlice.angle * 0.4;

      // We want: (targetRotation + targetCenterAngle + jitter) % (2 * PI) = pointerAngle
      const currentNorm = this.currentRotation % (2 * Math.PI);
      let angleDiff = (pointerAngle - (targetCenterAngle + jitter) - currentNorm) % (2 * Math.PI);
      if (angleDiff < 0) {
        angleDiff += 2 * Math.PI;
      }

      // 6 full 360-degree rotations
      const fullRotations = 6 * (2 * Math.PI);
      const startRotation = this.currentRotation;
      const finalRotation = this.currentRotation + fullRotations + angleDiff;

      const durationMs = 5400; // 5.4 seconds
      const startTime = performance.now();

      const pointerEl = document.getElementById('wheel-pointer');

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        const easedProgress = this.easeOutQuint(progress);

        this.currentRotation = startRotation + (finalRotation - startRotation) * easedProgress;

        // Check if pointer crossed a pin (using proportional slice boundaries)
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
            setTimeout(() => pointerEl.classList.remove('ticking'), 60);
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
