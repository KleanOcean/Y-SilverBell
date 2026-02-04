import React, { useState } from 'react';
import { Hero } from './components/Hero';
import { Studio } from './components/Studio';
import { BattleMode } from './components/BattleMode';
import { analyzeSwingVideo } from './services/mockAnalysisService';
import { AppView, SwingData } from './types';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HERO);
  const [swingData, setSwingData] = useState<SwingData | null>(null);

  const handleFileSelect = async (file: File) => {
    setView(AppView.ANALYZING);
    try {
      const data = await analyzeSwingVideo(file);
      setSwingData(data);
      setView(AppView.STUDIO);
    } catch (error) {
      console.error("Analysis failed", error);
      setView(AppView.HERO);
      alert("Failed to analyze video. Please try again.");
    }
  };

  const handleWebcamSelect = () => {
    // In a full app, this would open a webcam capture modal
    // For this demo, we simulate a "captured" file
    const mockFile = new File([""], "webcam-capture.mp4", { type: "video/mp4" });
    handleFileSelect(mockFile);
  };

  const renderContent = () => {
    switch (view) {
      case AppView.HERO:
        return <Hero onFileSelect={handleFileSelect} onWebcamSelect={handleWebcamSelect} />;
      
      case AppView.ANALYZING:
        return (
          <div className="h-screen w-full bg-black flex flex-col items-center justify-center text-white">
             <div className="relative">
               <div className="w-16 h-16 border-4 border-surface-800 border-t-neon-blue rounded-full animate-spin"></div>
               <Loader2 className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-neon-blue animate-pulse" />
             </div>
             <h2 className="mt-8 text-2xl font-bold tracking-widest">ANALYZING BIOMECHANICS</h2>
             <p className="mt-2 text-slate-500 font-mono text-sm">Extracting Kinetic Chain Rhythm...</p>
             <div className="mt-8 w-64 h-1 bg-surface-800 rounded-full overflow-hidden">
               <div className="h-full bg-neon-blue animate-progress"></div>
             </div>
          </div>
        );

      case AppView.STUDIO:
        return swingData ? (
          <Studio 
            data={swingData} 
            onRestart={() => setView(AppView.HERO)} 
            onBattle={() => setView(AppView.BATTLE)}
          />
        ) : null;

      case AppView.BATTLE:
        return swingData ? (
          <BattleMode 
            userData={swingData} 
            onBack={() => setView(AppView.STUDIO)} 
          />
        ) : null;
        
      default:
        return null;
    }
  };

  return (
    <>
      <style>{`
        @keyframes progress {
          0% { width: 0% }
          100% { width: 100% }
        }
        .animate-progress {
          animation: progress 3s ease-in-out infinite;
        }
        .blink {
          animation: blink 1s step-end infinite;
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
      {renderContent()}
    </>
  );
};

export default App;
