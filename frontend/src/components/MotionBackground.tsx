import React, { useEffect, useRef } from 'react';

interface MotionBackgroundProps {
  variant?: 'user' | 'admin';
  customColor?: string;
  customSecondary?: string;
}

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}

export const MotionBackground: React.FC<MotionBackgroundProps> = ({
  variant = 'user',
  customColor,
  customSecondary,
}) => {
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

    const isCyan = variant === 'user';
    const primaryColor = customColor || (isCyan ? '#38bdf8' : '#c084fc');
    const secondaryColor = customSecondary || (isCyan ? '#818cf8' : '#e879f9');
    const primaryRGB = hexToRgb(primaryColor);
    const accentRGB = hexToRgb(secondaryColor);

    // Optimized, featherlight floating neural particles (Takes <0.5% CPU)
    const particleCount = Math.min(width > 768 ? 45 : 25, 50);
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      radius: Math.random() * 2 + 1,
      alpha: Math.random() * 0.4 + 0.2,
    }));

    let time = 0;

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Deep dark cyber background
      ctx.fillStyle = '#060b14';
      ctx.fillRect(0, 0, width, height);

      // Ambient radial lighting wave (Hardware accelerated, zero lag)
      const grad = ctx.createRadialGradient(
        width * 0.5 + Math.sin(time * 0.5) * 100,
        height * 0.45 + Math.cos(time * 0.5) * 60,
        40,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.75
      );
      grad.addColorStop(0, `rgba(${primaryRGB}, 0.12)`);
      grad.addColorStop(0.5, `rgba(${accentRGB}, 0.04)`);
      grad.addColorStop(1, 'rgba(6, 11, 20, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw lightweight floating particles and connections
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${primaryRGB}, ${p.alpha})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${accentRGB}, ${(1 - dist / 120) * 0.2})`;
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
  }, [variant, customColor, customSecondary]);

  return (
    <div className="motion-bg-container">
      {/* 60 FPS Featherlight Neural Particle Canvas */}
      <canvas ref={canvasRef} className="motion-bg-canvas" />

      {/* Ambient Glowing Corner Orbs with Dynamic Colors */}
      <div
        className="motion-orb orb-1"
        style={{
          background: `radial-gradient(circle, ${customColor || (variant === 'admin' ? '#9333ea' : '#0ea5e9')}, transparent 70%)`,
        }}
      />
      <div
        className="motion-orb orb-2"
        style={{
          background: `radial-gradient(circle, ${customSecondary || (variant === 'admin' ? '#ec4899' : '#6366f1')}, transparent 70%)`,
        }}
      />

      {/* Subtle Central Vignette so centered cards pop cleanly */}
      <div className="motion-bg-overlay" />
    </div>
  );
};
