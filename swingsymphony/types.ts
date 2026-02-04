export enum AppView {
  HERO = 'HERO',
  ANALYZING = 'ANALYZING',
  STUDIO = 'STUDIO',
  BATTLE = 'BATTLE',
}

// Standard YOLO/COCO Keypoint Format
export interface Keypoint {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  score: number;
  name?: string;
}

export interface PoseFrame {
  timestamp: number;
  keypoints: Keypoint[];
}

export interface RhythmNode {
  id: string;
  timestamp: number; // in seconds
  intensity: number; // 0-1
  type: 'KICK' | 'BASS' | 'SNARE' | 'CRASH'; // Mapped to Kinetic Chain: Legs, Hips, Shoulders, Arm
  label: string;
}

export interface KineticDataPoint {
  time: number;
  velocity: number;
  jerk: number; // The "smoothness" metric
}

export interface SwingData {
  id: string;
  userType: 'USER' | 'PRO';
  videoUrl: string | null;
  duration: number;
  rhythmTrack: RhythmNode[];
  velocityData: KineticDataPoint[];
  poseData: PoseFrame[]; // Sequence of YOLO pose frames
  score: number; // 0-100 overall harmony score
  feedback: string;
}
