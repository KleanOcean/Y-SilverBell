import React, { useRef, useEffect } from 'react';
import { RhythmNode, TRACK_CONFIG } from '../types';
import { audioService } from '../services/audioService';

interface Props {
  nodes: RhythmNode[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}

export const RadarVisualizer: React.FC<Props> = ({ nodes, currentTime, duration, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(cx, cy) - 30;

    ctx.clearRect(0, 0, w, h);

    // Background circle
    ctx.beginPath();
    ctx.arc(cx, cy, maxR + 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fill();

    // Draw concentric rings for each track
    const ringWidths = [0.25, 0.5, 0.75, 1.0];
    const trackTypes: Array<'KICK' | 'BASS' | 'SNARE' | 'CRASH'> = ['KICK', 'BASS', 'SNARE', 'CRASH'];

    trackTypes.forEach((type, i) => {
      const r = maxR * ringWidths[i];
      const config = TRACK_CONFIG[i];

      // Ring outline
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = config.color + '30';
      ctx.lineWidth = 20;
      ctx.stroke();

      // Ring label
      ctx.fillStyle = config.color + '80';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(config.label, cx - r - 14, cy + 3);
    });

    // Draw rhythm nodes as arcs
    nodes.forEach(node => {
      const trackIdx = trackTypes.indexOf(node.type);
      if (trackIdx === -1) return;
      const config = TRACK_CONFIG[trackIdx];
      const r = maxR * ringWidths[trackIdx];
      const angle = (node.timestamp / duration) * Math.PI * 2 - Math.PI / 2;
      const arcSize = node.intensity * 0.15;
      const isActive = Math.abs(currentTime - node.timestamp) < 0.15;

      ctx.beginPath();
      ctx.arc(cx, cy, r, angle - arcSize, angle + arcSize);
      ctx.strokeStyle = config.color;
      ctx.lineWidth = isActive && isPlaying ? 24 : 16;
      ctx.lineCap = 'round';
      ctx.stroke();

      if (isActive && isPlaying) {
        // Ripple effect
        for (let ring = 1; ring <= 3; ring++) {
          ctx.beginPath();
          ctx.arc(cx, cy, r + ring * 8, angle - arcSize * 0.5, angle + arcSize * 0.5);
          ctx.strokeStyle = config.color + Math.floor(60 / ring).toString(16).padStart(2, '0');
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      }
    });

    // Sweep line (current time indicator)
    const sweepAngle = (currentTime / duration) * Math.PI * 2 - Math.PI / 2;

    // Sweep trail (fading arc)
    const trailLength = 0.3; // radians
    const gradient = ctx.createConicGradient(sweepAngle - trailLength, cx, cy);
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0)');
    gradient.addColorStop(trailLength / (Math.PI * 2), 'rgba(239, 68, 68, 0.3)');
    gradient.addColorStop(trailLength / (Math.PI * 2) + 0.001, 'rgba(239, 68, 68, 0)');

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, maxR + 5, sweepAngle - trailLength, sweepAngle);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Sweep line
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(sweepAngle) * (maxR + 5),
      cy + Math.sin(sweepAngle) * (maxR + 5)
    );
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Sweep dot at tip
    ctx.beginPath();
    ctx.arc(
      cx + Math.cos(sweepAngle) * (maxR + 5),
      cy + Math.sin(sweepAngle) * (maxR + 5),
      4, 0, Math.PI * 2
    );
    ctx.fillStyle = '#ef4444';
    ctx.fill();

    // Center circle with time display
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentTime.toFixed(1) + 's', cx, cy);

  }, [currentTime, duration, nodes, isPlaying]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-surface-900 border border-surface-700 rounded-xl overflow-hidden">
      <canvas ref={canvasRef} width={500} height={500} className="max-w-full max-h-full" />
    </div>
  );
};
