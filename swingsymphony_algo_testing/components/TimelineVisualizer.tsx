import React, { useEffect, useRef } from 'react';
import { RhythmNode, TRACK_CONFIG } from '../types';
import { audioService } from '../services/audioService';
import { Footprints, Activity, Move, Zap } from 'lucide-react';

interface Props {
  nodes: RhythmNode[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}

const ICONS = [Footprints, Activity, Move, Zap];

export const TimelineVisualizer: React.FC<Props> = ({ nodes, currentTime, duration, isPlaying }) => {
  const scheduledRef = useRef(false);
  const progressPercent = (currentTime / duration) * 100;

  useEffect(() => {
    if (isPlaying && !scheduledRef.current) {
      const scheduledSounds = nodes.map(node => ({
        id: node.id,
        type: node.type,
        time: node.timestamp,
        intensity: node.intensity || 0.7
      }));
      audioService.scheduleSounds(scheduledSounds, currentTime);
      scheduledRef.current = true;
    }
    if (!isPlaying) {
      audioService.clearScheduledSounds();
      scheduledRef.current = false;
    }
  }, [isPlaying, nodes]);

  return (
    <div className="w-full h-full bg-surface-900 border border-surface-700 rounded-xl overflow-hidden relative">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
           style={{ backgroundImage: 'linear-gradient(to right, #334155 1px, transparent 1px)', backgroundSize: '10% 100%' }} />

      {/* Playhead */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 transition-all duration-75 ease-linear"
        style={{ left: `${progressPercent}%`, boxShadow: '0 0 10px rgba(239,68,68,0.8)' }}
      />

      <div className="flex flex-col h-full justify-evenly py-4">
        {TRACK_CONFIG.map((track, trackIndex) => {
          const trackNodes = nodes.filter(n => n.type === track.type);
          const Icon = ICONS[trackIndex];

          return (
            <div key={track.type} className="relative h-12 w-full flex items-center group">
              <div className="w-32 px-4 flex items-center gap-2 text-xs font-mono text-slate-400 border-r border-surface-700 bg-surface-900/80 z-20">
                <Icon size={14} style={{ color: track.color }} />
                <span className="truncate">{track.label}</span>
              </div>

              <div className="flex-1 h-full relative mx-2 bg-surface-800/30 rounded">
                {trackNodes.map((node) => {
                  const position = (node.timestamp / duration) * 100;
                  const isActive = Math.abs(currentTime - node.timestamp) < 0.15;

                  return (
                    <div
                      key={node.id}
                      className="absolute top-1 bottom-1 w-2 rounded-full transform -translate-x-1/2 transition-all duration-100"
                      style={{
                        left: `${position}%`,
                        backgroundColor: track.color,
                        opacity: isActive && isPlaying ? 1 : 0.7,
                        transform: `translateX(-50%) ${isActive && isPlaying ? 'scale(1.5)' : 'scale(1)'}`,
                        filter: isActive && isPlaying ? 'brightness(1.5) blur(2px)' : 'none',
                      }}
                    >
                      {isActive && isPlaying && (
                        <div className="absolute inset-0 animate-ping rounded-full" style={{ backgroundColor: track.color }} />
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
