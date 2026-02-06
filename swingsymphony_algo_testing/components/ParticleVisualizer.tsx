import React, { useRef, useEffect, useCallback } from 'react';
import { RhythmNode, TRACK_CONFIG } from '../types';
import { audioService } from '../services/audioService';

interface Props {
  nodes: RhythmNode[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'circle' | 'square' | 'triangle' | 'star';
}

export const ParticleVisualizer: React.FC<Props> = ({ nodes, currentTime, duration, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastSpawnedRef = useRef<Set<string>>(new Set());
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

  const spawnParticles = useCallback((node: RhythmNode, canvasWidth: number, canvasHeight: number) => {
    const trackIdx = (['KICK', 'BASS', 'SNARE', 'CRASH'] as const).indexOf(node.type);
    const config = TRACK_CONFIG[trackIdx];
    const count = Math.floor(node.intensity * 40) + 10;
    const baseSpeed = node.intensity * 250 + 50;

    // Emitter positions: spaced vertically on the left third
    const emitterX = canvasWidth * 0.15;
    const emitterY = canvasHeight * (0.2 + trackIdx * 0.2);

    const shapes: Array<'circle' | 'square' | 'triangle' | 'star'> = ['circle', 'square', 'triangle', 'star'];

    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.3) * Math.PI; // Mostly rightward
      const speed = baseSpeed * (0.5 + Math.random() * 0.5);
      const life = node.intensity * 1.5 + 0.5;

      newParticles.push({
        x: emitterX + (Math.random() - 0.5) * 20,
        y: emitterY + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + (node.type === 'KICK' ? 50 : node.type === 'CRASH' ? -80 : 0),
        life,
        maxLife: life,
        color: config.color,
        size: node.type === 'KICK' ? 6 + Math.random() * 4 :
              node.type === 'BASS' ? 4 + Math.random() * 3 :
              node.type === 'SNARE' ? 3 + Math.random() * 2 :
              2 + Math.random() * 2,
        type: shapes[trackIdx],
      });
    }

    particlesRef.current.push(...newParticles);
  }, []);

  // Check for nodes that should trigger
  useEffect(() => {
    if (!isPlaying) {
      lastSpawnedRef.current.clear();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    nodes.forEach(node => {
      const isHit = Math.abs(currentTime - node.timestamp) < 0.08;
      if (isHit && !lastSpawnedRef.current.has(node.id)) {
        lastSpawnedRef.current.add(node.id);
        spawnParticles(node, canvas.width, canvas.height);
      }
    });
  }, [currentTime, isPlaying, nodes, spawnParticles]);

  // Reset spawned set when playback restarts
  useEffect(() => {
    if (!isPlaying) {
      lastSpawnedRef.current.clear();
    }
  }, [isPlaying]);

  // Animation loop for particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      // Semi-transparent clear for trail effect
      ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      const alive: Particle[] = [];
      for (const p of particlesRef.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 30 * dt; // Slight gravity
        p.life -= dt;

        if (p.life <= 0) continue;
        alive.push(p);

        const alpha = Math.max(0, p.life / p.maxLife);
        const size = p.size * (0.5 + alpha * 0.5);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = alpha * 15;

        if (p.type === 'circle') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'square') {
          ctx.fillRect(p.x - size, p.y - size, size * 2, size * 2);
        } else if (p.type === 'triangle') {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - size);
          ctx.lineTo(p.x - size, p.y + size);
          ctx.lineTo(p.x + size, p.y + size);
          ctx.closePath();
          ctx.fill();
        } else {
          // Star
          ctx.beginPath();
          for (let j = 0; j < 5; j++) {
            const angle = (j * Math.PI * 2) / 5 - Math.PI / 2;
            const r = j % 2 === 0 ? size : size * 0.4;
            const sx = p.x + Math.cos(angle) * r;
            const sy = p.y + Math.sin(angle) * r;
            j === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
          }
          ctx.closePath();
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      particlesRef.current = alive;

      // Draw emitter labels
      const trackTypes = ['KICK', 'BASS', 'SNARE', 'CRASH'] as const;
      trackTypes.forEach((type, i) => {
        const config = TRACK_CONFIG[i];
        const ey = canvas.height * (0.2 + i * 0.2);

        // Emitter dot
        ctx.beginPath();
        ctx.arc(canvas.width * 0.15, ey, 8, 0, Math.PI * 2);
        ctx.fillStyle = config.color + '40';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(canvas.width * 0.15, ey, 4, 0, Math.PI * 2);
        ctx.fillStyle = config.color;
        ctx.fill();

        // Label
        ctx.fillStyle = config.color + 'aa';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(config.label, canvas.width * 0.15, ey + 22);
      });

      // Progress bar at bottom
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, canvas.height - 6, canvas.width, 6);
      const progress = currentTime / duration;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(0, canvas.height - 6, canvas.width * progress, 6);

      animFrameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [currentTime, duration]);

  // Clear particles when not playing
  useEffect(() => {
    if (!isPlaying) {
      particlesRef.current = [];
    }
  }, [isPlaying]);

  return (
    <div className="w-full h-full bg-surface-900 border border-surface-700 rounded-xl overflow-hidden">
      <canvas ref={canvasRef} width={800} height={500} className="w-full h-full" />
    </div>
  );
};
