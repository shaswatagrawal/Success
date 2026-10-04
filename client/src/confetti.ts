/**
 * High-performance lightweight Canvas Confetti system.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  opacity: number;
  scaleX: number;
}

export class ConfettiCannon {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private particles: Particle[] = [];
  private animationId: number | null = null;
  private isActive = false;

  private colors = [
    '#F59E0B',
    '#FEF08A',
    '#10B981',
    '#8B5CF6',
    '#EC4899',
    '#06B6D4',
    '#3B82F6',
    '#FFFFFF',
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
  }

  public burst(count = 150): void {
    this.resize();
    this.particles = [];
    const rect = this.canvas.getBoundingClientRect();
    const originX = rect.width / 2;
    const originY = rect.height * 0.4;

    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = 4 + Math.random() * 9;
      const color = this.colors[Math.floor(Math.random() * this.colors.length)] ?? '#F59E0B';

      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        width: 8 + Math.random() * 8,
        height: 6 + Math.random() * 6,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        color,
        opacity: 1,
        scaleX: 1,
      });
    }

    if (!this.isActive) {
      this.isActive = true;
      this.loop();
    }
  }

  private loop = (): void => {
    if (!this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22; // gravity
      p.vx *= 0.985; // air resistance
      p.rotation += p.rotationSpeed;
      p.scaleX = Math.cos((p.rotation * Math.PI) / 180);

      // Fade out as it descends
      if (p.y > rect.height * 0.7) {
        p.opacity -= 0.015;
      }

      if (p.opacity <= 0 || p.y > rect.height + 20) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.scale(p.scaleX, 1);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.opacity);
      this.ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(this.loop);
    } else {
      this.isActive = false;
      this.ctx.clearRect(0, 0, rect.width, rect.height);
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }
  };

  public stop(): void {
    this.particles = [];
    this.isActive = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.ctx) {
      const rect = this.canvas.getBoundingClientRect();
      this.ctx.clearRect(0, 0, rect.width, rect.height);
    }
  }
}
