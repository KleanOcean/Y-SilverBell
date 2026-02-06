import React, { useState, useEffect, useRef } from 'react';
import { AlgorithmType, ALGORITHM_LABELS, SwingData } from './types';
import { PRO_SWING_DATA, USER_SWING_DATA } from './constants';
import { audioService } from './services/audioService';
import { TimelineVisualizer } from './components/TimelineVisualizer';
import { RadarVisualizer } from './components/RadarVisualizer';
import { ParticleVisualizer } from './components/ParticleVisualizer';
import { WaveformVisualizer } from './components/WaveformVisualizer';
import { SpectrumVisualizer } from './components/SpectrumVisualizer';
import { PoseOverlay } from './components/PoseOverlay';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Activity } from 'lucide-react';

const ALGORITHMS: AlgorithmType[] = ['timeline', 'radar', 'particle', 'waveform', 'spectrum'];

const App: React.FC = () => {
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('timeline');
  const [dataSource, setDataSource] = useState<'PRO' | 'USER'>('PRO');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(30);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const speedRef = useRef(speed);

  const data: SwingData = dataSource === 'PRO' ? PRO_SWING_DATA : USER_SWING_DATA;

  useEffect(() => { speedRef.current = speed; }, [speed]);

  useEffect(() => {
    audioService.setVolume(volume / 100);
    audioService.setSpeed(speed);
  }, []);

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    audioService.setVolume(v / 100);
  };

  const handleSpeedChange = (s: number) => {
    setSpeed(s);
    audioService.setSpeed(s);
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  const restart = () => {
    setCurrentTime(0);
    setIsPlaying(true);
    startTimeRef.current = undefined;
  };

  const switchAlgorithm = (algo: AlgorithmType) => {
    // Keep playback state when switching
    setAlgorithm(algo);
  };

  const animate = (time: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = time;
    }
    const elapsedMs = time - startTimeRef.current;
    const elapsedSeconds = elapsedMs / 1000;
    const newTime = elapsedSeconds * speedRef.current;

    if (newTime >= data.duration) {
      setCurrentTime(data.duration);
      setIsPlaying(false);
      startTimeRef.current = undefined;
      return;
    }

    setCurrentTime(newTime);
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = undefined;
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      startTimeRef.current = undefined;
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isPlaying]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target !== document.body) return;
      if (e.code === 'Space') { e.preventDefault(); restart(); }
      if (e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (idx < ALGORITHMS.length) switchAlgorithm(ALGORITHMS[idx]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const renderVisualizer = () => {
    const props = {
      nodes: data.rhythmTrack,
      currentTime,
      duration: data.duration,
      isPlaying,
    };

    switch (algorithm) {
      case 'timeline': return <TimelineVisualizer {...props} />;
      case 'radar': return <RadarVisualizer {...props} />;
      case 'particle': return <ParticleVisualizer {...props} />;
      case 'waveform': return <WaveformVisualizer {...props} />;
      case 'spectrum': return <SpectrumVisualizer {...props} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-surface-700 bg-surface-900 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="text-neon-green" size={20} />
          <h1 className="text-lg font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">
            SWINGSYMPHONY
          </h1>
          <span className="text-slate-500 font-mono text-xs ml-2">ALGORITHM TESTING</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Data Source Toggle */}
          <div className="flex items-center gap-1 bg-surface-800 rounded-lg p-1 border border-surface-700">
            <button
              onClick={() => { setDataSource('PRO'); setCurrentTime(0); setIsPlaying(false); }}
              className={`px-3 py-1 text-xs font-medium rounded transition ${
                dataSource === 'PRO' ? 'bg-neon-green/20 text-neon-green' : 'text-slate-400 hover:text-white'
              }`}
            >
              PRO Data
            </button>
            <button
              onClick={() => { setDataSource('USER'); setCurrentTime(0); setIsPlaying(false); }}
              className={`px-3 py-1 text-xs font-medium rounded transition ${
                dataSource === 'USER' ? 'bg-neon-purple/20 text-neon-purple' : 'text-slate-400 hover:text-white'
              }`}
            >
              USER Data
            </button>
          </div>
        </div>
      </header>

      {/* Algorithm Selector */}
      <nav className="h-12 bg-surface-900/80 border-b border-surface-700 flex items-center px-4 gap-2 shrink-0 overflow-x-auto">
        {ALGORITHMS.map((algo, i) => {
          const info = ALGORITHM_LABELS[algo];
          const isActive = algorithm === algo;
          return (
            <button
              key={algo}
              onClick={() => switchAlgorithm(algo)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                isActive
                  ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/50'
                  : 'text-slate-400 hover:text-white hover:bg-surface-800 border border-transparent'
              }`}
            >
              <span className="text-xs text-slate-500 font-mono">{i + 1}</span>
              <span>{info.nameCN}</span>
              <span className="text-xs opacity-60">({info.name})</span>
            </button>
          );
        })}
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex gap-1 p-1 min-h-0">
        {/* Left: Pose Viewer */}
        <div className="w-[320px] shrink-0 bg-surface-900 rounded-lg border border-surface-700 relative flex flex-col">
          <div className="flex-1 flex items-center justify-center p-2">
            <PoseOverlay poseData={data.poseData} currentTime={currentTime} width={300} height={300} />
          </div>

          {/* Timecode */}
          <div className="p-3 border-t border-surface-700">
            <div className="font-mono text-neon-blue text-lg">
              {currentTime.toFixed(2)}s <span className="text-xs text-slate-500">/ {data.duration}s</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Score: <span className={`font-bold ${data.score >= 80 ? 'text-neon-green' : data.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{data.score}/100</span>
              <span className="ml-2">{data.userType}</span>
            </div>
          </div>
        </div>

        {/* Right: Visualization + Controls */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          {/* Algorithm Info Bar */}
          <div className="h-8 flex items-center justify-between px-4 bg-surface-800/50 rounded-lg border border-surface-700 shrink-0">
            <span className="text-sm font-bold text-neon-blue">{ALGORITHM_LABELS[algorithm].nameCN}</span>
            <span className="text-xs text-slate-500">{ALGORITHM_LABELS[algorithm].description}</span>
          </div>

          {/* Visualizer */}
          <div className="flex-1 min-h-0">
            {renderVisualizer()}
          </div>

          {/* Playback Controls */}
          <div className="h-14 bg-surface-800 rounded-lg border border-surface-700 flex items-center px-4 gap-4 shrink-0">
            <button onClick={togglePlay} className="p-2 hover:text-neon-green transition">
              {isPlaying ? <Pause size={22} /> : <Play size={22} />}
            </button>
            <button onClick={restart} className="p-2 hover:text-neon-blue transition" title="Restart (Space)">
              <RotateCcw size={18} />
            </button>

            <div className="h-6 w-px bg-surface-700" />

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleVolumeChange(volume > 0 ? 0 : 30)}
                className="p-1 hover:text-neon-blue transition"
              >
                {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range" min="0" max="100" step="5" value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-20 h-1 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-neon-blue"
              />
              <span className="text-xs text-slate-500 font-mono w-8">{volume}%</span>
            </div>

            <div className="h-6 w-px bg-surface-700" />

            {/* Speed */}
            <select
              className="bg-transparent text-xs font-mono outline-none text-slate-400 cursor-pointer"
              value={speed}
              onChange={(e) => handleSpeedChange(Number(e.target.value))}
            >
              <option value={1}>1.0x Speed</option>
              <option value={0.5}>0.5x Slow</option>
              <option value={0.25}>0.25x Analyze</option>
            </select>

            <div className="flex-1" />

            {/* Progress Bar */}
            <div className="flex items-center gap-2">
              <div className="w-48 h-1.5 bg-surface-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-neon-blue to-neon-purple transition-all duration-75"
                  style={{ width: `${(currentTime / data.duration) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono text-slate-400 w-16 text-right">
                {currentTime.toFixed(2)}s
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Keyboard Shortcuts */}
      <footer className="h-7 bg-surface-900 border-t border-surface-700 flex items-center justify-center gap-6 text-xs text-slate-600 shrink-0">
        <span><kbd className="px-1 py-0.5 bg-surface-800 rounded text-slate-400">Space</kbd> Restart</span>
        <span><kbd className="px-1 py-0.5 bg-surface-800 rounded text-slate-400">1-5</kbd> Switch Algorithm</span>
        <span>v0.1.0 // Algorithm Testing Build</span>
      </footer>
    </div>
  );
};

export default App;
