import React, { useRef, useEffect } from 'react';
import { RhythmNode, TRACK_CONFIG } from '../types';
import { audioService } from '../services/audioService';

interface Props {
  nodes: RhythmNode[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}

export const WaveformVisualizer: React.FC<Props> = ({ nodes, currentTime, duration, isPlaying }) => {
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

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Current time line at top (the "now" line)
    const nowY = 40;

    // Draw "NOW" indicator
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(0, nowY - 1, w, 2);
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 10;
    ctx.fillRect(0, nowY - 1, w, 2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('NOW ' + currentTime.toFixed(2) + 's', 8, nowY - 6);

    // Waveform rendering - time flows downward (past below, future above)
    // Each node generates a waveform "burst" at its timestamp
    const trackTypes = ['KICK', 'BASS', 'SNARE', 'CRASH'] as const;
    const pixelsPerSecond = (h - nowY - 20) / duration;

    // Time grid lines
    for (let t = 0; t <= duration; t += 0.5) {
      const y = nowY + (currentTime - t) * pixelsPerSecond;
      if (y < nowY || y > h) continue;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(t.toFixed(1) + 's', w - 5, y - 3);
    }

    // Draw waveforms for each node
    nodes.forEach(node => {
      const trackIdx = trackTypes.indexOf(node.type);
      if (trackIdx === -1) return;
      const config = TRACK_CONFIG[trackIdx];

      // Position in waterfall (how far below "NOW" line)
      const timeDiff = currentTime - node.timestamp;
      const centerY = nowY + timeDiff * pixelsPerSecond;

      if (centerY < -50 || centerY > h + 50) return;

      // Waveform parameters based on type
      const freqMultiplier = node.type === 'KICK' ? 2 : node.type === 'BASS' ? 3 : node.type === 'SNARE' ? 8 : 15;
      const amplitude = node.intensity * 60;
      const waveWidth = w * 0.7;
      const startX = (w - waveWidth) / 2 + trackIdx * 15;

      // Decay: waveform fades as it moves away from "NOW"
      const distance = Math.abs(timeDiff);
      const decay = Math.max(0, 1 - distance * 2);
      if (decay <= 0) return;

      // Active glow
      const isActive = distance < 0.15 && isPlaying;

      ctx.beginPath();
      ctx.moveTo(startX, centerY);

      for (let px = 0; px < waveWidth; px++) {
        const t = px / waveWidth;
        const envelope = Math.sin(t * Math.PI); // Bell curve envelope
        const wave = Math.sin(t * Math.PI * 2 * freqMultiplier) * envelope * amplitude * decay;
        ctx.lineTo(startX + px, centerY + wave);
      }

      ctx.strokeStyle = config.color;
      ctx.lineWidth = isActive ? 3 : 1.5;
      ctx.globalAlpha = decay * (isActive ? 1 : 0.7);

      if (isActive) {
        ctx.shadowColor = config.color;
        ctx.shadowBlur = 20;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Mirror waveform (inverted)
      ctx.beginPath();
      ctx.moveTo(startX, centerY);
      for (let px = 0; px < waveWidth; px++) {
        const t = px / waveWidth;
        const envelope = Math.sin(t * Math.PI);
        const wave = -Math.sin(t * Math.PI * 2 * freqMultiplier) * envelope * amplitude * decay * 0.5;
        ctx.lineTo(startX + px, centerY + wave);
      }
      ctx.strokeStyle = config.color + '60';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.globalAlpha = 1;

      // Label for active node
      if (isActive) {
        ctx.fillStyle = config.color;
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(node.label, startX + waveWidth + 8, centerY + 4);
      }
    });

    // Track legend at the top right
    trackTypes.forEach((type, i) => {
      const config = TRACK_CONFIG[i];
      const ly = 12 + i * 16;
      const lx = w - 120;

      ctx.fillStyle = config.color;
      ctx.fillRect(lx, ly - 4, 8, 8);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(config.label, lx + 14, ly + 4);
    });

  }, [currentTime, duration, nodes, isPlaying]);

  return (
    <div className="w-full h-full bg-surface-900 border border-surface-700 rounded-xl overflow-hidden">
      <canvas ref={canvasRef} width={800} height={500} className="w-full h-full" />
    </div>
  );
};
