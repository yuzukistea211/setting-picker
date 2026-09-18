import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  type: 'dot' | 'sparkle' | 'ring';
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  phase: number;
  depth: number;
  rotation: number;
  rotSpeed: number;
}

interface ConstellationEdge {
  fromIndex: number;
  toIndex: number;
  alpha: number;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface StarrySpaceBackgroundProps {
  performanceMode?: boolean;
}

// Reusable offscreen canvas for meteor tail linear gradient (Allocated once, zero GC)
let sharedTailGradientCanvas: HTMLCanvasElement | null = null;

function getSharedTailGradientCanvas(): HTMLCanvasElement {
  if (!sharedTailGradientCanvas && typeof document !== 'undefined') {
    const gradCanvas = document.createElement('canvas');
    gradCanvas.width = 128;
    gradCanvas.height = 4;
    const gCtx = gradCanvas.getContext('2d');
    if (gCtx) {
      const grad = gCtx.createLinearGradient(0, 0, 128, 0);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.4)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 1.0)');
      gCtx.fillStyle = grad;
      gCtx.fillRect(0, 0, 128, 4);
    }
    sharedTailGradientCanvas = gradCanvas;
  }
  return sharedTailGradientCanvas!;
}

// Maximum hardware canvas resolution constraints to prevent VRAM explosion on 2x/3x Retina & 4K screens
const MAX_CANVAS_WIDTH = 1920;
const MAX_CANVAS_HEIGHT = 1080;

