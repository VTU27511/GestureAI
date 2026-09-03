import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCw, ShieldCheck } from 'lucide-react';

interface CaptchaProps {
  onCaptchaChange: (code: string) => void;
  variant?: 'user' | 'admin';
}

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const Captcha: React.FC<CaptchaProps> = ({ onCaptchaChange, variant = 'user' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentCode, setCurrentCode] = useState('');
  const [isRotating, setIsRotating] = useState(false);

  const generateRandomCode = (): string => {
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }
    return result;
  };

  const drawCaptcha = useCallback((code: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = 150);
    const height = (canvas.height = 42);

    // Dark sleek container background
    ctx.fillStyle = variant === 'admin' ? '#161324' : '#0d1829';
    ctx.fillRect(0, 0, width, height);

    // Subtle border
    ctx.strokeStyle = variant === 'admin' ? 'rgba(168, 85, 247, 0.4)' : 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);

    // Draw random interference noise lines
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = variant === 'admin' 
        ? `rgba(168, 85, 247, ${Math.random() * 0.35 + 0.15})`
        : `rgba(56, 189, 248, ${Math.random() * 0.35 + 0.15})`;
      ctx.lineWidth = Math.random() * 1.5 + 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.bezierCurveTo(
        Math.random() * width, Math.random() * height,
        Math.random() * width, Math.random() * height,
        Math.random() * width, Math.random() * height
      );
      ctx.stroke();
    }

    // Draw noise dots
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.25})`;
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw characters with random rotation and colors
    const charWidth = width / (code.length + 1);
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      ctx.save();
      const x = (i + 0.8) * charWidth;
      const y = height / 2 + 6;
      ctx.translate(x, y);
      const angle = (Math.random() - 0.5) * 0.45; // -12deg to +12deg
      ctx.rotate(angle);

      ctx.font = 'bold 22px "Consolas", "Courier New", monospace';
      if (variant === 'admin') {
        const colors = ['#c084fc', '#e879f9', '#f472b6', '#a855f7', '#38bdf8'];
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      } else {
        const colors = ['#38bdf8', '#818cf8', '#67e8f9', '#60a5fa', '#a78bfa'];
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      }

      ctx.fillText(char, -7, 0);
      ctx.restore();
    }
  }, [variant]);

  const refreshCaptcha = useCallback(() => {
    setIsRotating(true);
    const newCode = generateRandomCode();
    setCurrentCode(newCode);
    drawCaptcha(newCode);
    onCaptchaChange(newCode);
    setTimeout(() => setIsRotating(false), 400);
  }, [drawCaptcha, onCaptchaChange]);

  useEffect(() => {
    refreshCaptcha();
  }, []);

  return (
    <div className="captcha-wrapper">
      <div className="captcha-box" onClick={refreshCaptcha} title="Click image to refresh captcha">
        <canvas ref={canvasRef} className="captcha-canvas" />
      </div>
      <button
        type="button"
        className="btn-captcha-refresh"
        onClick={refreshCaptcha}
        title="Refresh CAPTCHA"
        aria-label="Refresh Captcha"
      >
        <RotateCw size={17} className={isRotating ? 'rotating' : ''} />
      </button>
    </div>
  );
};
