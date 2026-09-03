import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, HandMetal, Sparkles, Activity, Cpu, ArrowRightLeft, Radio } from 'lucide-react';

interface CyberMotionVideoProps {
  portalMode: 'user' | 'admin';
  onSwapPortal: () => void;
}

export const CyberMotionVideo: React.FC<CyberMotionVideoProps> = ({ portalMode, onSwapPortal }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentGesture, setCurrentGesture] = useState('PEACE SIGN');
  const [confidence, setConfidence] = useState(99.4);

  const isAdmin = portalMode === 'admin';
  const primaryColor = isAdmin ? '#c084fc' : '#38bdf8';
  const accentColor = isAdmin ? '#e879f9' : '#818cf8';

  // Realistic Procedural Motion Video Simulation (Runs at smooth 60fps)
  useEffect(() => {
    let animId: number;
    let t = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Gesture list for animation cycles
    const gestures = [
      { name: 'PEACE SIGN', fingers: [0, 1, 1, 0, 0], conf: 99.4 },
      { name: 'THUMBS UP', fingers: [1, 0, 0, 0, 0], conf: 98.8 },
      { name: 'HELLO WAVE', fingers: [1, 1, 1, 1, 1], conf: 99.6 },
      { name: 'STOP / HALT', fingers: [1, 1, 1, 1, 1], conf: 98.2 },
    ];

    let gestureIndex = 0;
    const gestureInterval = setInterval(() => {
      gestureIndex = (gestureIndex + 1) % gestures.length;
      setCurrentGesture(gestures[gestureIndex].name);
      setConfidence(gestures[gestureIndex].conf);
    }, 3800);

    const render = () => {
      t += 0.035;

      const w = (canvas.width = canvas.parentElement?.clientWidth || 450);
      const h = (canvas.height = canvas.parentElement?.clientHeight || 580);

      // Deep cyber canvas background
      ctx.fillStyle = isAdmin ? '#0d091a' : '#050c18';
      ctx.fillRect(0, 0, w, h);

      // 1. Futuristic Cyber Grid Floor (3D perspective)
      ctx.strokeStyle = isAdmin ? 'rgba(168, 85, 247, 0.08)' : 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      const horizonY = h * 0.72;

      for (let x = -w; x < w * 2; x += 40) {
        ctx.beginPath();
        ctx.moveTo(w / 2, horizonY);
        ctx.lineTo(x + Math.sin(t * 0.5) * 20, h);
        ctx.stroke();
      }

      for (let y = horizonY; y < h; y += 18) {
        const lineY = y + ((t * 20) % 18);
        if (lineY <= h) {
          ctx.beginPath();
          ctx.moveTo(0, lineY);
          ctx.lineTo(w, lineY);
          ctx.stroke();
        }
      }

      // 2. Ambient Floating Glowing Energy Spheres
      const orbX1 = w / 2 + Math.cos(t * 0.8) * 70;
      const orbY1 = h / 2 - 40 + Math.sin(t * 0.6) * 45;
      const orbGrad = ctx.createRadialGradient(orbX1, orbY1, 10, orbX1, orbY1, 140);
      orbGrad.addColorStop(0, isAdmin ? 'rgba(168, 85, 247, 0.35)' : 'rgba(14, 165, 233, 0.35)');
      orbGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(orbX1, orbY1, 140, 0, Math.PI * 2);
      ctx.fill();

      // 3. 3D Hand Skeleton with 21 Landmarks
      const handCenterX = w / 2 + Math.sin(t * 0.9) * 12;
      const handCenterY = h / 2 - 10 + Math.cos(t * 0.7) * 10;
      const curFingers = gestures[gestureIndex].fingers;

      const pts: [number, number][] = [];
      pts[0] = [handCenterX, handCenterY + 55]; // Wrist
      pts[1] = [handCenterX - 38, handCenterY + 25]; // Thumb CMC
      pts[5] = [handCenterX - 28, handCenterY - 15]; // Index MCP
      pts[9] = [handCenterX - 3, handCenterY - 22];  // Middle MCP
      pts[13] = [handCenterX + 22, handCenterY - 18]; // Ring MCP
      pts[17] = [handCenterX + 44, handCenterY - 8];  // Pinky MCP

      // Thumb
      const tAngle = -0.7 - curFingers[0] * 0.4 + Math.sin(t * 2) * 0.06;
      pts[2] = [pts[1][0] + Math.cos(tAngle) * 24, pts[1][1] + Math.sin(tAngle) * 24];
      pts[3] = [pts[2][0] + Math.cos(tAngle) * 22, pts[2][1] + Math.sin(tAngle) * 22];
      pts[4] = [pts[3][0] + Math.cos(tAngle) * 20, pts[3][1] + Math.sin(tAngle) * 20];

      // Fingers helper
      const makeFinger = (mcpIdx: number, ext: number, spread: number, len: number) => {
        const base = pts[mcpIdx];
        const angle = -Math.PI / 2 + spread + (1 - ext) * 0.75 + Math.sin(t * 1.5 + mcpIdx) * 0.03;
        const seg = len * (ext > 0.5 ? 1 : 0.45);
        const p1: [number, number] = [base[0] + Math.sin(angle) * seg, base[1] - Math.cos(angle) * seg];
        const p2: [number, number] = [p1[0] + Math.sin(angle) * (seg * 0.85), p1[1] - Math.cos(angle) * (seg * 0.85)];
        const p3: [number, number] = [p2[0] + Math.sin(angle) * (seg * 0.75), p2[1] - Math.cos(angle) * (seg * 0.75)];
        return [p1, p2, p3];
      };

      const [p6, p7, p8] = makeFinger(5, curFingers[1], -0.15, 30);
      pts[6] = p6; pts[7] = p7; pts[8] = p8;

      const [p10, p11, p12] = makeFinger(9, curFingers[2], 0.0, 33);
      pts[10] = p10; pts[11] = p11; pts[12] = p12;

      const [p14, p15, p16] = makeFinger(13, curFingers[3], 0.14, 30);
      pts[14] = p14; pts[15] = p15; pts[16] = p16;

      const [p18, p19, p20] = makeFinger(17, curFingers[4], 0.28, 25);
      pts[18] = p18; pts[19] = p19; pts[20] = p20;

      const bones: [number, number][] = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [5, 9], [9, 10], [10, 11], [11, 12],
        [9, 13], [13, 14], [14, 15], [15, 16],
        [13, 17], [17, 18], [18, 19], [19, 20],
        [0, 17]
      ];

      // Draw bones
      ctx.shadowBlur = 12;
      ctx.shadowColor = primaryColor;
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 2.6;

      for (const [s, e] of bones) {
        if (pts[s] && pts[e]) {
          ctx.beginPath();
          ctx.moveTo(pts[s][0], pts[s][1]);
          ctx.lineTo(pts[e][0], pts[e][1]);
          ctx.stroke();
        }
      }

      // Draw joints
      for (let i = 0; i < pts.length; i++) {
        const [px, py] = pts[i];
        const isTip = [4, 8, 12, 16, 20].includes(i);
        const r = isTip ? 5.5 : 3.5;

        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = isTip ? '#ffffff' : accentColor;
        ctx.fill();

        if (isTip) {
          ctx.beginPath();
          ctx.arc(px, py, r + 3 + Math.sin(t * 3 + i) * 1.5, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      ctx.shadowBlur = 0;

      // 4. Cyber Scanning Wave Overlay
      const scanLineY = ((t * 45) % (h + 60)) - 30;
      const scanGrad = ctx.createLinearGradient(0, scanLineY - 18, 0, scanLineY + 18);
      scanGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      scanGrad.addColorStop(0.5, isAdmin ? 'rgba(192, 132, 252, 0.28)' : 'rgba(56, 189, 248, 0.28)');
      scanGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanLineY - 18, w, 36);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(gestureInterval);
    };
  }, [isAdmin, primaryColor, accentColor]);

  return (
    <div className={`cyber-motion-panel ${isAdmin ? 'panel-admin' : 'panel-user'}`}>
      {/* Background Procedural Motion Canvas */}
      <div className="motion-canvas-layer">
        <canvas ref={canvasRef} className="cyber-canvas" />
      </div>

      {/* Futuristic Glassmorphic Overlays */}
      <div className="motion-content-layer">
        {/* Top Telemetry Header */}
        <div className="motion-top-bar">
          <div className="motion-tag">
            <span className="live-status-dot"></span>
            <Radio size={13} style={{ marginRight: '4px' }} />
            <span>{isAdmin ? 'CLEARANCE SECURITY LEVEL 1' : 'VISION AI CORE 60 FPS'}</span>
          </div>

          <div className="motion-badge">
            <Activity size={13} style={{ color: primaryColor }} />
            <span>{confidence}% Confidence</span>
          </div>
        </div>

        {/* Center Futuristic Showcase Info */}
        <div className="motion-center-brand">
          <div className="motion-brand-icon">
            {isAdmin ? <ShieldCheck size={32} /> : <HandMetal size={32} />}
          </div>
          <h3 className="motion-brand-title">
            {isAdmin ? 'ADMINISTRATIVE ACCESS' : 'GESTUREAI PLATFORM'}
          </h3>
          <p className="motion-brand-subtitle">
            {isAdmin
              ? 'Multi-user governance, gesture approvals, and real-time model auditing'
              : 'Interactive hand gesture recognition & speech synthesis powered by MediaPipe AI'}
          </p>

          {/* Real-time Recognition Box */}
          <div className="active-gesture-hud">
            <div className="hud-indicator">
              <span className="hud-pulse"></span>
              <span className="hud-tag">LIVE DETECTED SIGN</span>
            </div>
            <div className="hud-name">{currentGesture}</div>
          </div>
        </div>

        {/* Bottom Swap Portal Card */}
        <div className="motion-bottom-action">
          <div className="swap-tip-text">
            {isAdmin ? 'Switch to standard user portal?' : 'Switch to platform administrator portal?'}
          </div>
          <button
            type="button"
            className="btn-swap-portal"
            onClick={onSwapPortal}
            title={isAdmin ? 'Swap to User Portal' : 'Swap to Admin Portal'}
          >
            <ArrowRightLeft size={16} />
            <span>{isAdmin ? 'Swap to User Portal (Cyan)' : 'Swap to Admin Portal (Purple)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
