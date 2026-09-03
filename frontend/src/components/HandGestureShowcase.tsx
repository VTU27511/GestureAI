import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Volume2, CheckCircle2, Video } from 'lucide-react';

interface HandGestureShowcaseProps {
  variant?: 'user' | 'admin';
}

interface GestureDemo {
  name: string;
  emoji: string;
  speech: string;
  confidence: number;
  // Normalized 2D hand landmark offsets from wrist (0) to 20
  fingerPos: [number, number, number, number, number]; // extension of [thumb, index, middle, ring, pinky] 0=curled, 1=extended
}

const DEMO_GESTURES: GestureDemo[] = [
  { name: 'HELLO', emoji: '👋', speech: 'Hello! Welcome to GestureAI Platform.', confidence: 99.4, fingerPos: [1, 1, 1, 1, 1] },
  { name: 'THUMBS UP', emoji: '👍', speech: 'Positive gesture recognized: Excellent!', confidence: 98.7, fingerPos: [1, 0, 0, 0, 0] },
  { name: 'PEACE SIGN', emoji: '✌️', speech: 'Victory gesture detected: Two fingers up.', confidence: 99.1, fingerPos: [0, 1, 1, 0, 0] },
  { name: 'STOP / HALT', emoji: '✋', speech: 'Stop command confirmed. Action halted.', confidence: 98.2, fingerPos: [1, 1, 1, 1, 1] },
];

