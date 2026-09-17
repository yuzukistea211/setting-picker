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

export const StarrySpaceBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let constellationEdges: ConstellationEdge[] = [];
    let shootingStars: ShootingStar[] = [];
    let mouseX = 0;
    let mouseY = 0;
    let targetParallaxX = 0;
    let targetParallaxY = 0;
    let currentParallaxX = 0;
    let currentParallaxY = 0;
    let nextShootingStarTime = Date.now() + 2000;

    const setupCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      initStarfield();
    };

    const initStarfield = () => {
      stars = [];
      const count = Math.floor(Math.max(120, (width * height) / 9000));

      for (let i = 0; i < count; i++) {
        const randType = Math.random();
        let type: 'dot' | 'sparkle' | 'ring' = 'dot';
        let size = Math.random() * 1.6 + 0.6; // 0.6 - 2.2px default

        if (randType > 0.88) {
          type = 'sparkle'; // 4-pointed cross star
          size = Math.random() * 3.5 + 3.0; // 3 - 6.5px
        } else if (randType > 0.82) {
          type = 'ring'; // planetoid / celestial ring node
          size = Math.random() * 2 + 2.5;
        }

        const depth = Math.random() * 0.8 + 0.2; // depth for parallax
        const x = Math.random() * width;
        const y = Math.random() * height;
        const baseAlpha = Math.random() * 0.55 + 0.35; // 0.35 - 0.9

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
        let closestDist = 180;
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

        if (closestIdx !== -1 && Math.random() > 0.4) {
          constellationEdges.push({
            fromIndex: idxA,
            toIndex: closestIdx,
            alpha: Math.random() * 0.15 + 0.08,
          });
        }
      }
    };

    const draw4PointSparkle = (cx: number, cy: number, radius: number, rot: number, alpha: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;

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

      // Tiny core center dot for crisp astronomical look
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, alpha + 0.2)})`;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const spawnShootingStar = () => {
      const startX = Math.random() * width * 0.8 + width * 0.1;
      const startY = Math.random() * height * 0.4;
      const angle = (Math.random() * 25 + 25) * (Math.PI / 180); // 25 to 50 degrees downwards
      const length = Math.random() * 80 + 90;
      const speed = Math.random() * 8 + 9;
      const maxLife = Math.random() * 40 + 35;

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

      nextShootingStarTime = Date.now() + Math.random() * 7000 + 4000;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      targetParallaxX = (mouseX - width / 2) * 0.02;
      targetParallaxY = (mouseY - height / 2) * 0.02;
    };

    window.addEventListener('resize', setupCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    setupCanvas();

    let lastTime = performance.now();

    const render = (time: number) => {
      animFrameId = requestAnimationFrame(render);

      if (document.hidden) return;

      const delta = Math.min((time - lastTime) / 16.67, 3);
      lastTime = time;

      // Smooth parallax interpolation
      currentParallaxX += (targetParallaxX - currentParallaxX) * 0.05 * delta;
      currentParallaxY += (targetParallaxY - currentParallaxY) * 0.05 * delta;

      // Clear with pure white space
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Faint astronomical celestial coordinate / orbit rings
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
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
      for (const edge of constellationEdges) {
        const starA = stars[edge.fromIndex];
        const starB = stars[edge.toIndex];
        if (!starA || !starB) continue;

        const ax = starA.x;
        const ay = starA.y;
        const bx = starB.x;
        const by = starB.y;

        ctx.strokeStyle = `rgba(0, 0, 0, ${edge.alpha * Math.min(starA.alpha, starB.alpha)})`;
        ctx.lineWidth = 0.6;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }

      // Update and Draw Stars
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        // Twinkle phase
        s.phase += s.twinkleSpeed * delta;
        const shimmer = Math.sin(s.phase);
        s.alpha = Math.max(0.12, Math.min(1, s.baseAlpha + shimmer * 0.35));

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
          ctx.strokeStyle = `rgba(0, 0, 0, ${s.alpha * 0.6})`;
          ctx.lineWidth = 0.8;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.stroke();

          // Central solid black core
          ctx.fillStyle = `rgba(0, 0, 0, ${s.alpha})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Standard circular black star
          ctx.fillStyle = `rgba(0, 0, 0, ${s.alpha})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Check for shooting star spawn
      if (Date.now() > nextShootingStarTime) {
        spawnShootingStar();
      }

      // Update and Draw Shooting Stars (Black meteors against white sky)
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

        // Fade in rapidly, then fade out smoothly
        const currentAlpha =
          progress < 0.2
            ? (progress / 0.2) * m.alpha
            : (1 - (progress - 0.2) / 0.8) * m.alpha;

        const tailX = m.x - Math.cos(m.angle) * m.length * (1 - progress * 0.4);
        const tailY = m.y - Math.sin(m.angle) * m.length * (1 - progress * 0.4);

        // Linear gradient for fading meteor tail: head is dense black, tail fades to transparent
        const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(0.7, `rgba(0, 0, 0, ${currentAlpha * 0.4})`);
        grad.addColorStop(1, `rgba(0, 0, 0, ${currentAlpha})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();

        // Meteor head spark (tiny 4-pointed black spark)
        draw4PointSparkle(m.x, m.y, 3, m.angle, currentAlpha);
      }
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', setupCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
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
