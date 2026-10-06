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
  private highlightIndex = -1;

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
    document.fonts?.ready.then(() => this.draw()).catch(() => undefined);

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
    const dpr = Math.min(2.5, Math.max(1, window.devicePixelRatio || 1));
    const size = Math.max(280, Math.round(Math.min(rect.width, rect.height) || 600));

    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
  }


  private slotKind(slot: PublicSlotConfig): 'lucky' | 'voucher1000' | 'voucher500' | 'miss' {
    const label = slot.label.toLowerCase();
    if (slot.isLuckyDraw || slot.prizeKey?.startsWith('lucky_draw') || label.includes('lucky draw')) {
      return 'lucky';
    }
    if (label.includes('1,000') || label.includes('1000') || slot.prizeKey?.includes('1000')) {
      return 'voucher1000';
    }
    if (label.includes('500') || slot.prizeKey?.includes('500')) {
      return 'voucher500';
    }
    return 'miss';
  }

  private cabinStyle(index: number): { border: string; fill: string; ink: string } {
    const cabins = [
      { border: '#F5B400', fill: '#FFF8E1', ink: '#B45309' },
      { border: '#22C55E', fill: '#F0FDF4', ink: '#166534' },
      { border: '#EC4899', fill: '#FDF2F8', ink: '#9D174D' },
      { border: '#8B5CF6', fill: '#F5F3FF', ink: '#5B21B6' },
      { border: '#06B6D4', fill: '#ECFEFF', ink: '#0E7490' },
      { border: '#F97316', fill: '#FFF7ED', ink: '#C2410C' },
      { border: '#3B82F6', fill: '#EFF6FF', ink: '#1D4ED8' },
      { border: '#E11D48', fill: '#FFF1F2', ink: '#9F1239' },
      { border: '#EAB308', fill: '#FEFCE8', ink: '#A16207' },
      { border: '#14B8A6', fill: '#F0FDFA', ink: '#0F766E' },
      { border: '#A855F7', fill: '#FAF5FF', ink: '#7E22CE' },
      { border: '#0EA5E9', fill: '#F0F9FF', ink: '#0369A1' },
    ];
    return cabins[index % cabins.length]!;
  }

  /** Fixed green A-frame. Stays still while the wheel turns. */
  private drawSupports(centerX: number, centerY: number, height: number, isMobile: boolean): void {
    const legW = isMobile ? 16 : 22;
    const bottom = height - 10;
    const spread = Math.min(centerX, centerY) * 0.72;
    const topY = centerY + (isMobile ? 8 : 12);

    const grad = this.ctx.createLinearGradient(centerX, centerY, centerX, bottom);
    grad.addColorStop(0, '#9BE85A');
    grad.addColorStop(0.45, '#4ADE80');
    grad.addColorStop(1, '#2F9E44');

    this.ctx.save();
    this.ctx.lineCap = 'round';
    this.ctx.lineWidth = legW;
    this.ctx.strokeStyle = grad;

    this.ctx.beginPath();
    this.ctx.moveTo(centerX - 2, topY);
    this.ctx.lineTo(centerX - spread, bottom);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(centerX + 2, topY);
    this.ctx.lineTo(centerX + spread, bottom);
    this.ctx.stroke();

    this.ctx.lineWidth = Math.max(3, legW * 0.22);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - 8, topY + 6);
    this.ctx.lineTo(centerX - spread + 8, bottom - 8);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(centerX + 8, topY + 6);
    this.ctx.lineTo(centerX + spread - 8, bottom - 8);
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawMapPin(x: number, y: number, color: string, scale: number): void {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(scale, scale);
    this.ctx.beginPath();
    this.ctx.moveTo(0, 11);
    this.ctx.bezierCurveTo(-9, 3, -8, -8, 0, -8);
    this.ctx.bezierCurveTo(8, -8, 9, 3, 0, 11);
    this.ctx.fillStyle = color;
    this.ctx.fill();
    this.ctx.lineWidth = 1.4;
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.arc(0, -2.2, 2.5, 0, Math.PI * 2);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawCabinArt(kind: 'lucky' | 'voucher1000' | 'voucher500' | 'miss', size: number): void {
    if (kind === 'lucky') {
      this.roundRect(-size * 0.46, -size * 0.28, size * 0.92, size * 0.56, size * 0.08);
      this.ctx.fillStyle = '#FEF3C7';
      this.ctx.fill();
      this.ctx.lineWidth = Math.max(1.4, size * 0.045);
      this.ctx.strokeStyle = '#D97706';
      this.ctx.stroke();
      this.drawStar(0, 0, size * 0.08, size * 0.2, '#F59E0B');
      return;
    }

    if (kind === 'miss') {
      this.ctx.beginPath();
      this.ctx.moveTo(0, -size * 0.42);
      this.ctx.quadraticCurveTo(size * 0.18, -size * 0.12, 0, size * 0.02);
      this.ctx.quadraticCurveTo(-size * 0.18, -size * 0.12, 0, -size * 0.42);
      this.ctx.fillStyle = '#F97316';
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.moveTo(0, -size * 0.28);
      this.ctx.quadraticCurveTo(size * 0.08, -size * 0.1, 0, -size * 0.02);
      this.ctx.quadraticCurveTo(-size * 0.08, -size * 0.1, 0, -size * 0.28);
      this.ctx.fillStyle = '#FEF08A';
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.ellipse(0, size * 0.18, size * 0.3, size * 0.14, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = '#E07A3D';
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.ellipse(0, size * 0.14, size * 0.16, size * 0.06, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = '#FBBF24';
      this.ctx.fill();
      return;
    }

    const premium = kind === 'voucher1000';
    this.roundRect(-size * 0.46, -size * 0.3, size * 0.92, size * 0.6, size * 0.08);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fill();
    this.ctx.lineWidth = Math.max(1.4, size * 0.04);
    this.ctx.strokeStyle = premium ? '#D97706' : '#2563EB';
    this.ctx.stroke();
    this.ctx.save();
    this.roundRect(-size * 0.46, -size * 0.3, size * 0.92, size * 0.6, size * 0.08);
    this.ctx.clip();
    this.ctx.fillStyle = premium ? '#F59E0B' : '#2563EB';
    this.ctx.fillRect(-size * 0.46, -size * 0.3, size * 0.18, size * 0.6);
    this.ctx.restore();
  }

  private drawStar(x: number, y: number, inner: number, outer: number, color: string): void {
    this.ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    this.ctx.closePath();
    this.ctx.fillStyle = color;
    this.ctx.fill();
  }

  private drawGondola(
    slot: PublicSlotConfig,
    index: number,
    midAngle: number,
    orbit: number,
    isMobile: boolean
  ): void {
    const kind = this.slotKind(slot);
    const cabin = this.cabinStyle(index);
    const highlighted = index === this.highlightIndex;
    const gondolaW = Math.min(isMobile ? 52 : 68, Math.max(42, orbit * 0.2));
    const gondolaH = gondolaW * 0.92;

    this.ctx.save();
    this.ctx.rotate(midAngle);
    this.ctx.translate(orbit, 0);
    this.ctx.rotate(-(this.currentRotation + midAngle));
    if (highlighted) this.ctx.scale(1.08, 1.08);

    this.ctx.save();
    this.roundRect(-gondolaW / 2, -gondolaH / 2, gondolaW, gondolaH, isMobile ? 10 : 14);
    this.ctx.fillStyle = cabin.fill;
    this.ctx.shadowColor = highlighted ? cabin.border : 'rgba(15, 40, 80, 0.16)';
    this.ctx.shadowBlur = highlighted ? 18 : 10;
    this.ctx.shadowOffsetY = 4;
    this.ctx.fill();
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetY = 0;
    this.ctx.lineWidth = highlighted ? 4 : 3;
    this.ctx.strokeStyle = cabin.border;
    this.ctx.stroke();
    this.ctx.restore();

    this.ctx.save();
    this.ctx.translate(0, -gondolaH * 0.16);
    this.drawCabinArt(kind, gondolaW * 0.38);
    this.ctx.restore();

    const lines =
      kind === 'lucky'
        ? ['Lucky', 'Draw']
        : kind === 'voucher1000'
          ? ['Rs. 1,000', '']
          : kind === 'voucher500'
            ? ['Rs. 500', '']
            : ['Better', 'Luck'];

    let fontSize = Math.max(8, gondolaW * 0.16);
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = cabin.ink;
    const fontFamily = "'Outfit', 'Plus Jakarta Sans', sans-serif";
    this.ctx.font = `800 ${fontSize}px ${fontFamily}`;
    const maxWidth = gondolaW * 0.88;
    while (
      (this.ctx.measureText(lines[0]!).width > maxWidth || this.ctx.measureText(lines[1]!).width > maxWidth) &&
      fontSize > 7
    ) {
      fontSize -= 0.5;
      this.ctx.font = `800 ${fontSize}px ${fontFamily}`;
    }
    const lineGap = fontSize * 0.62;
    if (!lines[1]) {
      this.ctx.fillText(lines[0]!, 0, gondolaH * 0.24);
    } else {
      this.ctx.fillText(lines[0]!, 0, gondolaH * 0.24 - lineGap);
      this.ctx.fillText(lines[1]!, 0, gondolaH * 0.24 + lineGap);
    }

    this.ctx.restore();
  }

  /**
   * Ferris-wheel rendering: fixed green supports, blue spokes, upright prize cabins.
   */
  public draw(): void {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;
    const centerX = width / 2;
    const centerY = height / 2;
    const isMobile = width < 460;

    this.ctx.clearRect(0, 0, width, height);
    if (this.slots.length === 0) return;

    const sliceAngles = this.computeSliceAngles();
    const margin = isMobile ? 30 : 46;
    const orbit = Math.min(centerX, centerY) - margin - (isMobile ? 22 : 24);

    this.drawSupports(centerX, centerY, height, isMobile);

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(this.currentRotation);

    // Draw spokes from center (0,0) to orbit - connects directly with spin button
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = 'rgba(47, 127, 234, 0.85)';
    this.ctx.lineWidth = isMobile ? 1.1 : 1.35;

    const spokeCount = 12;
    for (let s = 0; s < spokeCount; s++) {
      const angle = (s / spokeCount) * Math.PI * 2;
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0); // Start from center to connect with spin button
      this.ctx.lineTo(Math.cos(angle) * orbit, Math.sin(angle) * orbit);
      this.ctx.stroke();
    }

    this.ctx.beginPath();
    this.ctx.arc(0, 0, orbit, 0, Math.PI * 2);
    this.ctx.lineWidth = isMobile ? 2 : 2.5;
    this.ctx.strokeStyle = '#2B74DC';
    this.ctx.stroke();

    for (let i = 0; i < this.slots.length; i++) {
      const slice = sliceAngles[i]!;
      const midAngle = slice.start + slice.angle / 2;
      this.drawGondola(this.slots[i]!, i, midAngle, orbit, isMobile);
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
   * Deceleration curve. A higher power coasts longer, then brakes harder.
   */
  private easeOutSuspense(t: number, power: number): number {
    return 1 - Math.pow(1 - t, power);
  }

  /** Uniform value in [0, 1) from the browser CSPRNG. */
  private randomUnit(): number {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0]! / 0x100000000;
  }

  /** Inclusive integer range. */
  private randomInt(min: number, max: number): number {
    return min + Math.floor(this.randomUnit() * (max - min + 1));
  }

  /**
   * Animates the wheel from current position to land accurately on target slot index.
   * Turn count, duration, and the stop point inside the winning cabin are randomized.
   */
  public spinTo(targetSlotIndex: number): Promise<void> {
    if (this.isSpinning) {
      return Promise.reject(new Error('Wheel is already spinning'));
    }

    this.isSpinning = true;
    this.highlightIndex = -1;
    this.onSpinStart?.();

    return new Promise((resolve) => {
      const sliceAngles = this.computeSliceAngles();

      // Pointer is stationary at top: -PI/2 radians (270 degrees)
      const pointerAngle = -Math.PI / 2;

      // Center angle of target slot inside unrotated wheel:
      const targetSlice = sliceAngles[targetSlotIndex]!;
      const targetCenterAngle = targetSlice.start + targetSlice.angle / 2;

      // Stop near either edge of the winning cabin, not on a repeated center line.
      const jitter = (this.randomUnit() - 0.5) * targetSlice.angle * 0.86;

      // Calculate angle difference
      const currentNorm = this.currentRotation % (2 * Math.PI);
      let angleDiff = (pointerAngle - (targetCenterAngle + jitter) - currentNorm) % (2 * Math.PI);
      if (angleDiff < 0) {
        angleDiff += 2 * Math.PI;
      }

      // Randomizer: 5–14 turns, either direction, and a different brake each spin.
      const turns = this.randomInt(5, 14);
      const direction = this.randomUnit() < 0.5 ? 1 : -1;
      const easePower = 2.8 + this.randomUnit() * 4.2;
      const fullRotations = direction * turns * (2 * Math.PI);
      const startRotation = this.currentRotation;
      const finalRotation = this.currentRotation + fullRotations + angleDiff;

      const durationMs = 3800 + turns * 420 + Math.floor(this.randomUnit() * 2200);
      const startTime = performance.now();

      const pointerEl = document.getElementById('wheel-pointer');

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        const easedProgress = this.easeOutSuspense(progress, easePower);

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
          this.highlightIndex = targetSlotIndex;
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
