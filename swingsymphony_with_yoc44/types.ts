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
  model_code?: string; // Model code (T01, T02, etc.)
  hashtag?: string; // Model hashtag
  rhythmTrack: RhythmNode[];
  velocityData: KineticDataPoint[];
  poseData: PoseFrame[]; // Sequence of YOLO 2D pose frames (COCO 17 joints)

  // 3D YOC44 format (44 joints)
  poseData3D: PoseFrame3D[];
  frames: number; // Total number of frames
  fps: number; // Frames per second
  impact_frame: number; // Frame index of ball impact

  score: number; // 0-100 overall harmony score
  feedback: string;
}

// 3D Keypoint in YOC44 format (normalized -1 to 1)
export interface Keypoint3D {
  x: number; // -1 to 1 normalized
  y: number; // -1 to 1
  z: number; // -1 to 1
  score: number;
  name?: string;
}

// 3D Pose Frame with 44 joints
export interface PoseFrame3D {
  timestamp: number;
  keypoints: Keypoint3D[]; // 44 joints
}

// Job status types for API polling
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface JobResponse {
  job_id: string;
  status: JobStatus;
  progress: number; // 0-100
  message: string;
  result?: SwingData;
  error?: string;
}
