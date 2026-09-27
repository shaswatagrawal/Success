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

      // Realistic 3D Radial Gradient per Slice in deep rich jewel tones
      const isMysteryBox = slot.prizeKey === 'prize_mystery_box' || slot.label.toLowerCase().includes('mystery');
      const isRed = i % 2 === 0;
      const grad = this.ctx.createRadialGradient(0, 0, 15, 0, 0, radius);

      if (isMysteryBox) {
        // Mysterious Royal Violet & Purple Gradient with gold highlights
        grad.addColorStop(0, '#C084FC');
        grad.addColorStop(0.35, '#7C3AED');
        grad.addColorStop(0.70, '#581C87');
        grad.addColorStop(0.92, '#3B0764');
        grad.addColorStop(1, '#1A0033');
      } else if (isRed) {
        // Deep Crimson Red Jewel Tone with outer rim vignette
        grad.addColorStop(0, '#FF4D4D');
        grad.addColorStop(0.35, '#DC2626');
        grad.addColorStop(0.70, '#991B1B');
        grad.addColorStop(0.92, '#450A0A');
        grad.addColorStop(1, '#1A0207');
      } else {
        // Royal Sapphire Blue Jewel Tone with outer rim vignette
        grad.addColorStop(0, '#60A5FA');
        grad.addColorStop(0.35, '#2563EB');
        grad.addColorStop(0.70, '#1E3A8A');
        grad.addColorStop(0.92, '#0F172A');
        grad.addColorStop(1, '#050B14');
      }
      this.ctx.fillStyle = grad;
      this.ctx.fill();

      // 3D Extruded Metal Divider Rib / Separator Line
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(Math.cos(startAngle) * radius, Math.sin(startAngle) * radius);
      this.ctx.lineWidth = slot.isGrandPrize || isMysteryBox ? 3.5 : 2.5;
      this.ctx.strokeStyle = slot.isGrandPrize || isMysteryBox
        ? '#FDE047'
        : 'rgba(254, 240, 138, 0.75)';
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      this.ctx.shadowBlur = 3;
      this.ctx.stroke();
      this.ctx.shadowBlur = 0; // Reset shadow

      // Inner Concentric Accent Track
      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius * 0.95, startAngle, endAngle);
      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      this.ctx.stroke();

      // 2. Draw Slice Content (Image Icon + Label)
      this.ctx.save();
      const midAngle = startAngle + sliceAngle / 2;
      this.ctx.rotate(midAngle);

      const isMobile = width < 460;
      // Position swapped: Pictures at outer portion (wider wedge), Text at inner-mid portion clear of center hub
      const iconDist = radius * (isMobile ? 0.73 : 0.75);
      const textDist = radius * (isMobile ? 0.46 : 0.48);

      // Available width at icon distance based on the slice gap/angle
      const availableWidthAtIcon = 2 * iconDist * Math.tan(sliceAngle / 2);

      // A) Draw Image Asset or 3D Vector Icon if available
      if (isMysteryBox) {
        // Draw 3D Glowing Mystery Gift Box Badge
        this.ctx.save();
        this.ctx.translate(iconDist, 0);
        this.ctx.rotate(Math.PI / 2);

        const baseBadgeRadius = isMobile ? 26 : 38;
        const maxAllowedRadius = (availableWidthAtIcon * 0.94) / 2;
        const badgeRadius = Math.max(16, Math.min(baseBadgeRadius, maxAllowedRadius));

        // Glowing Purple/Gold backdrop disc
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(0, 0, badgeRadius, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'rgba(88, 28, 135, 0.95)';
        this.ctx.shadowColor = 'rgba(253, 224, 71, 0.95)';
        this.ctx.shadowBlur = Math.max(10, badgeRadius * 0.65);
        this.ctx.shadowOffsetY = 2;
        this.ctx.fill();

        const mysteryImg = slot.image ? this.imageCache.get(slot.image) : null;
        if (mysteryImg && mysteryImg.complete && mysteryImg.naturalWidth > 0) {
          this.ctx.beginPath();
          this.ctx.arc(0, 0, Math.max(1, badgeRadius - 1), 0, 2 * Math.PI);
          this.ctx.clip();
          const iconSize = badgeRadius * 2.2;
          this.ctx.drawImage(mysteryImg, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
        } else {
          // Render crisp 3D Golden Mystery Gift Box icon with '?'
          const boxSize = badgeRadius * 1.15;
          // Box base
          this.ctx.fillStyle = '#D97706';
          this.roundRect(-boxSize * 0.44, -boxSize * 0.25, boxSize * 0.88, boxSize * 0.72, 3);
          this.ctx.fill();
          // Box lid
          this.ctx.fillStyle = '#FBBF24';
          this.roundRect(-boxSize * 0.52, -boxSize * 0.44, boxSize * 1.04, boxSize * 0.24, 3);
          this.ctx.fill();
          // Golden Ribbon
          this.ctx.fillStyle = '#FEF08A';
          this.ctx.fillRect(-boxSize * 0.1, -boxSize * 0.44, boxSize * 0.2, boxSize * 0.9);
          // Big bold '?' mark
          this.ctx.font = `900 ${badgeRadius * 0.95}px var(--font-heading, 'Outfit', 'Inter', sans-serif)`;
          this.ctx.fillStyle = '#FFFFFF';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
          this.ctx.shadowBlur = 4;
          this.ctx.fillText('?', 0, boxSize * 0.08);
        }
        this.ctx.restore();

        // 3D Polished Gold Rim
        this.ctx.beginPath();
        this.ctx.arc(0, 0, badgeRadius, 0, 2 * Math.PI);
        this.ctx.lineWidth = Math.max(2.2, badgeRadius * 0.14);
        this.ctx.strokeStyle = '#FDE047';
        this.ctx.stroke();

        this.ctx.restore();
      } else if (slot.image && this.imageCache.has(slot.image)) {
        const isTelecom =
          slot.image.includes('ncell') ||
          slot.image.includes('ntc') ||
          slot.image.includes('topup') ||
          slot.label.toLowerCase().includes('topup') ||
          slot.label.toLowerCase().includes('balance');

        this.ctx.save();
        this.ctx.translate(iconDist, 0);

        if (isTelecom) {
          // Both NTC (Nepal Telecom) and Ncell logos side-by-side in dual glowing circular badges
          this.ctx.rotate(Math.PI / 2);
          const dualBadgeRadius = isMobile ? 18 : 24;
          const separation = dualBadgeRadius * 1.05;

          const ntcImg = this.imageCache.get('/assets/ntc_logo.png') || this.imageCache.get(slot.image);
          const ncellImg = this.imageCache.get('/assets/ncell_logo.png');

          // --- 1. Left Badge: NTC (Namaste) ---
          this.ctx.save();
          this.ctx.translate(-separation, 0);

          // NTC Blue background disc
          this.ctx.beginPath();
          this.ctx.arc(0, 0, dualBadgeRadius, 0, 2 * Math.PI);
          this.ctx.fillStyle = '#044C8C';
          this.ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
          this.ctx.shadowBlur = 6;
          this.ctx.shadowOffsetY = 2;
          this.ctx.fill();

          if (ntcImg && ntcImg.complete && ntcImg.naturalWidth > 0) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(0, 0, Math.max(1, dualBadgeRadius - 1), 0, 2 * Math.PI);
            this.ctx.clip();
            const iconSize = dualBadgeRadius * 1.95;
            this.ctx.drawImage(ntcImg, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
            this.ctx.restore();
          }

          // NTC Gold Rim
          this.ctx.beginPath();
          this.ctx.arc(0, 0, dualBadgeRadius, 0, 2 * Math.PI);
          this.ctx.lineWidth = Math.max(1.8, dualBadgeRadius * 0.12);
          this.ctx.strokeStyle = '#FDE047';
          this.ctx.stroke();
          this.ctx.restore();

          // --- 2. Right Badge: Ncell ---
          this.ctx.save();
          this.ctx.translate(separation, 0);

          // Ncell White background disc
          this.ctx.beginPath();
          this.ctx.arc(0, 0, dualBadgeRadius, 0, 2 * Math.PI);
          this.ctx.fillStyle = '#FFFFFF';
          this.ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
          this.ctx.shadowBlur = 6;
          this.ctx.shadowOffsetY = 2;
          this.ctx.fill();

          if (ncellImg && ncellImg.complete && ncellImg.naturalWidth > 0) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(0, 0, Math.max(1, dualBadgeRadius - 1), 0, 2 * Math.PI);
            this.ctx.clip();
            const iconSize = dualBadgeRadius * 1.9;
            this.ctx.drawImage(ncellImg, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
            this.ctx.restore();
          }

          // Ncell Gold Rim
          this.ctx.beginPath();
          this.ctx.arc(0, 0, dualBadgeRadius, 0, 2 * Math.PI);
          this.ctx.lineWidth = Math.max(1.8, dualBadgeRadius * 0.12);
          this.ctx.strokeStyle = '#FDE047';
          this.ctx.stroke();
          this.ctx.restore();
        } else {
          const img = this.imageCache.get(slot.image);
          if (img && img.complete && img.naturalWidth > 0) {
            const isNote = (slot.image.includes('note') || slot.image.includes('rs'));
            const isGadget =
              slot.image.includes('mobile') ||
              slot.image.includes('phone') ||
              slot.image.includes('earpod') ||
              slot.image.includes('powerbank') ||
              slot.image.includes('charger');

            if (isGadget) {
              // Flagship Mobile Phone, Earpods, Powerbank
              this.ctx.rotate(Math.PI / 2);
              const baseBadgeRadius = isMobile ? 26 : 38;
              const maxAllowedRadius = (availableWidthAtIcon * 0.94) / 2;
              const badgeRadius = Math.max(16, Math.min(baseBadgeRadius, maxAllowedRadius));

              // Draw glowing backdrop disc with 3D shadow
              this.ctx.save();
              this.ctx.beginPath();
              this.ctx.arc(0, 0, badgeRadius, 0, 2 * Math.PI);
              this.ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
              this.ctx.shadowColor = slot.isGrandPrize
                ? 'rgba(245, 158, 11, 0.95)'
                : 'rgba(0, 0, 0, 0.85)';
              this.ctx.shadowBlur = slot.isGrandPrize ? Math.max(10, badgeRadius * 0.65) : 8;
              this.ctx.shadowOffsetY = 2;
              this.ctx.fill();

              // Clip and draw image cleanly inside circular badge
              this.ctx.beginPath();
              this.ctx.arc(0, 0, Math.max(1, badgeRadius - 1), 0, 2 * Math.PI);
              this.ctx.clip();
              const iconSize = badgeRadius * 2.2;
              this.ctx.drawImage(img, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
              this.ctx.restore();

              // 3D Metallic Gold Rim
              this.ctx.beginPath();
              this.ctx.arc(0, 0, badgeRadius, 0, 2 * Math.PI);
              this.ctx.lineWidth = slot.isGrandPrize ? Math.max(2.4, badgeRadius * 0.15) : 2;
              this.ctx.strokeStyle = slot.isGrandPrize ? '#FDE047' : 'rgba(254, 240, 138, 0.9)';
              this.ctx.stroke();
            } else if (isNote) {
              // Banknote
              this.ctx.rotate(-Math.PI / 2);
              const baseNoteW = isMobile ? 54 : 76;
              const maxNoteW = Math.max(28, Math.min(baseNoteW, availableWidthAtIcon * 0.96));
              const noteW = maxNoteW;
              const noteH = noteW * 0.58;

              this.ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
              this.ctx.shadowBlur = 10;
              this.ctx.shadowOffsetY = 3;

              this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
              this.roundRect(-noteW / 2 - 2, -noteH / 2 - 2, noteW + 4, noteH + 4, 4);
              this.ctx.fill();

              this.ctx.save();
              this.ctx.beginPath();
              this.roundRect(-noteW / 2, -noteH / 2, noteW, noteH, 3.5);
              this.ctx.clip();
              this.ctx.drawImage(img, -noteW / 2, -noteH / 2, noteW, noteH);
              this.ctx.restore();

              this.ctx.beginPath();
              this.roundRect(-noteW / 2, -noteH / 2, noteW, noteH, 3.5);
              this.ctx.lineWidth = 2;
              this.ctx.strokeStyle = '#FDE047';
              this.ctx.stroke();
            } else {
              // Graphic icon
              this.ctx.rotate(Math.PI / 2);
              const baseSize = isMobile ? 48 : 68;
              const kiteSize = Math.max(24, Math.min(baseSize, availableWidthAtIcon * 0.92));

              this.ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
              this.ctx.shadowBlur = 8;
              this.ctx.shadowOffsetY = 3;

              this.ctx.drawImage(
                img,
                -kiteSize / 2,
                -kiteSize / 2,
                kiteSize,
                kiteSize
              );
            }
          }
        }

        this.ctx.restore();
      }

      // B) Draw Slot Text Label
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      const isBetterLuck = !slot.isWin || slot.label.toLowerCase().includes('better luck');

      if (isBetterLuck) {
        // Better Luck Next Time: Draw bold high-contrast 2-line text
        const textCenterDist = radius * (isMobile ? 0.58 : 0.60);
        const availableW = 2 * textCenterDist * Math.tan(sliceAngle / 2) * 0.96;

        let lineFontSize = isMobile ? 12 : 16;
        this.ctx.font = `900 ${lineFontSize}px var(--font-heading, 'Outfit', 'Inter', sans-serif)`;

        let m1 = this.ctx.measureText('Better Luck');
        let m2 = this.ctx.measureText('Next Time');
        while ((m1.width > availableW || m2.width > availableW) && lineFontSize > 9) {
          lineFontSize -= 0.5;
          this.ctx.font = `900 ${lineFontSize}px var(--font-heading, 'Outfit', 'Inter', sans-serif)`;
          m1 = this.ctx.measureText('Better Luck');
          m2 = this.ctx.measureText('Next Time');
        }

        this.ctx.save();
        this.ctx.translate(textCenterDist, 0);
        this.ctx.rotate(Math.PI / 2);

        const lineSpacing = lineFontSize * 0.76;

        // Dark outline pass for extreme contrast
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
        this.ctx.lineWidth = 4;
        this.ctx.lineJoin = 'round';
        this.ctx.strokeText('Better Luck', 0, -lineSpacing, availableW);
        this.ctx.strokeText('Next Time', 0, lineSpacing, availableW);

        // Bright fill pass with shadow
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        this.ctx.shadowBlur = 6;
        this.ctx.shadowOffsetX = 1.5;
        this.ctx.shadowOffsetY = 1.5;
        this.ctx.fillText('Better Luck', 0, -lineSpacing, availableW);
        this.ctx.fillText('Next Time', 0, lineSpacing, availableW);

        this.ctx.restore();
      } else {
        // Prize Slot Label: Prominent bold typography with dark outline at textDist
        const availableTextWidth = 2 * textDist * Math.tan(sliceAngle / 2) * 0.96;
        const displayLabel = slot.label;
        const words = displayLabel.split(' ');
        const shouldSplit = words.length >= 2;

        this.ctx.save();
        this.ctx.translate(textDist, 0);
        this.ctx.rotate(Math.PI / 2);

        if (shouldSplit) {
          // Render as 2 compact stacked lines with large bold font
          const line1 = words[0]!;
          const line2 = words.slice(1).join(' ');

          let lineSize = slot.isGrandPrize ? (isMobile ? 13 : 16.5) : (isMobile ? 12 : 15.5);
          this.ctx.font = `900 ${lineSize}px var(--font-heading, 'Outfit', 'Inter', sans-serif)`;

          let mw1 = this.ctx.measureText(line1);
          let mw2 = this.ctx.measureText(line2);
          while ((mw1.width > availableTextWidth || mw2.width > availableTextWidth) && lineSize > 9) {
            lineSize -= 0.5;
            this.ctx.font = `900 ${lineSize}px var(--font-heading, 'Outfit', 'Inter', sans-serif)`;
            mw1 = this.ctx.measureText(line1);
            mw2 = this.ctx.measureText(line2);
          }

          const lineSpacing = lineSize * 0.78;

          this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
          this.ctx.lineWidth = 4;
          this.ctx.lineJoin = 'round';
          this.ctx.strokeText(line1, 0, -lineSpacing, availableTextWidth);
          this.ctx.strokeText(line2, 0, lineSpacing, availableTextWidth);

          this.ctx.fillStyle = slot.isGrandPrize ? '#FEF08A' : (slot.textColor || '#FFFFFF');
          this.ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
          this.ctx.shadowBlur = 6;
          this.ctx.shadowOffsetX = 1.5;
          this.ctx.shadowOffsetY = 1.5;
          this.ctx.fillText(line1, 0, -lineSpacing, availableTextWidth);
          this.ctx.fillText(line2, 0, lineSpacing, availableTextWidth);
        } else {
          // Single-line label
          let fontSize = slot.isGrandPrize ? (isMobile ? 13 : 16.5) : (isMobile ? 12 : 15.5);
          this.ctx.font = `900 ${fontSize}px var(--font-heading, 'Outfit', 'Inter', sans-serif)`;

          let textMetrics = this.ctx.measureText(displayLabel);
          while (textMetrics.width > availableTextWidth && fontSize > 9) {
            fontSize -= 0.5;
            this.ctx.font = `900 ${fontSize}px var(--font-heading, 'Outfit', 'Inter', sans-serif)`;
            textMetrics = this.ctx.measureText(displayLabel);
          }

          this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
          this.ctx.lineWidth = 4;
          this.ctx.lineJoin = 'round';
          this.ctx.strokeText(displayLabel, 0, 0, Math.max(30, availableTextWidth));

          this.ctx.fillStyle = slot.isGrandPrize ? '#FEF08A' : (slot.textColor || '#FFFFFF');
          this.ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
          this.ctx.shadowBlur = 6;
          this.ctx.shadowOffsetX = 1.5;
          this.ctx.shadowOffsetY = 1.5;
          this.ctx.fillText(displayLabel, 0, 0, Math.max(30, availableTextWidth));
        }

        this.ctx.restore();
      }

      this.ctx.restore();
    }

    // 2.5 Draw Realistic Glass Specular Sheen / Acrylic Reflection over Wheel Face
    this.ctx.save();
    const glossGrad = this.ctx.createLinearGradient(-radius * 0.8, -radius * 0.8, radius * 0.4, radius * 0.4);
    glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
    glossGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.04)');
    glossGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0)');
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius - 2, 0, 2 * Math.PI);
    this.ctx.fillStyle = glossGrad;
    this.ctx.fill();

    // Inner Perimeter Recessed Drop Shadow (Dish Depth Effect)
    const insetShadow = this.ctx.createRadialGradient(0, 0, radius * 0.88, 0, 0, radius);
    insetShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
    insetShadow.addColorStop(0.7, 'rgba(0, 0, 0, 0.25)');
    insetShadow.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    this.ctx.fillStyle = insetShadow;
    this.ctx.fill();
    this.ctx.restore();

    // 3. Draw Heavy 3D Casino Golden Outer Rim
    this.ctx.restore(); // Undo rotation for stationary border elements

    this.ctx.save();
    this.ctx.translate(centerX, centerY);

    // Deep Dark Base Shadow under the rim
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius + 4, 0, 2 * Math.PI);
    this.ctx.lineWidth = 22;
    this.ctx.strokeStyle = '#1E1005';
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    this.ctx.shadowBlur = 18;
    this.ctx.shadowOffsetY = 6;
    this.ctx.stroke();

    // Main 3D Metallic Casino Gold Rim with Rich Light Highlights
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius + 2, 0, 2 * Math.PI);
    this.ctx.lineWidth = 18;
    const rimGrad = this.ctx.createLinearGradient(-radius, -radius, radius, radius);
    rimGrad.addColorStop(0, '#FFFBEB');
    rimGrad.addColorStop(0.20, '#FDE047');
    rimGrad.addColorStop(0.40, '#D97706');
    rimGrad.addColorStop(0.60, '#78350F');
    rimGrad.addColorStop(0.80, '#FBBF24');
    rimGrad.addColorStop(1, '#FFFBEB');
    this.ctx.strokeStyle = rimGrad;
    this.ctx.shadowBlur = 0;
    this.ctx.stroke();

    // Inner Fine Polished Brass Bevel Lines
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius - 7, 0, 2 * Math.PI);
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = 'rgba(254, 240, 138, 0.95)';
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius + 10, 0, 2 * Math.PI);
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeStyle = 'rgba(255, 251, 235, 0.8)';
    this.ctx.stroke();

    // 4. Draw 3D Chrome & Brass Edge Pins (Ticking Pegs) rotating with the wheel
    this.ctx.rotate(this.currentRotation);
    for (let i = 0; i < this.slots.length; i++) {
      const pinAngle = sliceAngles[i]!.start;
      const pinX = Math.cos(pinAngle) * (radius + 2);
      const pinY = Math.sin(pinAngle) * (radius + 2);

      // Pin Cast Drop Shadow
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(pinX + 1.5, pinY + 1.5, 6, 0, 2 * Math.PI);
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      this.ctx.shadowBlur = 5;
      this.ctx.fill();
      this.ctx.restore();

      // Pin Brass Collar Ring Base
      this.ctx.beginPath();
      this.ctx.arc(pinX, pinY, 5.5, 0, 2 * Math.PI);
      this.ctx.fillStyle = '#B45309';
      this.ctx.fill();

      // Pin 3D Spherical Chrome Core
      this.ctx.beginPath();
      this.ctx.arc(pinX, pinY, 4.2, 0, 2 * Math.PI);
      const chromeGrad = this.ctx.createRadialGradient(pinX - 1.2, pinY - 1.2, 0.5, pinX, pinY, 4.2);
      chromeGrad.addColorStop(0, '#FFFFFF');
      chromeGrad.addColorStop(0.35, '#E2E8F0');
      chromeGrad.addColorStop(0.70, '#64748B');
      chromeGrad.addColorStop(1, '#1E293B');
      this.ctx.fillStyle = chromeGrad;
      this.ctx.fill();

      // Pin Sharp White Light Glint
      this.ctx.beginPath();
      this.ctx.arc(pinX - 1.3, pinY - 1.3, 1.2, 0, 2 * Math.PI);
      this.ctx.fillStyle = '#FFFFFF';
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
   * Dramatic suspense deceleration easing function.
   * Starts high speed, gradually slows down, and slowly clicks across the last few slots for high tension.
   */
  private easeOutSuspense(t: number): number {
    return 1 - Math.pow(1 - t, 4.6);
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

      // 9 full 360-degree rotations for a thrilling fast start
      const fullRotations = 9 * (2 * Math.PI);
      const startRotation = this.currentRotation;
      const finalRotation = this.currentRotation + fullRotations + angleDiff;

      // 9.2 seconds total duration for intense suspense build-up
      const durationMs = 9200;
      const startTime = performance.now();

      const pointerEl = document.getElementById('wheel-pointer');

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        const easedProgress = this.easeOutSuspense(progress);

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
