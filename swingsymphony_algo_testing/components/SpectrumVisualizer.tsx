import React, { useRef, useEffect } from 'react';
import { RhythmNode, TRACK_CONFIG } from '../types';
import { audioService } from '../services/audioService';

interface Props {
  nodes: RhythmNode[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}

export const SpectrumVisualizer: React.FC<Props> = ({ nodes, currentTime, duration, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levelsRef = useRef<number[]>([0, 0, 0, 0]);
  const peaksRef = useRef<number[]>([0, 0, 0, 0]);
  const peakDecayRef = useRef<number[]>([0, 0, 0, 0]);
  const animFrameRef = useRef<number>();
  const lastTimeRef = useRef(0);
  const scheduledRef = useRef(false);

  useEffect(() => {
    if (isPlaying && !scheduledRef.current) {
      const scheduledSounds = nodes.map(node => ({
        id: node.id, type: node.type, time: node.timestamp, intensity: node.intensity || 0.7
      }));
      audioService.scheduleSounds(scheduledSounds, currentTime);
      scheduledRef.current = true;
    }
    if (!isPlaying) {
      audioService.clearScheduledSounds();
      scheduledRef.current = false;
    }
  }, [isPlaying, nodes]);

  // Update levels based on current time proximity to nodes
  useEffect(() => {
    const trackTypes = ['KICK', 'BASS', 'SNARE', 'CRASH'] as const;
    const newLevels = [0, 0, 0, 0];

    nodes.forEach(node => {
      const trackIdx = trackTypes.indexOf(node.type);
      if (trackIdx === -1) return;

      const timeDiff = currentTime - node.timestamp;
      if (timeDiff >= -0.05 && timeDiff < 0.5) {
        // Attack + decay envelope
        let envelope: number;
        if (timeDiff < 0.05) {
          envelope = node.intensity; // Attack: instant
        } else {
          envelope = node.intensity * Math.exp(-timeDiff * 4); // Exponential decay
        }
        newLevels[trackIdx] = Math.max(newLevels[trackIdx], envelope);
      }
    });

    levelsRef.current = newLevels;

    // Update peaks
    newLevels.forEach((level, i) => {
      if (level > peaksRef.current[i]) {
        peaksRef.current[i] = level;
        peakDecayRef.current[i] = 0;
      }
    });
  }, [currentTime, nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      const barAreaTop = 40;
      const barAreaBottom = h - 80;
      const barAreaHeight = barAreaBottom - barAreaTop;

      for (let pct = 0; pct <= 100; pct += 25) {
        const y = barAreaBottom - (pct / 100) * barAreaHeight;
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(w - 40, y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#475569';
        ctx.font = '9px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(pct + '%', 35, y + 3);
      }

      const trackTypes = ['KICK', 'BASS', 'SNARE', 'CRASH'] as const;
      const totalBars = 4;
      const barGap = 30;
      const totalBarWidth = w - 100;
      const barWidth = (totalBarWidth - barGap * (totalBars - 1)) / totalBars;
      const startX = 50;

      trackTypes.forEach((type, i) => {
        const config = TRACK_CONFIG[i];
        const level = levelsRef.current[i];
        const barHeight = level * barAreaHeight;
        const x = startX + i * (barWidth + barGap);
        const barTop = barAreaBottom - barHeight;

        // Bar gradient
        const grad = ctx.createLinearGradient(x, barAreaBottom, x, barTop);
        grad.addColorStop(0, config.color + '80');
        grad.addColorStop(0.5, config.color + 'cc');
        grad.addColorStop(1, config.color);

        // Bar with rounded top
        const radius = Math.min(8, barWidth / 2);
        if (barHeight > radius) {
          ctx.beginPath();
          ctx.moveTo(x, barAreaBottom);
          ctx.lineTo(x, barTop + radius);
          ctx.arcTo(x, barTop, x + radius, barTop, radius);
          ctx.arcTo(x + barWidth, barTop, x + barWidth, barTop + radius, radius);
          ctx.lineTo(x + barWidth, barAreaBottom);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();
        } else if (barHeight > 2) {
          ctx.fillStyle = grad;
          ctx.fillRect(x, barTop, barWidth, barHeight);
        }

        // Glow effect
        if (level > 0.3) {
          ctx.shadowColor = config.color;
          ctx.shadowBlur = level * 30;
          ctx.fillStyle = config.color + '20';
          ctx.fillRect(x - 5, barTop - 5, barWidth + 10, barHeight + 10);
          ctx.shadowBlur = 0;
        }

        // Mirror reflection
        const mirrorHeight = Math.min(barHeight * 0.3, 40);
        const mirrorGrad = ctx.createLinearGradient(x, barAreaBottom, x, barAreaBottom + mirrorHeight);
        mirrorGrad.addColorStop(0, config.color + '30');
        mirrorGrad.addColorStop(1, config.color + '00');
        ctx.fillStyle = mirrorGrad;
        ctx.fillRect(x, barAreaBottom + 2, barWidth, mirrorHeight);

        // Peak indicator
        peakDecayRef.current[i] += dt;
        if (peakDecayRef.current[i] > 1) {
          peaksRef.current[i] = Math.max(peaksRef.current[i] - dt * 0.3, levelsRef.current[i]);
        }
        const peakY = barAreaBottom - peaksRef.current[i] * barAreaHeight;
        if (peaksRef.current[i] > 0.02) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, peakY - 2, barWidth, 3);
        }

        // Label below bar
        ctx.fillStyle = config.color;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(config.label, x + barWidth / 2, barAreaBottom + mirrorHeight + 24);

        // Intensity value
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText((level * 100).toFixed(0) + '%', x + barWidth / 2, barAreaBottom + mirrorHeight + 40);
      });

      // Title
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('KINETIC CHAIN SPECTRUM', w / 2, 24);

      // Progress bar at bottom
      const progY = h - 20;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(50, progY, w - 100, 6);
      const progress = currentTime / duration;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(50, progY, (w - 100) * progress, 6);

      // Time label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(currentTime.toFixed(2) + 's', 50, progY - 4);
      ctx.textAlign = 'right';
      ctx.fillText(duration.toFixed(1) + 's', w - 50, progY - 4);

      animFrameRef.current = requestAnimationFrame(draw);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [currentTime, duration]);

  // Reset on stop
  useEffect(() => {
    if (!isPlaying) {
      levelsRef.current = [0, 0, 0, 0];
      peaksRef.current = [0, 0, 0, 0];
      peakDecayRef.current = [0, 0, 0, 0];
    }
  }, [isPlaying]);

  return (
    <div className="w-full h-full bg-surface-900 border border-surface-700 rounded-xl overflow-hidden">
      <canvas ref={canvasRef} width={800} height={500} className="w-full h-full" />
    </div>
  );
};
