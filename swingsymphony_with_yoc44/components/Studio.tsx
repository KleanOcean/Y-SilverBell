import React, { useState, useEffect, useRef } from 'react';
import { SwingData } from '../types';
import { RhythmVisualizer } from './RhythmVisualizer';
import { PoseOverlay } from './PoseOverlay';
import { Skeleton3DViewer } from './Skeleton3DViewer';
import { Play, Pause, RefreshCw, BarChart2, Volume2, VolumeX, ShieldAlert, Box, SkipForward, SkipBack } from 'lucide-react';
import { audioService } from '../services/audioService';
import { listModels, getModelData } from '../services/apiService';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface Props {
  data: SwingData;
  onRestart: () => void;
  onBattle: () => void;
}

export const Studio: React.FC<Props> = ({ data: initialData, onRestart, onBattle }) => {
  const [data, setData] = useState<SwingData>(initialData);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
  const [volume, setVolume] = useState(30); // Volume 0-100%
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [currentModelIndex, setCurrentModelIndex] = useState(0);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const speedRef = useRef(speed);
  const durationRef = useRef(data.duration);

  // Update refs when values change
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    durationRef.current = data.duration;
  }, [data.duration]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    audioService.setVolume(newVolume / 100); // Convert to 0-1 range
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    audioService.setSpeed(newSpeed); // Update audio service speed for pitch shift
  };

  const restartPlayback = () => {
    setCurrentTime(0);
    setIsPlaying(true);
    startTimeRef.current = undefined;
  };

  const loadNextModel = async () => {
    if (availableModels.length === 0 || isLoadingModel) return;

    const nextIndex = (currentModelIndex + 1) % availableModels.length;
    await loadModelByIndex(nextIndex);
  };

  const loadPreviousModel = async () => {
    if (availableModels.length === 0 || isLoadingModel) return;

    const prevIndex = (currentModelIndex - 1 + availableModels.length) % availableModels.length;
    await loadModelByIndex(prevIndex);
  };

  const loadModelByIndex = async (index: number) => {
    if (availableModels.length === 0 || isLoadingModel) return;

    const modelCode = availableModels[index];

    setIsLoadingModel(true);
    setIsPlaying(false);
    setCurrentTime(0);

    try {
      const modelData = await getModelData(modelCode);
      setData(modelData);
      setCurrentModelIndex(index);
    } catch (error) {
      console.error('Failed to load model:', error);
    } finally {
      setIsLoadingModel(false);
    }
  };

  // Initialize audio service settings on mount
  useEffect(() => {
    audioService.setVolume(volume / 100);
    audioService.setSpeed(speed);
  }, []);

  // Load available models on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const { models } = await listModels();
        setAvailableModels(models);

        // Find current model index
        if (data.model_code) {
          const index = models.indexOf(data.model_code);
          if (index >= 0) {
            setCurrentModelIndex(index);
          }
        }
      } catch (error) {
        console.error('Failed to load models:', error);
      }
    };

    loadModels();
  }, []);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle if target is body (not input fields)
      if (event.target !== document.body) return;

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          restartPlayback();
          break;

        case 'ArrowRight':
          event.preventDefault();
          loadNextModel();
          break;

        case 'ArrowLeft':
          event.preventDefault();
          loadPreviousModel();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [availableModels, currentModelIndex, isLoadingModel]);

  const animate = (time: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = time;
      console.log('🎬 Animation started, startTime:', time);
    }

    // Calculate absolute elapsed time (no accumulation error)
    const elapsedMs = time - startTimeRef.current;
    const elapsedSeconds = elapsedMs / 1000;
    const newTime = elapsedSeconds * speedRef.current; // Use ref for latest value

    // Debug logging (remove after fix)
    if (Math.random() < 0.05) { // Log ~5% of frames to avoid spam
      console.log('⏱️ Time:', {
        timestamp: time.toFixed(0),
        startTime: startTimeRef.current?.toFixed(0),
        elapsedMs: elapsedMs.toFixed(0),
        speed: speedRef.current,
        newTime: newTime.toFixed(3),
        duration: durationRef.current.toFixed(3)
      });
    }

    // Check if reached end
    if (newTime >= durationRef.current) { // Use ref for latest value
      console.log('🏁 Animation ended');
      setCurrentTime(durationRef.current);
      setIsPlaying(false);
      startTimeRef.current = undefined;
      return;
    }

    setCurrentTime(newTime);
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = undefined; // Reset start time for new playback
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      startTimeRef.current = undefined;
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying]);

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-surface-700 bg-surface-900 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
           <div className="w-3 h-3 bg-neon-green rounded-full animate-pulse"></div>
           <h1 className="text-lg font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">
             STUDIO <span className="text-slate-500 font-mono text-xs ml-2">SESSION: {data.id.toUpperCase()}</span>
           </h1>
        </div>
        <div className="flex gap-4">
           <button
             onClick={loadPreviousModel}
             disabled={isLoadingModel || availableModels.length <= 1}
             className="text-slate-400 hover:text-white transition flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
             title="Previous Model (←)"
           >
             <SkipBack size={14} /> Prev
           </button>
           <button
             onClick={loadNextModel}
             disabled={isLoadingModel || availableModels.length <= 1}
             className="text-slate-400 hover:text-white transition flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
             title="Next Model (→)"
           >
             <SkipForward size={14} /> Next
             {availableModels.length > 0 && (
               <span className="text-xs text-slate-600">
                 ({currentModelIndex + 1}/{availableModels.length})
               </span>
             )}
           </button>
           <button onClick={onRestart} className="text-slate-400 hover:text-white transition flex items-center gap-2 text-sm">
             <RefreshCw size={14} /> New Upload
           </button>
           <button
             onClick={onBattle}
             className="bg-neon-purple/20 text-neon-purple border border-neon-purple/50 px-4 py-1 rounded-full text-sm font-bold hover:bg-neon-purple hover:text-white transition"
           >
             ENTER BATTLE MODE
           </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 flex flex-col gap-1 p-1">

        {/* Top: 3D Viewer + Kinetic Chain */}
        <div className="flex gap-1 h-[400px]">
          {/* Left: 3D Viewer */}
          <div className="w-[400px] bg-surface-900 relative rounded-lg overflow-hidden border border-surface-700 group">
          {/* Model Info */}
          {data.model_code && (
            <div className="absolute top-4 right-4 z-10 bg-black/80 backdrop-blur px-3 py-2 rounded-lg border border-surface-700">
              <div className="text-right">
                <div className="text-neon-blue font-bold text-sm tracking-wider">
                  {data.model_code}
                </div>
                {data.hashtag && (
                  <div className="text-neon-purple text-xs mt-0.5">
                    {data.hashtag}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="absolute top-4 left-4 z-10 flex gap-1 bg-black/60 backdrop-blur px-1 py-1 rounded border border-surface-700">
            <button
              onClick={() => setViewMode('2d')}
              className={`px-3 py-1 text-xs font-medium rounded transition ${
                viewMode === '2d'
                  ? 'bg-neon-blue text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2D
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1 text-xs font-medium rounded transition flex items-center gap-1 ${
                viewMode === '3d'
                  ? 'bg-neon-purple text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Box size={12} />
              3D
            </button>
          </div>

          {viewMode === '2d' ? (
            <>
              {data.videoUrl ? (
                <video
                  src={data.videoUrl}
                  className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 transition duration-700"
                />
              ) : (
                <div className="w-full h-full bg-surface-800 flex items-center justify-center text-slate-600">
                  No Video Signal
                </div>
              )}

              {/* YOLO Pose Overlay */}
              <div className="absolute inset-0">
                <PoseOverlay
                  poseData={data.poseData}
                  currentTime={currentTime}
                />

                {/* Text Indicator */}
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-2 py-1 rounded border border-surface-700">
                  <p className="text-neon-blue/80 font-mono text-[10px] flex items-center gap-2">
                    <span className="w-2 h-2 bg-neon-blue rounded-full animate-pulse"></span>
                    YOLO v8 POSE
                  </p>
                </div>

                {/* Rhythm Impact Effect */}
                {data.rhythmTrack.some(n => Math.abs(currentTime - n.timestamp) < 0.1) && (
                  <div className="absolute inset-0 pointer-events-none border-4 border-neon-blue/30 animate-pulse rounded-lg"></div>
                )}
              </div>
            </>
          ) : (
            /* 3D Viewer */
            <div className="w-full h-full bg-surface-800">
              <Skeleton3DViewer
                poseData3D={data.poseData3D}
                currentTime={currentTime}
                duration={data.duration}
                impactFrame={data.impact_frame}
                width={380}
                height={380}
                className="w-full h-full"
              />
            </div>
          )}

          {/* Timecode */}
          <div className="absolute bottom-4 left-4 font-mono text-neon-blue text-xl bg-black/50 px-2 rounded">
            {currentTime.toFixed(2)}s <span className="text-xs text-slate-500">/ {data.duration}s</span>
          </div>
          </div>

          {/* Right: Kinetic Chain Sequence */}
          <div className="flex-1 bg-surface-800 rounded-lg p-4 border border-surface-700 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase flex items-center gap-2">
                <Volume2 size={16} /> Kinetic Chain Sequence
              </h3>
              <div className="flex items-center gap-2 bg-surface-900 rounded-lg p-1 border border-surface-700">
                <button onClick={togglePlay} className="p-2 hover:text-neon-green transition">
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <div className="h-4 w-[1px] bg-surface-700 mx-1"></div>

                {/* Volume Slider */}
                <div className="flex items-center gap-2 px-2">
                  <button
                    onClick={() => handleVolumeChange(volume > 0 ? 0 : 30)}
                    className="p-1 hover:text-neon-blue transition"
                    title={volume > 0 ? 'Mute' : 'Unmute'}
                  >
                    {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="w-20 h-1 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-neon-blue"
                    title={`Volume: ${volume}%`}
                  />
                  <span className="text-xs text-slate-500 font-mono w-8 text-right">
                    {volume}%
                  </span>
                </div>

                <div className="h-4 w-[1px] bg-surface-700 mx-1"></div>
                <select
                  className="bg-transparent text-xs font-mono outline-none text-slate-400"
                  value={speed}
                  onChange={(e) => handleSpeedChange(Number(e.target.value))}
                >
                  <option value={1}>1.0x Speed</option>
                  <option value={0.5}>0.5x Slow</option>
                  <option value={0.25}>0.25x Analyze</option>
                </select>
              </div>
            </div>
            
            <div className="flex-1 min-h-[200px]">
              <RhythmVisualizer
                nodes={data.rhythmTrack}
                currentTime={currentTime}
                duration={data.duration}
                isPlaying={isPlaying}
              />
            </div>
          </div>
        </div>

        {/* Bottom: Analytics */}
        <div className="flex-1 grid grid-cols-2 gap-1">
            
            {/* Smoothness/Jerk Graph */}
            <div className="bg-surface-800 rounded-lg p-4 border border-surface-700 relative flex flex-col">
               <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                 <BarChart2 size={14} /> Motion Smoothness (Inv. Jerk)
               </h3>
               <div className="flex-1 w-full flex items-center">
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={data.velocityData}>
                     <XAxis dataKey="time" hide />
                     <YAxis hide />
                     <Tooltip 
                       contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#fff' }}
                       itemStyle={{ color: '#0aff60' }}
                     />
                     <Line 
                       type="monotone" 
                       dataKey="jerk" 
                       stroke="#0aff60" 
                       strokeWidth={2} 
                       dot={false} 
                     />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
               {/* Current Time Indicator on Graph */}
               <div 
                  className="absolute top-10 bottom-4 w-px bg-white/20 pointer-events-none"
                  style={{ left: `${(currentTime / data.duration) * 100}%` }}
               />
            </div>

            {/* AI Feedback */}
            <div className="bg-surface-800 rounded-lg p-4 border border-surface-700 flex flex-col">
               <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                 <ShieldAlert size={14} className="text-neon-purple" /> AI Coach Feedback
               </h3>
               <div className="flex-1 flex flex-col justify-start">
                  <div className="flex items-baseline gap-2 mb-3">
                    <div className="text-4xl font-bold text-white">{data.score}</div>
                    <span className="text-sm text-slate-500">/100</span>
                    <span className={`ml-auto px-2 py-0.5 rounded text-xs font-bold ${
                      data.score >= 80 ? 'bg-neon-green/20 text-neon-green' :
                      data.score >= 60 ? 'bg-yellow-500/20 text-yellow-500' :
                      'bg-red-500/20 text-red-500'
                    }`}>
                      {data.score >= 80 ? 'ADVANCED' : data.score >= 60 ? 'INTERMEDIATE' : 'BEGINNER'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                    <p className="font-semibold text-white">Primary Issue:</p>
                    <p>"{data.feedback}"</p>

                    <p className="font-semibold text-white mt-3">Kinetic Chain Analysis:</p>
                    <p className="text-neon-purple">⚠ Detected: Early Hip Rotation (Off-beat)</p>
                    <p>Your hips are firing approximately 80ms before optimal shoulder engagement. This breaks the kinetic chain sequence and reduces power transfer efficiency by ~15-20%.</p>

                    <p className="font-semibold text-white mt-3">Recommendations:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-400">
                      <li>Focus on loading the back leg during preparation phase</li>
                      <li>Delay hip rotation until shoulder turn initiates</li>
                      <li>Practice shadow swings at 0.5x speed to develop timing</li>
                      <li>Aim for 150-200ms gap between hip fire and contact</li>
                    </ul>
                  </div>
               </div>
            </div>

          </div>

        </div>
      </div>
  );
};
