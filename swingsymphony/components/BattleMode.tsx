import React, { useState, useEffect } from 'react';
import { SwingData } from '../types';
import { PRO_SWING_DATA } from '../constants';
import { RhythmVisualizer } from './RhythmVisualizer';
import { PoseOverlay } from './PoseOverlay';
import { ArrowLeft, Play, Pause, User, Award } from 'lucide-react';

interface Props {
  userData: SwingData;
  onBack: () => void;
}

export const BattleMode: React.FC<Props> = ({ userData, onBack }) => {
  const [mix, setMix] = useState(50); // 0 = Pro, 100 = User
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    let animationFrame: number;
    let lastTime: number;

    const animate = (time: number) => {
      if (!lastTime) lastTime = time;
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      if (isPlaying) {
        setCurrentTime(prev => {
          const next = prev + delta;
          if (next >= userData.duration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, userData.duration]);

  return (
    <div className="flex flex-col h-screen bg-black text-white">
       <header className="h-14 border-b border-surface-700 bg-surface-900 flex items-center px-6 gap-4">
         <button onClick={onBack} className="p-2 hover:bg-surface-800 rounded-full transition">
           <ArrowLeft size={20} />
         </button>
         <h1 className="text-lg font-bold tracking-widest text-neon-purple">BATTLE MODE</h1>
       </header>

       <div className="flex-1 flex flex-col p-4 gap-4">
          
          {/* Battle Stage */}
          <div className="flex-1 grid grid-cols-2 gap-4 relative">
             
             {/* Left: PRO */}
             <div className="relative rounded-2xl overflow-hidden border-2 border-neon-blue/30" style={{ opacity: 1 - (mix / 100) * 0.7 }}>
                <div className="absolute top-4 left-4 bg-neon-blue text-black px-3 py-1 font-bold rounded-full text-xs flex items-center gap-2 z-10">
                   <Award size={12} /> PRO REFERENCE
                </div>
                <img src={PRO_SWING_DATA.videoUrl!} alt="Pro" className="w-full h-full object-cover grayscale brightness-50" />
                <PoseOverlay poseData={PRO_SWING_DATA.poseData} currentTime={currentTime} />
             </div>

             {/* Right: USER */}
             <div className="relative rounded-2xl overflow-hidden border-2 border-neon-purple/30" style={{ opacity: 0.3 + (mix / 100) * 0.7 }}>
                <div className="absolute top-4 right-4 bg-neon-purple text-white px-3 py-1 font-bold rounded-full text-xs flex items-center gap-2 z-10">
                   YOU <User size={12} />
                </div>
                {userData.videoUrl && (
                  <video src={userData.videoUrl} className="w-full h-full object-cover grayscale brightness-75" />
                )}
                <PoseOverlay poseData={userData.poseData} currentTime={currentTime} />
             </div>

             {/* Center Mixer Control */}
             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 w-64 bg-black/80 backdrop-blur-md border border-surface-700 p-4 rounded-xl shadow-2xl">
                <div className="flex justify-between text-xs font-mono text-slate-400 mb-2">
                   <span>PERFECT RHYTHM</span>
                   <span>YOUR RHYTHM</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={mix} 
                  onChange={(e) => setMix(Number(e.target.value))}
                  className="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-white"
                />
                <div className="flex justify-center mt-4">
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition"
                  >
                     {isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" />}
                  </button>
                </div>
             </div>
          </div>

          {/* Dual Rhythm Display */}
          <div className="h-48 bg-surface-900 rounded-xl border border-surface-700 p-4 relative overflow-hidden">
             <div className="absolute top-2 left-2 text-xs font-mono text-slate-500">KINETIC ALIGNMENT</div>
             
             {/* Overlaying the tracks visually */}
             <div className="relative h-full pt-6">
                <div className="absolute inset-0 opacity-50 pointer-events-none">
                    <RhythmVisualizer nodes={PRO_SWING_DATA.rhythmTrack} currentTime={currentTime} duration={userData.duration} isPlaying={isPlaying} compact />
                </div>
                <div className="absolute inset-0 opacity-80 pointer-events-none mix-blend-screen" style={{ top: '10px' }}>
                    <RhythmVisualizer nodes={userData.rhythmTrack} currentTime={currentTime} duration={userData.duration} isPlaying={isPlaying} compact />
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};
