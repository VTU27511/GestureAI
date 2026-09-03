import React, { useEffect, useRef } from 'react';

interface MotionBackgroundProps {
  variant?: 'user' | 'admin';
}

export const MotionBackground: React.FC<MotionBackgroundProps> = ({ variant = 'user' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle nodes for digital tech network
    const particleCount = Math.min(width > 768 ? 65 : 35, 75);
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
    }> = [];

    const isCyan = variant === 'user';
    const primaryRGB = isCyan ? '56, 189, 248' : '168, 85, 247'; // cyan vs purple
    const secondaryRGB = isCyan ? '99, 102, 241' : '236, 72, 153';

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 2.2 + 1,
        alpha: Math.random() * 0.5 + 0.3,
      });
    }

    let time = 0;
    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Draw subtle undulating wave gradient in background
      const grad = ctx.createRadialGradient(
        width * 0.5 + Math.sin(time * 0.5) * 120,
        height * 0.35 + Math.cos(time * 0.5) * 80,
        50,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.75
      );
      if (isCyan) {
        grad.addColorStop(0, 'rgba(14, 165, 233, 0.14)');
        grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.05)');
        grad.addColorStop(1, 'rgba(9, 13, 22, 0)');
      } else {
        grad.addColorStop(0, 'rgba(168, 85, 247, 0.18)');
        grad.addColorStop(0.5, 'rgba(139, 92, 246, 0.06)');
        grad.addColorStop(1, 'rgba(9, 13, 22, 0)');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Update & draw particles and connecting lines
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Draw particle node
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${primaryRGB}, ${p.alpha})`;
        ctx.fill();

        // Connect nearby nodes
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            const lineAlpha = (1 - dist / 130) * 0.25;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${secondaryRGB}, ${lineAlpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [variant]);

  return (
    <div className="motion-bg-container">
      {/* Dynamic generative neural particle canvas */}
      <canvas ref={canvasRef} className="motion-bg-canvas" />

      {/* Ambient glowing tech orbs */}
      <div className={`motion-orb orb-1 ${variant === 'admin' ? 'orb-admin' : ''}`} />
      <div className={`motion-orb orb-2 ${variant === 'admin' ? 'orb-admin' : ''}`} />

      {/* Semi-transparent dark vignette overlay */}
      <div className="motion-bg-overlay" />
    </div>
  );
};
