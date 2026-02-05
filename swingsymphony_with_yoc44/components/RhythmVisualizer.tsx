import React, { useMemo, useEffect, useRef, useCallback, useState } from 'react';
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

// DEBUG: Extensive logging for playhead synchronization investigation
const DEBUG_PLAYHEAD = true;
let debugLogCount = 0;
const MAX_DEBUG_LOGS = 100; // Limit logs to prevent console spam

const debugLog = (message: string, data?: any) => {
  if (!DEBUG_PLAYHEAD) return;
  if (debugLogCount >= MAX_DEBUG_LOGS) {
    if (debugLogCount === MAX_DEBUG_LOGS) {
      console.warn('[RhythmVisualizer DEBUG] Max log count reached, stopping logs');
      debugLogCount++;
    }
    return;
  }
  debugLogCount++;
  const timestamp = performance.now().toFixed(2);
  console.log(`[RhythmVisualizer DEBUG ${timestamp}ms] ${message}`, data !== undefined ? data : '');
};

export const RhythmVisualizer: React.FC<Props> = ({ nodes, currentTime, duration, isPlaying, compact = false }) => {
  const scheduledRef = useRef(false);
  const startTimeRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const trackLaneRef = useRef<HTMLDivElement>(null);

  // DEBUG: Track render count
  const renderCountRef = useRef(0);
  renderCountRef.current++;

  // DEBUG: Store previous values for comparison
  const prevCurrentTimeRef = useRef(currentTime);
  const prevIsPlayingRef = useRef(isPlaying);

  const tracks = [
    { type: 'KICK', label: 'Legs / Ground', color: 'bg-neon-purple', icon: Footprints },
    { type: 'BASS', label: 'Hips / Core', color: 'bg-blue-500', icon: Activity },
    { type: 'SNARE', label: 'Shoulders', color: 'bg-neon-green', icon: Move },
    { type: 'CRASH', label: 'Racket / Arm', color: 'bg-neon-blue', icon: Zap },
  ];

  const progressPercent = (currentTime / duration) * 100;

  // DEBUG: Log on every render with timing info
  useEffect(() => {
    const timeDelta = currentTime - prevCurrentTimeRef.current;
    const playingChanged = isPlaying !== prevIsPlayingRef.current;

    debugLog(`RENDER #${renderCountRef.current}`, {
      currentTime: currentTime.toFixed(4),
      duration,
      progressPercent: progressPercent.toFixed(4) + '%',
      isPlaying,
      timeDelta: timeDelta.toFixed(6),
      playingChanged,
      scheduledRef: scheduledRef.current,
    });

    prevCurrentTimeRef.current = currentTime;
    prevIsPlayingRef.current = isPlaying;
  });

  // DEBUG: Measure container and playhead positions
  useEffect(() => {
    if (containerRef.current && playheadRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const playheadRect = playheadRef.current.getBoundingClientRect();
      const computedLeft = parseFloat(playheadRef.current.style.left || '0');

      debugLog('PLAYHEAD POSITION CHECK', {
        containerWidth: containerRect.width,
        containerLeft: containerRect.left,
        playheadLeft: playheadRect.left,
        playheadRelativeLeft: playheadRect.left - containerRect.left,
        computedLeftPercent: computedLeft.toFixed(2) + '%',
        expectedPixelLeft: (computedLeft / 100) * containerRect.width,
        actualPlayheadLeftPx: playheadRect.left - containerRect.left,
        currentTime: currentTime.toFixed(4),
      });
    }
  }, [currentTime, progressPercent]);

  // DEBUG: Check track lane positioning
  useEffect(() => {
    if (trackLaneRef.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const trackLaneRect = trackLaneRef.current.getBoundingClientRect();

      debugLog('TRACK LANE OFFSET ANALYSIS', {
        containerWidth: containerRect.width,
        trackLaneWidth: trackLaneRect.width,
        trackLaneOffsetFromContainer: trackLaneRect.left - containerRect.left,
        labelAreaWidth: trackLaneRect.left - containerRect.left,
        // This is the KEY issue - playhead is % of container, but nodes are % of trackLane
        playheadVsNodeOffset: 'If labelAreaWidth > 0, playhead and nodes are misaligned!',
      });
    }
  }, []);

  // Schedule audio with precise Web Audio API timing
  useEffect(() => {
    debugLog('AUDIO SCHEDULING EFFECT', {
      isPlaying,
      scheduledRefCurrent: scheduledRef.current,
      nodesCount: nodes.length,
      currentTime: currentTime.toFixed(4),
    });

    if (isPlaying && !scheduledRef.current) {
      debugLog('SCHEDULING SOUNDS - Starting playback', {
        currentTime: currentTime.toFixed(4),
        startTimeRef: startTimeRef.current,
      });

      // Schedule all sounds when playback starts
      const scheduledSounds = nodes.map(node => ({
        id: node.id,
        type: node.type,
        time: node.timestamp,
        intensity: node.intensity || 0.7 // Use node intensity or default
      }));

      debugLog('SCHEDULED SOUNDS LIST', scheduledSounds.map(s => ({
        id: s.id,
        type: s.type,
        time: s.time.toFixed(4),
      })));

      audioService.scheduleSounds(scheduledSounds, currentTime);
      scheduledRef.current = true;
      startTimeRef.current = currentTime;

      debugLog('SOUNDS SCHEDULED', {
        count: scheduledSounds.length,
        startTimeRef: startTimeRef.current,
      });
    }

    // Clear scheduled sounds when paused
    if (!isPlaying) {
      if (scheduledRef.current) {
        debugLog('CLEARING SCHEDULED SOUNDS - Playback paused');
      }
      audioService.clearScheduledSounds();
      scheduledRef.current = false;
    }
  }, [isPlaying, nodes]); // Removed currentTime to prevent update loop

  // DEBUG: Log on unmount
  useEffect(() => {
    return () => {
      debugLog('COMPONENT UNMOUNTING');
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full bg-surface-900 border border-surface-700 rounded-xl overflow-hidden relative shadow-2xl ${compact ? 'h-48' : 'h-full'}`}
    >

      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
           style={{ backgroundImage: 'linear-gradient(to right, #334155 1px, transparent 1px)', backgroundSize: '10% 100%' }}>
      </div>

      {/* Playhead - DEBUG: This uses left% relative to ENTIRE container */}
      <div
        ref={playheadRef}
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 transition-all duration-75 ease-linear shadow-[0_0_10px_rgba(239,68,68,0.8)]"
        style={{ left: `${progressPercent}%` }}
        data-debug-progress={progressPercent.toFixed(4)}
        data-debug-current-time={currentTime.toFixed(4)}
      />

      {/* DEBUG: Visual marker at label boundary (128px = w-32) */}
      {DEBUG_PLAYHEAD && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-yellow-500 z-40 opacity-50"
          style={{ left: '128px' }}
          title="DEBUG: Label boundary at 128px (w-32)"
        />
      )}

      <div className="flex flex-col h-full justify-evenly py-4">
        {tracks.map((track, trackIndex) => {
          const trackNodes = nodes.filter(n => n.type === track.type);
          const Icon = track.icon;

          return (
            <div key={track.type} className="relative h-12 w-full flex items-center group">
              {/* Track Label */}
              <div className="w-32 px-4 flex items-center gap-2 text-xs font-mono text-slate-400 border-r border-surface-700 bg-surface-900/80 z-20">
                <Icon size={14} className={track.color.replace('bg-', 'text-')} />
                <span className="truncate">{track.label}</span>
              </div>

              {/* Track Lane - DEBUG: Nodes are positioned as % of THIS element, not container */}
              <div
                ref={trackIndex === 0 ? trackLaneRef : undefined}
                className="flex-1 h-full relative mx-2 bg-surface-800/30 rounded"
              >
                {trackNodes.map((node, nodeIndex) => {
                  const position = (node.timestamp / duration) * 100;
                  const isActive = Math.abs(currentTime - node.timestamp) < 0.15;

                  // DEBUG: Log active node hits
                  if (isActive && isPlaying && nodeIndex === 0) {
                    debugLog(`NODE HIT on track ${track.type}`, {
                      nodeId: node.id,
                      nodeTimestamp: node.timestamp.toFixed(4),
                      currentTime: currentTime.toFixed(4),
                      timeDiff: (currentTime - node.timestamp).toFixed(6),
                      nodePosition: position.toFixed(4) + '%',
                      playheadPosition: progressPercent.toFixed(4) + '%',
                    });
                  }

                  return (
                    <div
                      key={node.id}
                      className={`absolute top-1 bottom-1 w-2 rounded-full transform -translate-x-1/2 transition-all duration-100
                        ${track.color} ${isActive && isPlaying ? 'scale-150 brightness-150 blur-sm' : 'opacity-70'}
                      `}
                      style={{ left: `${position}%` }}
                      data-debug-node-id={node.id}
                      data-debug-timestamp={node.timestamp.toFixed(4)}
                      data-debug-position={position.toFixed(4)}
                    >
                      {/* Glow effect on hit */}
                      {isActive && isPlaying && (
                        <div className={`absolute inset-0 animate-ping rounded-full ${track.color}`} />
                      )}
                    </div>
                  );
                })}

                {/* DEBUG: Show a marker where the playhead SHOULD be if it accounted for label offset */}
                {DEBUG_PLAYHEAD && trackIndex === 0 && (
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-green-500 z-50 opacity-75"
                    style={{ left: `${progressPercent}%` }}
                    title={`DEBUG: Correct playhead position for track lane at ${progressPercent.toFixed(2)}%`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DEBUG: Info overlay */}
      {DEBUG_PLAYHEAD && (
        <div className="absolute top-2 right-2 bg-black/80 text-xs text-white font-mono p-2 rounded z-50 max-w-xs">
          <div>Time: {currentTime.toFixed(3)}s</div>
          <div>Progress: {progressPercent.toFixed(2)}%</div>
          <div>Duration: {duration}s</div>
          <div>Playing: {isPlaying ? 'YES' : 'NO'}</div>
          <div className="text-yellow-400 mt-1">Label offset = 128px (w-32)</div>
          <div className="text-red-400">Red line = container %</div>
          <div className="text-green-400">Green line = track lane %</div>
        </div>
      )}
    </div>
  );
};
