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

// Pre-compute 21 discrete alpha strings to prevent thousands of string allocations per second in render loop
const ALPHA_COLOR_CACHE: string[] = Array.from({ length: 21 }, (_, i) => {
  const a = (i / 20).toFixed(2);
  return `rgba(0, 0, 0, ${a})`;
});

const getCachedAlphaColor = (alpha: number): string => {
  const clamped = Math.max(0, Math.min(1, alpha));
  const index = Math.round(clamped * 20);
  return ALPHA_COLOR_CACHE[index];
};

export const StarrySpaceBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animFrameId: number | null = null;
    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let constellationEdges: ConstellationEdge[] = [];
    let shootingStars: ShootingStar[] = [];
    let targetParallaxX = 0;
    let targetParallaxY = 0;
    let currentParallaxX = 0;
    let currentParallaxY = 0;
    let nextShootingStarTime = Date.now() + 2500;
    let isPaused = false;

    const setupCanvas = () => {
      // Memory optimization: cap DPR at 1.25 to prevent massive canvas backing store memory on 4K / retina screens
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      initStarfield();
    };

    const initStarfield = () => {
      // Memory optimization: cap star count at 85 to reduce memory and draw call overhead
      const count = Math.min(85, Math.floor(Math.max(50, (width * height) / 16000)));
      stars = new Array(count);

      for (let i = 0; i < count; i++) {
        const randType = Math.random();
        let type: 'dot' | 'sparkle' | 'ring' = 'dot';
        let size = Math.random() * 1.5 + 0.6; // 0.6 - 2.1px default

        if (randType > 0.88) {
          type = 'sparkle'; // 4-pointed cross star
          size = Math.random() * 3.0 + 2.8;
        } else if (randType > 0.82) {
          type = 'ring'; // planetoid / celestial ring node
          size = Math.random() * 1.8 + 2.2;
        }

        const depth = Math.random() * 0.8 + 0.2; // depth for parallax
        const x = Math.random() * width;
        const y = Math.random() * height;
        const baseAlpha = Math.random() * 0.5 + 0.35; // 0.35 - 0.85

        stars[i] = {
          x,
          y,
          baseX: x,
          baseY: y,
          size,
          type,
          baseAlpha,
          alpha: baseAlpha,
          twinkleSpeed: Math.random() * 0.025 + 0.01,
          phase: Math.random() * Math.PI * 2,
          depth,
          rotation: Math.random() * Math.PI,
          rotSpeed: (Math.random() - 0.5) * 0.004,
        };
      }

      // Generate subtle constellation connection edges (sparse)
      constellationEdges = [];
      const sparkleIndices: number[] = [];
      for (let i = 0; i < stars.length; i++) {
        if (stars[i].type === 'sparkle' || stars[i].size > 2) {
          sparkleIndices.push(i);
        }
      }

      for (let i = 0; i < sparkleIndices.length; i++) {
        const idxA = sparkleIndices[i];
        const starA = stars[idxA];
        let closestDist = 170;
        let closestIdx = -1;

        for (let j = i + 1; j < sparkleIndices.length; j++) {
          const idxB = sparkleIndices[j];
          const starB = stars[idxB];
          const dx = starA.baseX - starB.baseX;
          const dy = starA.baseY - starB.baseY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 45 && dist < closestDist) {
            closestDist = dist;
            closestIdx = idxB;
          }
        }

        if (closestIdx !== -1 && Math.random() > 0.45) {
          constellationEdges.push({
            fromIndex: idxA,
            toIndex: closestIdx,
            alpha: Math.random() * 0.12 + 0.08,
          });
        }
      }
    };

    const draw4PointSparkle = (cx: number, cy: number, radius: number, rot: number, alpha: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.fillStyle = getCachedAlphaColor(alpha);

      ctx.beginPath();
      const points = 4;
      const innerRadius = radius * 0.22;

      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? radius : innerRadius;
        const angle = (i * Math.PI) / points;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      // Tiny core center dot
      ctx.fillStyle = getCachedAlphaColor(alpha + 0.2);
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const spawnShootingStar = () => {
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
        alpha: 0.8,
        life: 0,
        maxLife,
      });

      nextShootingStarTime = Date.now() + Math.random() * 8000 + 5000;
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetParallaxX = (e.clientX - width / 2) * 0.015;
      targetParallaxY = (e.clientY - height / 2) * 0.015;
    };

    // Debounce resize to prevent memory spikes from recreating buffers on every resize pixel
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setupCanvas();
      }, 150);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    setupCanvas();

    let lastTime = performance.now();

    const render = (time: number) => {
      if (isPaused) return;

      animFrameId = requestAnimationFrame(render);

      const delta = Math.min((time - lastTime) / 16.67, 2.5);
      lastTime = time;

      // Smooth parallax interpolation
      currentParallaxX += (targetParallaxX - currentParallaxX) * 0.05 * delta;
      currentParallaxY += (targetParallaxY - currentParallaxY) * 0.05 * delta;

      // Clear with pure white space
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Faint astronomical celestial coordinate / orbit rings
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.arc(width * 0.15, height * 0.25, 140, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(width * 0.82, height * 0.65, 200, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(width * 0.5, height * 0.9, 320, 110, -0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Draw Constellation Lines between connected stars
      if (constellationEdges.length > 0) {
        ctx.lineWidth = 0.6;
        ctx.setLineDash([2, 4]);

        for (let i = 0; i < constellationEdges.length; i++) {
          const edge = constellationEdges[i];
          const starA = stars[edge.fromIndex];
          const starB = stars[edge.toIndex];
          if (!starA || !starB) continue;

          ctx.strokeStyle = getCachedAlphaColor(edge.alpha * Math.min(starA.alpha, starB.alpha));
          ctx.beginPath();
          ctx.moveTo(starA.x, starA.y);
          ctx.lineTo(starB.x, starB.y);
          ctx.stroke();
        }
      }

      // Update and Draw Stars
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        // Twinkle phase
        s.phase += s.twinkleSpeed * delta;
        const shimmer = Math.sin(s.phase);
        s.alpha = Math.max(0.15, Math.min(1, s.baseAlpha + shimmer * 0.3));

        // Rotation
        s.rotation += s.rotSpeed * delta;

        // Parallax position
        s.x = s.baseX + currentParallaxX * s.depth;
        s.y = s.baseY + currentParallaxY * s.depth;

        if (s.type === 'sparkle') {
          const currentSize = s.size * (1 + shimmer * 0.15);
          draw4PointSparkle(s.x, s.y, currentSize, s.rotation, s.alpha);
        } else if (s.type === 'ring') {
          // Celestial orbital star
          ctx.strokeStyle = getCachedAlphaColor(s.alpha * 0.6);
          ctx.lineWidth = 0.8;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.stroke();

          // Central solid black core
          ctx.fillStyle = getCachedAlphaColor(s.alpha);
          ctx.beginPath();
          ctx.arc(s.x, s.y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Standard circular star
          ctx.fillStyle = getCachedAlphaColor(s.alpha);
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Check for shooting star spawn
      if (Date.now() > nextShootingStarTime) {
        spawnShootingStar();
      }

      // Update and Draw Shooting Stars
      if (shootingStars.length > 0) {
        ctx.lineWidth = 1.2;
        ctx.setLineDash([]);

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

          const tailX = m.x - Math.cos(m.angle) * m.length * (1 - progress * 0.4);
          const tailY = m.y - Math.sin(m.angle) * m.length * (1 - progress * 0.4);

          ctx.strokeStyle = getCachedAlphaColor(currentAlpha * 0.7);
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(m.x, m.y);
          ctx.stroke();

          draw4PointSparkle(m.x, m.y, 2.5, m.angle, currentAlpha);
        }
      }
    };

    // Pause animation when page is hidden to save battery, CPU and prevent memory leak
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPaused = true;
        if (animFrameId !== null) {
          cancelAnimationFrame(animFrameId);
          animFrameId = null;
        }
      } else {
        if (isPaused) {
          isPaused = false;
          lastTime = performance.now();
          animFrameId = requestAnimationFrame(render);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    animFrameId = requestAnimationFrame(render);

    return () => {
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
      }
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <canvas
      id="space-starry-canvas"
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none -z-10 w-full h-full"
      aria-hidden="true"
    />
  );
};

