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

    // Gestures configuration: [thumb, index, middle, ring, pinky] (0 = curled, 1 = extended)
    const gestureLibrary = [
      { name: 'OPEN PALM (FIVE)', fingers: [1, 1, 1, 1, 1] },
      { name: 'PEACE SIGN', fingers: [0, 1, 1, 0, 0] },
      { name: 'THUMBS UP', fingers: [1, 0, 0, 0, 0] },
      { name: 'POINTING (ONE)', fingers: [0, 1, 0, 0, 0] },
      { name: 'OKAY SIGN', fingers: [0.1, 0.1, 1, 1, 1] },
      { name: 'ROCK / SHAKA', fingers: [1, 1, 0, 0, 1] },
      { name: 'CLOSED FIST', fingers: [0, 0, 0, 0, 0] },
    ];

    // Current finger states for smooth interpolation (lerping)
    const hand1Fingers = [1, 1, 1, 1, 1];
    const hand2Fingers = [0, 1, 1, 0, 0];

    let hand1TargetIdx = 0;
    let hand2TargetIdx = 1;
    let gestureTimer = 0;
    let time = 0;

    // Ambient floating particles
    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2 + 1,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    // Draw single articulated 21-landmark human hand with organic palm
    const drawHumanHand = (
      cx: number,
      cy: number,
      scale: number,
      rotation: number,
      curFingers: number[],
      isLeft: boolean,
      label: string,
      confidence: number
    ) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);

      const mirror = isLeft ? -1 : 1;
      const pts: [number, number][] = [];

      // Wrist
      pts[0] = [0, 110];

      // Palm Knuckle Anchors (MCP)
      pts[1] = [mirror * 55, 60];  // Thumb CMC
      pts[5] = [mirror * 38, -25]; // Index MCP
      pts[9] = [mirror * 8, -40];  // Middle MCP
      pts[13] = [mirror * -24, -30]; // Ring MCP
      pts[17] = [mirror * -50, -12]; // Pinky MCP

      // Thumb articulation
      const thumbExt = curFingers[0];
      const tAngle = (isLeft ? 0.7 : -0.7) - thumbExt * 0.5 + Math.sin(time * 2) * 0.05;
      pts[2] = [pts[1][0] + Math.sin(tAngle) * 32, pts[1][1] - Math.cos(tAngle) * 32];
      pts[3] = [pts[2][0] + Math.sin(tAngle) * 28, pts[2][1] - Math.cos(tAngle) * 28];
      pts[4] = [pts[3][0] + Math.sin(tAngle) * 26, pts[3][1] - Math.cos(tAngle) * 26];

      // Helper function to calculate 3 segments per finger
      const calculateFinger = (mcpIdx: number, ext: number, spread: number, totalLen: number) => {
        const base = pts[mcpIdx];
        const angle = -Math.PI / 2 + spread * mirror + (1 - ext) * 0.85 + Math.sin(time * 1.5 + mcpIdx) * 0.04;
        const segLen = (totalLen / 3) * (ext > 0.4 ? 1 : 0.48);

        const p1: [number, number] = [base[0] + Math.sin(angle) * segLen, base[1] - Math.cos(angle) * segLen];
        const p2: [number, number] = [p1[0] + Math.sin(angle) * (segLen * 0.9), p1[1] - Math.cos(angle) * (segLen * 0.9)];
        const p3: [number, number] = [p2[0] + Math.sin(angle) * (segLen * 0.8), p2[1] - Math.cos(angle) * (segLen * 0.8)];
        return [p1, p2, p3];
      };

      const [p6, p7, p8] = calculateFinger(5, curFingers[1], -0.12, 105);
      pts[6] = p6; pts[7] = p7; pts[8] = p8;

      const [p10, p11, p12] = calculateFinger(9, curFingers[2], 0.0, 118);
      pts[10] = p10; pts[11] = p11; pts[12] = p12;

      const [p14, p15, p16] = calculateFinger(13, curFingers[3], 0.12, 106);
      pts[14] = p14; pts[15] = p15; pts[16] = p16;

      const [p18, p19, p20] = calculateFinger(17, curFingers[4], 0.25, 88);
      pts[18] = p18; pts[19] = p19; pts[20] = p20;

      // 1. Draw Organic Semi-Transparent Human Hand Contour
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      ctx.quadraticCurveTo(pts[1][0], pts[1][1] + 15, pts[4][0], pts[4][1]);
      ctx.quadraticCurveTo(pts[5][0], pts[5][1], pts[8][0], pts[8][1]);
      ctx.quadraticCurveTo(pts[9][0], pts[9][1], pts[12][0], pts[12][1]);
      ctx.quadraticCurveTo(pts[13][0], pts[13][1], pts[16][0], pts[16][1]);
      ctx.quadraticCurveTo(pts[17][0], pts[17][1], pts[20][0], pts[20][1]);
      ctx.quadraticCurveTo(pts[17][0] - 20 * mirror, pts[17][1] + 60, pts[0][0], pts[0][1]);
      ctx.closePath();

      const palmGrad = ctx.createRadialGradient(0, 30, 10, 0, 30, 140);
      palmGrad.addColorStop(0, `rgba(${accentRGB}, 0.16)`);
      palmGrad.addColorStop(0.7, `rgba(${primaryRGB}, 0.06)`);
      palmGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = palmGrad;
      ctx.fill();

      // Subtle contour stroke
      ctx.strokeStyle = `rgba(${primaryRGB}, 0.25)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // 2. Draw 21-Landmark Skeletal Bones
      const bones: [number, number][] = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [5, 9], [9, 10], [10, 11], [11, 12],
        [9, 13], [13, 14], [14, 15], [15, 16],
        [13, 17], [17, 18], [18, 19], [19, 20],
        [0, 17]
      ];

      ctx.shadowBlur = 10;
      ctx.shadowColor = primaryColor;
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 2.4;

      for (const [s, e] of bones) {
        if (pts[s] && pts[e]) {
          ctx.beginPath();
          ctx.moveTo(pts[s][0], pts[s][1]);
          ctx.lineTo(pts[e][0], pts[e][1]);
          ctx.stroke();
        }
      }

      // 3. Draw Landmark Joint Nodes
      for (let i = 0; i < pts.length; i++) {
        const [px, py] = pts[i];
        const isFingertip = [4, 8, 12, 16, 20].includes(i);
        const radius = isFingertip ? 5.5 : 3.5;

        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle = isFingertip ? '#ffffff' : secondaryColor;
        ctx.fill();

        if (isFingertip) {
          ctx.beginPath();
          ctx.arc(px, py, radius + 3.5 + Math.sin(time * 3 + i) * 1.5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, 0.6)`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      ctx.shadowBlur = 0;

      // 4. Bounding Box & HUD Telemetry for this Hand
      const minX = Math.min(...pts.map((p) => p[0])) - 25;
      const maxX = Math.max(...pts.map((p) => p[0])) + 25;
      const minY = Math.min(...pts.map((p) => p[1])) - 25;
      const maxY = Math.max(...pts.map((p) => p[1])) + 20;

      const bLen = 16;
      ctx.strokeStyle = `rgba(${primaryRGB}, 0.55)`;
      ctx.lineWidth = 1.6;

      // Corners
      ctx.beginPath();
      ctx.moveTo(minX, minY + bLen); ctx.lineTo(minX, minY); ctx.lineTo(minX + bLen, minY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(maxX - bLen, minY); ctx.lineTo(maxX, minY); ctx.lineTo(maxX, minY + bLen);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(minX, maxY - bLen); ctx.lineTo(minX, maxY); ctx.lineTo(minX + bLen, maxY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(maxX - bLen, maxY); ctx.lineTo(maxX, maxY); ctx.lineTo(maxX, maxY - bLen);
      ctx.stroke();

      // Label
      ctx.fillStyle = `rgba(15, 23, 42, 0.85)`;
      ctx.fillRect(minX, minY - 24, 180, 20);
      ctx.strokeStyle = `rgba(${primaryRGB}, 0.3)`;
      ctx.strokeRect(minX, minY - 24, 180, 20);

      ctx.fillStyle = primaryColor;
      ctx.font = '700 9px monospace';
      ctx.fillText(`${label} [${(confidence * 100).toFixed(1)}%]`, minX + 6, minY - 10);

      ctx.restore();
    };

    const render = () => {
      time += 0.02;
      gestureTimer += 0.02;

      // Switch gestures periodically
      if (gestureTimer > 3.6) {
        gestureTimer = 0;
        hand1TargetIdx = (hand1TargetIdx + 1) % gestureLibrary.length;
        hand2TargetIdx = (hand2TargetIdx + 2) % gestureLibrary.length;
      }

      // Smooth finger articulation (lerp)
      const t1 = gestureLibrary[hand1TargetIdx].fingers;
      const t2 = gestureLibrary[hand2TargetIdx].fingers;
      for (let i = 0; i < 5; i++) {
        hand1Fingers[i] += (t1[i] - hand1Fingers[i]) * 0.08;
        hand2Fingers[i] += (t2[i] - hand2Fingers[i]) * 0.08;
      }

      ctx.clearRect(0, 0, width, height);

      // Deep dark cyber background
      ctx.fillStyle = '#060b14';
      ctx.fillRect(0, 0, width, height);

      // Ambient radial lighting
      const bgGrad = ctx.createRadialGradient(
        width * 0.5, height * 0.5, 80,
        width * 0.5, height * 0.5, Math.max(width, height) * 0.8
      );
      bgGrad.addColorStop(0, `rgba(${accentRGB}, 0.08)`);
      bgGrad.addColorStop(0.6, `rgba(${primaryRGB}, 0.03)`);
      bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 3D Perspective Grid at Bottom
      ctx.strokeStyle = `rgba(${primaryRGB}, 0.06)`;
      ctx.lineWidth = 1;
      const horizonY = height * 0.78;

      for (let x = -width; x < width * 2; x += 55) {
        ctx.beginPath();
        ctx.moveTo(width / 2, horizonY);
        ctx.lineTo(x + Math.sin(time * 0.4) * 20, height);
        ctx.stroke();
      }

      // Draw floating background particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${primaryRGB}, ${p.alpha})`;
        ctx.fill();
      }

      // Dynamic positions for Left and Right capturing hands
      const isMobile = width < 900;
      const handScale = isMobile ? Math.min(width / 950, 0.65) : 0.85;

      // Hand 1: Left Screen Region
      const h1X = isMobile ? width * 0.25 : width * 0.18 + Math.sin(time * 0.7) * 25;
      const h1Y = isMobile ? height * 0.28 : height * 0.5 + Math.cos(time * 0.6) * 35;
      const h1Rot = 0.12 + Math.sin(time * 0.5) * 0.08;

      drawHumanHand(
        h1X,
        h1Y,
        handScale,
        h1Rot,
        hand1Fingers,
        true,
        `HAND_L:${gestureLibrary[hand1TargetIdx].name}`,
        0.994
      );

      // Hand 2: Right Screen Region
      const h2X = isMobile ? width * 0.75 : width * 0.82 + Math.cos(time * 0.8) * 25;
      const h2Y = isMobile ? height * 0.75 : height * 0.48 + Math.sin(time * 0.5) * 35;
      const h2Rot = -0.15 + Math.cos(time * 0.6) * 0.08;

      drawHumanHand(
        h2X,
        h2Y,
        handScale,
        h2Rot,
        hand2Fingers,
        false,
        `HAND_R:${gestureLibrary[hand2TargetIdx].name}`,
        0.988
      );

      // Scanning Laser Beam across screen
      const scanY = ((time * 50) % (height + 120)) - 60;
      const scanGrad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      scanGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      scanGrad.addColorStop(0.5, `rgba(${primaryRGB}, 0.14)`);
      scanGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 30, width, 60);

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
      {/* Real-time Human Hand Gesture Motion Capture Canvas */}
      <canvas ref={canvasRef} className="motion-bg-canvas" />

      {/* Top Vision Capture HUD Overlay */}
      <div className="motion-capture-hud">
        <div className="hud-rec-indicator">
          <span className="rec-dot"></span>
          <span>REC [VISION_AI_CAM_01]</span>
        </div>
        <div className="hud-telemetry">
          <span>60 FPS</span>
          <span className="hud-sep">•</span>
          <span>1080P 30FPS</span>
          <span className="hud-sep">•</span>
          <span>MEDIAPIPE HOLISTIC</span>
        </div>
      </div>

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

      {/* Subtle Central Vignette so centered card pops cleanly */}
      <div className="motion-bg-overlay" />
    </div>
  );
};