export const HandGestureShowcase: React.FC<HandGestureShowcaseProps> = ({ variant = 'user' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeGestureIndex, setActiveGestureIndex] = useState(0);
  const [isAudioActive, setIsAudioActive] = useState(true);

  // Auto-cycle through gestures every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveGestureIndex((prev) => (prev + 1) % DEMO_GESTURES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const activeGesture = DEMO_GESTURES[activeGestureIndex];
  const primaryColor = variant === 'admin' ? '#c084fc' : '#38bdf8';
  const glowColor = variant === 'admin' ? 'rgba(168, 85, 247, 0.4)' : 'rgba(56, 189, 248, 0.4)';

  // Draw animated skeleton hand with 21 landmarks
  useEffect(() => {
    let animationFrameId: number;
    let t = 0;

    const render = () => {
      t += 0.04;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = (canvas.width = canvas.parentElement?.clientWidth || 360);
      const h = (canvas.height = 240);

      ctx.clearRect(0, 0, w, h);

      // Background subtle grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Base hand position with gentle floating animation
      const centerX = w / 2 + Math.sin(t * 0.7) * 8;
      const centerY = h / 2 + 35 + Math.cos(t * 0.9) * 6;

      // Finger angles and lengths based on active gesture extension
      const fingers = activeGesture.fingerPos;
      // Define 21 landmark positions
      const pts: [number, number][] = [];

      // 0: Wrist
      pts[0] = [centerX, centerY + 30];

      // Palm base points
      pts[1] = [centerX - 35, centerY + 10]; // Thumb CMC
      pts[5] = [centerX - 25, centerY - 20]; // Index MCP
      pts[9] = [centerX - 2, centerY - 25];  // Middle MCP
      pts[13] = [centerX + 20, centerY - 22]; // Ring MCP
      pts[17] = [centerX + 40, centerY - 15]; // Pinky MCP

      // Thumb (1, 2, 3, 4)
      const thumbExt = fingers[0];
      const thumbAngle = -0.7 - thumbExt * 0.4 + Math.sin(t * 1.5) * 0.05;
      const tLen = 22;
      pts[2] = [pts[1][0] + Math.cos(thumbAngle) * tLen, pts[1][1] + Math.sin(thumbAngle) * tLen];
      pts[3] = [pts[2][0] + Math.cos(thumbAngle) * tLen, pts[2][1] + Math.sin(thumbAngle) * tLen];
      pts[4] = [pts[3][0] + Math.cos(thumbAngle) * (tLen * 0.9), pts[3][1] + Math.sin(thumbAngle) * (tLen * 0.9)];

      // Helper for straight fingers (MCP, PIP, DIP, TIP)
      const buildFinger = (baseIdx: number, ext: number, spreadAngle: number, length: number) => {
        const base = pts[baseIdx];
        const angle = -Math.PI / 2 + spreadAngle + (1 - ext) * 0.7;
        const segLen = length * (ext > 0.5 ? 1 : 0.45);
        const p1: [number, number] = [base[0] + Math.sin(angle) * segLen, base[1] - Math.cos(angle) * segLen];
        const p2: [number, number] = [p1[0] + Math.sin(angle) * (segLen * 0.85), p1[1] - Math.cos(angle) * (segLen * 0.85)];
        const p3: [number, number] = [p2[0] + Math.sin(angle) * (segLen * 0.75), p2[1] - Math.cos(angle) * (segLen * 0.75)];
        return [p1, p2, p3];
      };

      // Index (5, 6, 7, 8)
      const [p6, p7, p8] = buildFinger(5, fingers[1], -0.15, 26);
      pts[6] = p6; pts[7] = p7; pts[8] = p8;

      // Middle (9, 10, 11, 12)
      const [p10, p11, p12] = buildFinger(9, fingers[2], 0.0, 28);
      pts[10] = p10; pts[11] = p11; pts[12] = p12;

      // Ring (13, 14, 15, 16)
      const [p14, p15, p16] = buildFinger(13, fingers[3], 0.12, 26);
      pts[14] = p14; pts[15] = p15; pts[16] = p16;

      // Pinky (17, 18, 19, 20)
      const [p18, p19, p20] = buildFinger(17, fingers[4], 0.25, 22);
      pts[18] = p18; pts[19] = p19; pts[20] = p20;

      // Connections between landmarks (bones)
      const connections: [number, number][] = [
        // Palm
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [5, 9], [9, 10], [10, 11], [11, 12],
        [9, 13], [13, 14], [14, 15], [15, 16],
        [13, 17], [17, 18], [18, 19], [19, 20],
        [0, 17]
      ];

      // Draw bone connections with cyber glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = primaryColor;
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 2.5;

      for (const [start, end] of connections) {
        if (pts[start] && pts[end]) {
          ctx.beginPath();
          ctx.moveTo(pts[start][0], pts[start][1]);
          ctx.lineTo(pts[end][0], pts[end][1]);
          ctx.stroke();
        }
      }

      // Draw landmarks (joints)
      for (let i = 0; i < pts.length; i++) {
        const [px, py] = pts[i];
        ctx.beginPath();
        const isTip = [4, 8, 12, 16, 20].includes(i);
        const radius = isTip ? 5 : 3.5;
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle = isTip ? '#ffffff' : primaryColor;
        ctx.fill();

        // Tip glowing pulse
        if (isTip) {
          ctx.beginPath();
          ctx.arc(px, py, radius + 2 + Math.sin(t * 3 + i) * 1.5, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      ctx.shadowBlur = 0;

      // Draw scanning laser line
      const scanY = ((t * 40) % (h + 40)) - 20;
      const grad = ctx.createLinearGradient(0, scanY - 15, 0, scanY + 15);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      grad.addColorStop(0.5, variant === 'admin' ? 'rgba(192, 132, 252, 0.3)' : 'rgba(56, 189, 248, 0.3)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 15, w, 30);

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeGesture, primaryColor, variant]);

  return (
    <div className={`gesture-showcase-container ${variant === 'admin' ? 'showcase-admin' : ''}`}>
      {/* Top Header Badge */}
      <div className="showcase-header">
        <div className="showcase-live-tag">
          <span className="live-dot"></span>
          <Video size={13} style={{ marginRight: '3px' }} />
          <span>REAL-TIME VISION AI ENGINE</span>
        </div>
        <div className="showcase-conf-badge">
          <CheckCircle2 size={13} style={{ color: variant === 'admin' ? '#c084fc' : '#38bdf8' }} />
          <span>{activeGesture.confidence}% Match</span>
        </div>
      </div>

      {/* Interactive 21-Landmark Canvas */}
      <div className="showcase-canvas-wrapper">
        <canvas ref={canvasRef} className="showcase-canvas" />

        {/* Floating Recognition HUD Badge */}
        <div className="showcase-hud-overlay">
          <div className="hud-gesture-badge">
            <span className="hud-emoji">{activeGesture.emoji}</span>
            <div className="hud-info">
              <span className="hud-label">DETECTED SIGN</span>
              <span className="hud-title">{activeGesture.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Audio TTS Synthesizer Feed */}
      <div className="showcase-tts-bar">
        <div className="tts-icon-pulse">
          <Volume2 size={16} />
        </div>
        <div className="tts-text-wrapper">
          <div className="tts-title">VOICE SYNTHESIZER (SAPI TTS)</div>
          <div className="tts-quote">"{activeGesture.speech}"</div>
        </div>
        <div className="audio-wave-bars">
          <span className="bar b1"></span>
          <span className="bar b2"></span>
          <span className="bar b3"></span>
          <span className="bar b4"></span>
          <span className="bar b5"></span>
        </div>
      </div>

      {/* Interactive Gesture Switcher Chips */}
      <div className="showcase-chips">
        {DEMO_GESTURES.map((g, idx) => (
          <button
            key={g.name}
            type="button"
            className={`showcase-chip ${idx === activeGestureIndex ? 'active' : ''}`}
            onClick={() => setActiveGestureIndex(idx)}
          >
            <span>{g.emoji}</span>
            <span>{g.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
