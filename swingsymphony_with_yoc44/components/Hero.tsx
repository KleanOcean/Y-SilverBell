import React, { useRef, useState } from 'react';
import { Upload, Camera, ChevronRight, Activity } from 'lucide-react';

interface Props {
  onFileSelect: (file: File) => void;
  onWebcamSelect: () => void;
}

export const Hero: React.FC<Props> = ({ onFileSelect, onWebcamSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative flex flex-col overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-neon-purple/20 blur-[120px] rounded-full mix-blend-screen animate-pulse"></div>
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] bg-neon-blue/20 blur-[100px] rounded-full mix-blend-screen"></div>
      </div>

      <nav className="relative z-10 px-8 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <Activity className="text-neon-green" />
           <span className="font-bold text-xl tracking-tighter">SWINGSYMPHONY</span>
        </div>
        <a href="#" className="text-sm text-slate-400 hover:text-white transition">Sign In</a>
      </nav>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
        
        <div className="text-center mb-12 max-w-3xl">
           <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
             Hear Your <br/> <span className="text-white">Performance.</span>
           </h1>
           <p className="text-slate-400 text-lg md:text-xl font-light max-w-xl mx-auto">
             Transform your tennis swing biomechanics into auditory rhythm. 
             Detect timing errors instantly through sound.
           </p>
        </div>

        {/* Drop Zone */}
        <div 
          className={`w-full max-w-2xl aspect-video rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-6 group cursor-pointer relative bg-surface-900/50 backdrop-blur-sm
            ${isDragging ? 'border-neon-green bg-neon-green/10 scale-105' : 'border-surface-700 hover:border-slate-500'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="video/*"
            onChange={(e) => e.target.files && onFileSelect(e.target.files[0])}
          />
          
          <div className="w-20 h-20 bg-surface-800 rounded-full flex items-center justify-center group-hover:scale-110 transition duration-300 shadow-xl ring-1 ring-white/10">
            <Upload size={32} className="text-neon-blue" />
          </div>
          
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white">Drop swing video here</h3>
            <p className="text-sm text-slate-500 mt-2">Supports MP4, MOV (Max 100MB)</p>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-4 text-slate-500 text-sm">
          <div className="h-px w-12 bg-surface-700"></div>
          <span>OR</span>
          <div className="h-px w-12 bg-surface-700"></div>
        </div>

        <button 
          onClick={onWebcamSelect}
          className="mt-8 flex items-center gap-3 px-8 py-4 bg-surface-800 hover:bg-surface-700 border border-surface-600 rounded-full transition-all group"
        >
          <Camera size={20} className="text-neon-purple group-hover:text-white transition" />
          <span className="font-medium">Use Live Camera</span>
          <ChevronRight size={16} className="text-slate-500 group-hover:translate-x-1 transition" />
        </button>

      </main>

      <footer className="relative z-10 py-6 text-center text-slate-600 text-xs">
         DEMO VERSION 0.9.2 // POWERED BY MEDIAPIPE & WEB AUDIO
      </footer>
    </div>
  );
};