export const StarrySpaceBackground: React.FC<StarrySpaceBackgroundProps> = ({
  performanceMode = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animFrameId: number;
    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let constellationEdges: ConstellationEdge[] = [];
    let shootingStars: ShootingStar[] = [];
    let targetParallaxX = 0;
    let targetParallaxY = 0;
    let currentParallaxX = 0;
    let currentParallaxY = 0;
    let nextShootingStarTime = Date.now() + 3000;

    const cachedTail = getSharedTailGradientCanvas();

    const draw4PointSparkle = (
      targetCtx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      radius: number,
      rot: number,
      alpha: number,
    ) => {
      targetCtx.save();
      targetCtx.translate(cx, cy);
      targetCtx.rotate(rot);
      targetCtx.fillStyle = `rgba(0, 0, 0, ${alpha})`;

      targetCtx.beginPath();
      const points = 4;
      const innerRadius = radius * 0.22;

      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? radius : innerRadius;
        const angle = (i * Math.PI) / points;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) targetCtx.moveTo(px, py);
        else targetCtx.lineTo(px, py);
      }
      targetCtx.closePath();
      targetCtx.fill();

      // Tiny core center dot for crisp astronomical look
      targetCtx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, alpha + 0.2)})`;
      targetCtx.beginPath();
      targetCtx.arc(0, 0, 1, 0, Math.PI * 2);
      targetCtx.fill();

      targetCtx.restore();
    };

    const drawCelestialCoordinates = (targetCtx: CanvasRenderingContext2D, w: number, h: number) => {
      targetCtx.save();
      targetCtx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
      targetCtx.lineWidth = 0.8;
      targetCtx.setLineDash([4, 8]);
      targetCtx.beginPath();
      targetCtx.arc(w * 0.15, h * 0.25, 140, 0, Math.PI * 2);
      targetCtx.stroke();

      targetCtx.beginPath();
      targetCtx.arc(w * 0.82, h * 0.65, 200, 0, Math.PI * 2);
      targetCtx.stroke();

      targetCtx.beginPath();
      targetCtx.ellipse(w * 0.5, h * 0.9, 320, 110, -0.2, 0, Math.PI * 2);
      targetCtx.stroke();
      targetCtx.restore();
    };

    const setupCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;

      // Restrict Canvas resolution:
      // In performance mode: force 1.0 DPR
      // In standard dynamic mode: clamp to max 1.25 DPR (protects against 2x/3x high DPR VRAM bloat)
      const rawDpr = window.devicePixelRatio || 1;
      const dpr = performanceMode ? 1.0 : Math.min(rawDpr, 1.25);

      let targetWidth = Math.round(width * dpr);
      let targetHeight = Math.round(height * dpr);

      // Clamp absolute max pixel bounds to prevent excessive framebuffer memory
      if (targetWidth > MAX_CANVAS_WIDTH || targetHeight > MAX_CANVAS_HEIGHT) {
        const clampRatio = Math.min(
          MAX_CANVAS_WIDTH / targetWidth,
          MAX_CANVAS_HEIGHT / targetHeight,
        );
        targetWidth = Math.round(targetWidth * clampRatio);
        targetHeight = Math.round(targetHeight * clampRatio);
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const scaleX = targetWidth / width;
      const scaleY = targetHeight / height;
      ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

      initStarfield();

      if (performanceMode) {
        renderStaticFrame();
      }
    };

    const initStarfield = () => {
      stars = [];
      // Reduce star count in performance mode to save memory and CPU
      const baseDivisor = performanceMode ? 18000 : 10000;
      const minStars = performanceMode ? 50 : 90;
      const maxStars = performanceMode ? 80 : 150;
      const count = Math.min(maxStars, Math.floor(Math.max(minStars, (width * height) / baseDivisor)));

      for (let i = 0; i < count; i++) {
        const randType = Math.random();
        let type: 'dot' | 'sparkle' | 'ring' = 'dot';
        let size = Math.random() * 1.5 + 0.6; // 0.6 - 2.1px

        if (randType > 0.88) {
          type = 'sparkle';
          size = Math.random() * 3.0 + 2.5;
        } else if (randType > 0.82) {
          type = 'ring';
          size = Math.random() * 2 + 2.2;
        }

        const depth = Math.random() * 0.8 + 0.2;
        const x = Math.random() * width;
        const y = Math.random() * height;
        const baseAlpha = Math.random() * 0.5 + 0.35;

        stars.push({
          x,
          y,
          baseX: x,
          baseY: y,
          size,
          type,
          baseAlpha,
          alpha: baseAlpha,
          twinkleSpeed: Math.random() * 0.03 + 0.01,
          phase: Math.random() * Math.PI * 2,
          depth,
          rotation: Math.random() * Math.PI,
          rotSpeed: (Math.random() - 0.5) * 0.005,
        });
      }

      // Generate subtle constellation connection edges
      constellationEdges = [];
      const sparkleIndices = stars
        .map((s, idx) => (s.type === 'sparkle' || s.size > 2 ? idx : -1))
        .filter((idx) => idx !== -1);

      for (let i = 0; i < sparkleIndices.length; i++) {
        const idxA = sparkleIndices[i];
        const starA = stars[idxA];
        let closestDist = 160;
        let closestIdx = -1;

        for (let j = i + 1; j < sparkleIndices.length; j++) {
          const idxB = sparkleIndices[j];
          const starB = stars[idxB];
          const dx = starA.baseX - starB.baseX;
          const dy = starA.baseY - starB.baseY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 40 && dist < closestDist) {
            closestDist = dist;
            closestIdx = idxB;
          }
        }

        if (closestIdx !== -1 && Math.random() > 0.45) {
          constellationEdges.push({
            fromIndex: idxA,
            toIndex: closestIdx,
            alpha: Math.random() * 0.12 + 0.06,
          });
        }
      }
    };

    // Performance Mode: Render a single crisp, static starry frame without running continuous 60fps loop
    const renderStaticFrame = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      drawCelestialCoordinates(ctx, width, height);

      // Constellation lines
      for (const edge of constellationEdges) {
        const starA = stars[edge.fromIndex];
        const starB = stars[edge.toIndex];
        if (!starA || !starB) continue;

        ctx.strokeStyle = `rgba(0, 0, 0, ${edge.alpha * 0.8})`;
        ctx.lineWidth = 0.6;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(starA.baseX, starA.baseY);
        ctx.lineTo(starB.baseX, starB.baseY);
        ctx.stroke();
      }

      // Static stars
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        if (s.type === 'sparkle') {
          draw4PointSparkle(ctx, s.baseX, s.baseY, s.size, s.rotation, s.baseAlpha);
        } else if (s.type === 'ring') {
          ctx.strokeStyle = `rgba(0, 0, 0, ${s.baseAlpha * 0.5})`;
          ctx.lineWidth = 0.8;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(s.baseX, s.baseY, s.size, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = `rgba(0, 0, 0, ${s.baseAlpha})`;
          ctx.beginPath();
          ctx.arc(s.baseX, s.baseY, 1.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(0, 0, 0, ${s.baseAlpha})`;
          ctx.beginPath();
          ctx.arc(s.baseX, s.baseY, s.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const spawnShootingStar = () => {
      // Limit active shooting stars to max 2 simultaneously
      if (shootingStars.length >= 2) return;

      const startX = Math.random() * width * 0.8 + width * 0.1;
      const startY = Math.random() * height * 0.4;
      const angle = (Math.random() * 25 + 25) * (Math.PI / 180);
      const length = Math.random() * 70 + 80;
      const speed = Math.random() * 7 + 8;
      const maxLife = Math.random() * 35 + 30;

      shootingStars.push({
        x: startX,
        y: startY,
        length,
        speed,
        angle,
        alpha: 0.85,
        life: 0,
        maxLife,
      });

      nextShootingStarTime = Date.now() + Math.random() * 8000 + 5000;
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetParallaxX = (e.clientX - width / 2) * 0.015;
      targetParallaxY = (e.clientY - height / 2) * 0.015;
    };

    window.addEventListener('resize', setupCanvas, { passive: true });
    if (!performanceMode) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    setupCanvas();

    // If Performance Mode is active, stop right here! No 60fps loop, 0 CPU/GPU usage!
    if (performanceMode) {
      return () => {
        window.removeEventListener('resize', setupCanvas);
      };
    }

    // Dynamic Animation Loop
    let lastTime = performance.now();

    const render = (time: number) => {
      animFrameId = requestAnimationFrame(render);

      if (document.hidden) return;

      const delta = Math.min((time - lastTime) / 16.67, 3);
      lastTime = time;

      // Parallax smooth interpolation
      currentParallaxX += (targetParallaxX - currentParallaxX) * 0.05 * delta;
      currentParallaxY += (targetParallaxY - currentParallaxY) * 0.05 * delta;

      // Clear
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Faint coordinate rings
      drawCelestialCoordinates(ctx, width, height);

      // Constellation Lines
      for (const edge of constellationEdges) {
        const starA = stars[edge.fromIndex];
        const starB = stars[edge.toIndex];
        if (!starA || !starB) continue;

        ctx.strokeStyle = `rgba(0, 0, 0, ${edge.alpha * Math.min(starA.alpha, starB.alpha)})`;
        ctx.lineWidth = 0.6;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(starA.x, starA.y);
        ctx.lineTo(starB.x, starB.y);
        ctx.stroke();
      }

      // Update & Draw Stars
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        s.phase += s.twinkleSpeed * delta;
        const shimmer = Math.sin(s.phase);
        s.alpha = Math.max(0.12, Math.min(1, s.baseAlpha + shimmer * 0.35));
        s.rotation += s.rotSpeed * delta;

        s.x = s.baseX + currentParallaxX * s.depth;
        s.y = s.baseY + currentParallaxY * s.depth;

        if (s.type === 'sparkle') {
          const currentSize = s.size * (1 + shimmer * 0.15);
          draw4PointSparkle(ctx, s.x, s.y, currentSize, s.rotation, s.alpha);
        } else if (s.type === 'ring') {
          ctx.strokeStyle = `rgba(0, 0, 0, ${s.alpha * 0.6})`;
          ctx.lineWidth = 0.8;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = `rgba(0, 0, 0, ${s.alpha})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(0, 0, 0, ${s.alpha})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Spawn shooting star if ready
      if (Date.now() > nextShootingStarTime) {
        spawnShootingStar();
      }

      // Update & Draw Shooting Stars (Using REUSED offscreen gradient canvas: Zero runtime gradient allocations!)
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const m = shootingStars[i];
        m.life += delta;
        const progress = m.life / m.maxLife;

        if (progress >= 1) {
          shootingStars.splice(i, 1);
          continue;
        }

        m.x += Math.cos(m.angle) * m.speed * delta;
        m.y += Math.sin(m.angle) * m.speed * delta;

        const currentAlpha =
          progress < 0.2
            ? (progress / 0.2) * m.alpha
            : (1 - (progress - 0.2) / 0.8) * m.alpha;

        const tailLen = m.length * (1 - progress * 0.4);
        const tailX = m.x - Math.cos(m.angle) * tailLen;
        const tailY = m.y - Math.sin(m.angle) * tailLen;

        // Draw meteor trail via reused cached linear gradient canvas
        ctx.save();
        ctx.translate(tailX, tailY);
        ctx.rotate(m.angle);
        ctx.globalAlpha = currentAlpha;
        ctx.drawImage(cachedTail, 0, -0.6, tailLen, 1.2);
        ctx.restore();

        // Meteor head spark
        draw4PointSparkle(ctx, m.x, m.y, 3, m.angle, currentAlpha);
      }
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', setupCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [performanceMode]);

  return (
    <canvas
      id="space-starry-canvas"
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none -z-10 w-full h-full"
      aria-hidden="true"
    />
  );
};
