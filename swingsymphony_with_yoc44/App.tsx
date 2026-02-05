import React, { useState } from 'react';
import { Hero } from './components/Hero';
import { Studio } from './components/Studio';
import { BattleMode } from './components/BattleMode';
import { analyzeSwingVideo as analyzeSwingVideoApi } from './services/apiService';
import { AppView, SwingData, JobResponse } from './types';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HERO);
  const [swingData, setSwingData] = useState<SwingData | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState('');

  const handleFileSelect = async (file: File) => {
    setView(AppView.ANALYZING);
    setAnalysisProgress(0);
    setAnalysisStatus('Uploading video...');

    try {
      const data = await analyzeSwingVideoApi(file, (status: JobResponse) => {
        // Update progress based on job status
        switch (status.status) {
          case 'pending':
            setAnalysisProgress(10);
            setAnalysisStatus('Queued for analysis...');
            break;
          case 'processing':
            setAnalysisProgress(status.progress);
            setAnalysisStatus(status.message || 'Processing...');
            break;
          case 'completed':
            setAnalysisProgress(100);
            setAnalysisStatus('Analysis complete!');
            break;
          case 'failed':
            setAnalysisStatus(status.error || 'Analysis failed');
            break;
        }
      });

      setSwingData(data);
      setView(AppView.STUDIO);
    } catch (error) {
      console.error("Analysis failed", error);
      setAnalysisStatus('Failed to analyze video');
      setTimeout(() => {
        setView(AppView.HERO);
        setAnalysisProgress(0);
      }, 2000);
    }
  };

  const handleWebcamSelect = () => {
    // In a full app, this would open a webcam capture modal
    // For this demo, we simulate a "captured" file with some content
    // Create a more complete MP4 header with ftyp and moov boxes
    const mp4Data = new Uint8Array([
      // ftyp box
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, // size + 'ftyp'
      0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00, // isom
      0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32, // compatible brands
      0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31, // avc1, mp41
      // mdat box (minimal)
      0x00, 0x00, 0x00, 0x08, 0x6D, 0x64, 0x61, 0x74  // size + 'mdat'
    ]);
    const blob = new Blob([mp4Data], { type: "video/mp4" });
    const mockFile = new File([blob], "webcam-capture.mp4", {
      type: "video/mp4",
      lastModified: Date.now()
    });

    console.log('Created mock file:', mockFile.name, mockFile.type, mockFile.size);
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
             <p className="mt-2 text-slate-500 font-mono text-sm">{analysisStatus || 'Extracting Kinetic Chain Rhythm...'}</p>
             <div className="mt-8 w-64 h-1 bg-surface-800 rounded-full overflow-hidden">
               <div
                 className="h-full bg-neon-blue transition-all duration-300"
                 style={{ width: `${analysisProgress}%` }}
               ></div>
             </div>
             <p className="mt-2 font-mono text-xs text-slate-600">{analysisProgress}%</p>
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
