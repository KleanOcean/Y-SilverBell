import React, { useMemo, useEffect, useRef } from 'react';
import { RhythmNode } from '../types';
import { Footprints, Activity, Move, Zap } from 'lucide-react';
import { audioService } from '../services/audioService';

interface Props {
  nodes: RhythmNode[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  compact?: boolean;
}

export const RhythmVisualizer: React.FC<Props> = ({ nodes, currentTime, duration, isPlaying, compact = false }) => {
  const scheduledRef = useRef(false);
  const startTimeRef = useRef(0);

  const tracks = [
    { type: 'KICK', label: 'Legs / Ground', color: 'bg-neon-purple', icon: Footprints },
    { type: 'BASS', label: 'Hips / Core', color: 'bg-blue-500', icon: Activity },
    { type: 'SNARE', label: 'Shoulders', color: 'bg-neon-green', icon: Move },
    { type: 'CRASH', label: 'Racket / Arm', color: 'bg-neon-blue', icon: Zap },
  ];

  const progressPercent = (currentTime / duration) * 100;

  // Schedule audio with precise Web Audio API timing
  useEffect(() => {
    if (isPlaying && !scheduledRef.current) {
      // Schedule all sounds when playback starts
      const scheduledSounds = nodes.map(node => ({
        id: node.id,
        type: node.type,
        time: node.timestamp,
        intensity: node.intensity || 0.7 // Use node intensity or default
      }));

      audioService.scheduleSounds(scheduledSounds, currentTime);
      scheduledRef.current = true;
      startTimeRef.current = currentTime;
    }

    // Clear scheduled sounds when paused
    if (!isPlaying) {
      audioService.clearScheduledSounds();
      scheduledRef.current = false;
    }
  }, [isPlaying, nodes]); // Removed currentTime to prevent update loop

  return (
    <div className={`w-full bg-surface-900 border border-surface-700 rounded-xl overflow-hidden relative shadow-2xl ${compact ? 'h-48' : 'h-full'}`}>
      
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(to right, #334155 1px, transparent 1px)', backgroundSize: '10% 100%' }}>
      </div>

      {/* Playhead */}
      <div 
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 transition-all duration-75 ease-linear shadow-[0_0_10px_rgba(239,68,68,0.8)]"
        style={{ left: `${progressPercent}%` }}
      />

      <div className="flex flex-col h-full justify-evenly py-4">
        {tracks.map((track) => {
          const trackNodes = nodes.filter(n => n.type === track.type);
          const Icon = track.icon;

          return (
            <div key={track.type} className="relative h-12 w-full flex items-center group">
              {/* Track Label */}
              <div className="w-32 px-4 flex items-center gap-2 text-xs font-mono text-slate-400 border-r border-surface-700 bg-surface-900/80 z-20">
                <Icon size={14} className={track.color.replace('bg-', 'text-')} />
                <span className="truncate">{track.label}</span>
              </div>

              {/* Track Lane */}
              <div className="flex-1 h-full relative mx-2 bg-surface-800/30 rounded">
                {trackNodes.map((node) => {
                  const position = (node.timestamp / duration) * 100;
                  const isActive = Math.abs(currentTime - node.timestamp) < 0.15;
                  
                  return (
                    <div
                      key={node.id}
                      className={`absolute top-1 bottom-1 w-2 rounded-full transform -translate-x-1/2 transition-all duration-100 
                        ${track.color} ${isActive && isPlaying ? 'scale-150 brightness-150 blur-sm' : 'opacity-70'}
                      `}
                      style={{ left: `${position}%` }}
                    >
                      {/* Glow effect on hit */}
                      {isActive && isPlaying && (
                        <div className={`absolute inset-0 animate-ping rounded-full ${track.color}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
