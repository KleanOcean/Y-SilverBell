import { SwingData, PoseFrame, Keypoint } from '../types';

// Helper to generate a sequence of poses interpolating between keyframes
const generateMockPoseSequence = (duration: number): PoseFrame[] => {
  const frames: PoseFrame[] = [];
  const fps = 30;
  const totalFrames = Math.floor(duration * fps);

  // Key States (Normalized X, Y)
  // 0: Nose, 5: L-Shoulder, 6: R-Shoulder, 9: L-Wrist, 10: R-Wrist, 11: L-Hip, 12: R-Hip, 15: L-Ankle, 16: R-Ankle
  
  // 1. Ready Position
  const ready = [
    { i: 0, x: 0.5, y: 0.2 }, // Nose
    { i: 5, x: 0.55, y: 0.3 }, { i: 6, x: 0.45, y: 0.3 }, // Shoulders
    { i: 9, x: 0.52, y: 0.45 }, { i: 10, x: 0.48, y: 0.45 }, // Wrists (Center)
    { i: 11, x: 0.53, y: 0.5 }, { i: 12, x: 0.47, y: 0.5 }, // Hips
    { i: 13, x: 0.55, y: 0.7 }, { i: 14, x: 0.45, y: 0.7 }, // Knees
    { i: 15, x: 0.55, y: 0.9 }, { i: 16, x: 0.45, y: 0.9 }, // Ankles
  ];

  // 2. Unit Turn (Backswing)
  const turn = [
    { i: 0, x: 0.45, y: 0.2 },
    { i: 5, x: 0.5, y: 0.3 }, { i: 6, x: 0.4, y: 0.3 }, // Rotated shoulders
    { i: 9, x: 0.6, y: 0.4 }, { i: 10, x: 0.2, y: 0.35 }, // R-Wrist back!
    { i: 11, x: 0.5, y: 0.5 }, { i: 12, x: 0.42, y: 0.5 }, // Hips turned
    { i: 13, x: 0.55, y: 0.7 }, { i: 14, x: 0.4, y: 0.7 },
    { i: 15, x: 0.55, y: 0.9 }, { i: 16, x: 0.4, y: 0.9 },
  ];

  // 3. Contact Point
  const contact = [
    { i: 0, x: 0.5, y: 0.2 },
    { i: 5, x: 0.55, y: 0.3 }, { i: 6, x: 0.45, y: 0.3 }, // Square shoulders
    { i: 9, x: 0.6, y: 0.4 }, { i: 10, x: 0.7, y: 0.4 }, // R-Wrist contact out front
    { i: 11, x: 0.55, y: 0.5 }, { i: 12, x: 0.45, y: 0.5 },
    { i: 13, x: 0.55, y: 0.7 }, { i: 14, x: 0.45, y: 0.7 },
    { i: 15, x: 0.55, y: 0.9 }, { i: 16, x: 0.45, y: 0.9 },
  ];

  // 4. Follow Through
  const follow = [
    { i: 0, x: 0.5, y: 0.2 },
    { i: 5, x: 0.6, y: 0.3 }, { i: 6, x: 0.5, y: 0.3 }, // Rotated left
    { i: 9, x: 0.5, y: 0.5 }, { i: 10, x: 0.7, y: 0.25 }, // R-Wrist over shoulder
    { i: 11, x: 0.6, y: 0.5 }, { i: 12, x: 0.5, y: 0.5 },
    { i: 13, x: 0.6, y: 0.7 }, { i: 14, x: 0.5, y: 0.7 },
    { i: 15, x: 0.6, y: 0.9 }, { i: 16, x: 0.5, y: 0.9 },
  ];

  // Interpolation helper
  const interpolate = (start: any[], end: any[], t: number) => {
    const kps: Keypoint[] = Array(17).fill(null).map((_, idx) => ({ x: 0.5, y: 0.5, score: 0.1 })); // default low score
    
    // Fill knowns
    start.forEach(s => {
      const e = end.find(x => x.i === s.i) || s;
      kps[s.i] = {
        x: s.x + (e.x - s.x) * t,
        y: s.y + (e.y - s.y) * t,
        score: 0.9
      };
    });

    // Simple fill for elbows (midpoint between shoulder and wrist)
    const mid = (idx1: number, idx2: number) => ({
      x: (kps[idx1].x + kps[idx2].x) / 2,
      y: (kps[idx1].y + kps[idx2].y) / 2,
      score: 0.8
    });

    kps[7] = mid(5, 9); // L-Elbow
    kps[8] = mid(6, 10); // R-Elbow (Simplified for ease)

    // Add jitter for "realism" or "user imperfection"
    return kps.map(k => ({ ...k, x: k.x + (Math.random() - 0.5) * 0.005, y: k.y + (Math.random() - 0.5) * 0.005 }));
  };

  for (let f = 0; f < totalFrames; f++) {
    const time = f / fps;
    const progress = time / duration;
    let kps: Keypoint[] = [];

    if (progress < 0.3) {
      // Ready -> Turn
      kps = interpolate(ready, turn, progress / 0.3);
    } else if (progress < 0.6) {
      // Turn -> Contact
      kps = interpolate(turn, contact, (progress - 0.3) / 0.3);
    } else {
      // Contact -> Follow
      kps = interpolate(contact, follow, (progress - 0.6) / 0.4);
    }

    frames.push({ timestamp: time, keypoints: kps });
  }

  return frames;
};

export const analyzeSwingVideo = async (file: File): Promise<SwingData> => {
  return new Promise((resolve) => {
    // Simulate AI processing delay
    setTimeout(() => {
      const duration = 2.5;
      
      resolve({
        id: 'user-swing-01',
        userType: 'USER',
        videoUrl: URL.createObjectURL(file),
        duration: duration,
        score: 72,
        feedback: "Hips fired too early relative to shoulder rotation.",
        rhythmTrack: [
          { id: 'u1', timestamp: 0.6, intensity: 0.7, type: 'KICK', label: 'Leg Load' },
          { id: 'u2', timestamp: 0.8, intensity: 0.6, type: 'BASS', label: 'Hip Fire' },
          { id: 'u3', timestamp: 1.4, intensity: 0.8, type: 'SNARE', label: 'Shoulder Turn' },
          { id: 'u4', timestamp: 1.5, intensity: 0.9, type: 'CRASH', label: 'Contact' },
        ],
        velocityData: Array.from({ length: 25 }, (_, i) => ({
          time: i * 0.1,
          velocity: Math.sin(i * 0.3) * 80 + (Math.random() * 20),
          jerk: Math.random() * 25
        })),
        poseData: generateMockPoseSequence(duration) // Add generated poses
      });
    }, 2000);
  });
};
