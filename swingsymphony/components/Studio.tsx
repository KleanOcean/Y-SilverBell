import React, { useState, useEffect, useRef } from 'react';
import { SwingData } from '../types';
import { RhythmVisualizer } from './RhythmVisualizer';
import { PoseOverlay } from './PoseOverlay';
import { Play, Pause, RefreshCw, BarChart2, Volume2, ShieldAlert } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface Props {
  data: SwingData;
  onRestart: () => void;
  onBattle: () => void;
}

export const Studio: React.FC<Props> = ({ data, onRestart, onBattle }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>();

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const animate = (time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time;
    const progress = (time - startTimeRef.current) / 1000 * speed; // speed multiplier
    
    // Loop
    const newTime = (currentTime + (progress * 0.05)); // rough simulation step
    
    if (newTime >= data.duration) {
      setCurrentTime(0);
      setIsPlaying(false);
      startTimeRef.current = undefined;
      return;
    }

    setCurrentTime(newTime);
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      startTimeRef.current = undefined;
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, currentTime]);

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
      <div className="flex-1 grid grid-cols-12 gap-1 p-1">
        
        {/* Left: Visual Layer (Video + Skeleton) */}
        <div className="col-span-12 lg:col-span-5 bg-surface-900 relative rounded-lg overflow-hidden border border-surface-700 group">
          {data.videoUrl ? (
            <video 
              src={data.videoUrl} 
              className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 transition duration-700" 
            />
          ) : (
             <div className="w-full h-full bg-surface-800 flex items-center justify-center text-slate-600">No Video Signal</div>
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

          {/* Timecode */}
          <div className="absolute bottom-4 left-4 font-mono text-neon-blue text-xl bg-black/50 px-2 rounded">
            {currentTime.toFixed(2)}s <span className="text-xs text-slate-500">/ {data.duration}s</span>
          </div>
        </div>

        {/* Right: Audio/Data Layer */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-1">
          
          {/* Top Right: Rhythm Score */}
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
                <select 
                  className="bg-transparent text-xs font-mono outline-none text-slate-400"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
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

          {/* Bottom Right: Analytics */}
          <div className="h-1/3 grid grid-cols-2 gap-1">
            
            {/* Smoothness/Jerk Graph */}
            <div className="bg-surface-800 rounded-lg p-4 border border-surface-700 relative">
               <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                 <BarChart2 size={14} /> Motion Smoothness (Inv. Jerk)
               </h3>
               <div className="h-32 w-full">
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
            <div className="bg-surface-800 rounded-lg p-4 border border-surface-700">
               <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                 <ShieldAlert size={14} className="text-neon-purple" /> AI Coach Feedback
               </h3>
               <div className="h-full flex flex-col justify-center">
                  <div className="text-3xl font-bold text-white mb-1">{data.score}<span className="text-sm text-slate-500 font-normal">/100</span></div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    "{data.feedback}"
                  </p>
                  <div className="mt-3 text-xs text-neon-purple">
                    Detected: Early Hip Rotation (Off-beat)
                  </div>
               </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
