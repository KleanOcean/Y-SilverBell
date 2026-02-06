export type AlgorithmType = 'timeline' | 'radar' | 'particle' | 'waveform' | 'spectrum';

export interface RhythmNode {
  id: string;
  timestamp: number;
  intensity: number;
  type: 'KICK' | 'BASS' | 'SNARE' | 'CRASH';
  label: string;
}

export interface KineticDataPoint {
  time: number;
  velocity: number;
  jerk: number;
}

export interface Keypoint {
  x: number;
  y: number;
  score: number;
  name?: string;
}

export interface PoseFrame {
  timestamp: number;
  keypoints: Keypoint[];
}

export interface SwingData {
  id: string;
  userType: 'USER' | 'PRO';
  duration: number;
  rhythmTrack: RhythmNode[];
  velocityData: KineticDataPoint[];
  poseData: PoseFrame[];
  score: number;
  feedback: string;
}

export const TRACK_CONFIG = [
  { type: 'KICK' as const, label: 'Legs / Ground', color: '#bc13fe', bgClass: 'bg-purple-500' },
  { type: 'BASS' as const, label: 'Hips / Core', color: '#3b82f6', bgClass: 'bg-blue-500' },
  { type: 'SNARE' as const, label: 'Shoulders', color: '#0aff60', bgClass: 'bg-green-400' },
  { type: 'CRASH' as const, label: 'Racket / Arm', color: '#00f3ff', bgClass: 'bg-cyan-400' },
];

export const ALGORITHM_LABELS: Record<AlgorithmType, { name: string; nameCN: string; description: string }> = {
  timeline: { name: 'Timeline Track', nameCN: '时间轴轨道', description: 'Classic multi-track DAW-style timeline' },
  radar: { name: 'Circular Radar', nameCN: '环形雷达', description: 'Radial sweep with concentric rings' },
  particle: { name: 'Particle Burst', nameCN: '粒子爆发', description: 'Explosive particle effects on each beat' },
  waveform: { name: 'Waveform Waterfall', nameCN: '波形瀑布', description: 'Cascading waveform visualization' },
  spectrum: { name: 'Frequency Bars', nameCN: '频谱柱状', description: 'Classic EQ-style reactive bars' },
};
