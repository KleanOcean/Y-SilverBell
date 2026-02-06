import { SwingData, PoseFrame, Keypoint } from './types';

const generateProPoseSequence = (duration: number): PoseFrame[] => {
  const frames: PoseFrame[] = [];
  const fps = 30;
  const totalFrames = Math.floor(duration * fps);

  const ready = [{ i: 0, x: 0.5, y: 0.2 }, { i: 5, x: 0.55, y: 0.3 }, { i: 6, x: 0.45, y: 0.3 }, { i: 9, x: 0.52, y: 0.45 }, { i: 10, x: 0.48, y: 0.45 }, { i: 11, x: 0.55, y: 0.5 }, { i: 12, x: 0.45, y: 0.5 }, { i: 13, x: 0.58, y: 0.7 }, { i: 14, x: 0.42, y: 0.7 }, { i: 15, x: 0.6, y: 0.9 }, { i: 16, x: 0.4, y: 0.9 }];
  const turn = [{ i: 0, x: 0.45, y: 0.2 }, { i: 5, x: 0.5, y: 0.3 }, { i: 6, x: 0.4, y: 0.3 }, { i: 9, x: 0.65, y: 0.4 }, { i: 10, x: 0.15, y: 0.3 }, { i: 11, x: 0.5, y: 0.5 }, { i: 12, x: 0.4, y: 0.5 }, { i: 13, x: 0.58, y: 0.7 }, { i: 14, x: 0.38, y: 0.7 }, { i: 15, x: 0.6, y: 0.9 }, { i: 16, x: 0.38, y: 0.9 }];
  const contact = [{ i: 0, x: 0.5, y: 0.2 }, { i: 5, x: 0.55, y: 0.3 }, { i: 6, x: 0.45, y: 0.3 }, { i: 9, x: 0.6, y: 0.4 }, { i: 10, x: 0.75, y: 0.35 }, { i: 11, x: 0.55, y: 0.5 }, { i: 12, x: 0.45, y: 0.5 }, { i: 13, x: 0.58, y: 0.7 }, { i: 14, x: 0.42, y: 0.7 }, { i: 15, x: 0.6, y: 0.9 }, { i: 16, x: 0.4, y: 0.9 }];
  const follow = [{ i: 0, x: 0.5, y: 0.2 }, { i: 5, x: 0.6, y: 0.3 }, { i: 6, x: 0.5, y: 0.3 }, { i: 9, x: 0.5, y: 0.5 }, { i: 10, x: 0.65, y: 0.2 }, { i: 11, x: 0.6, y: 0.5 }, { i: 12, x: 0.5, y: 0.5 }, { i: 13, x: 0.62, y: 0.7 }, { i: 14, x: 0.48, y: 0.7 }, { i: 15, x: 0.62, y: 0.9 }, { i: 16, x: 0.48, y: 0.9 }];

  const interpolate = (start: any[], end: any[], t: number) => {
    const kps: Keypoint[] = Array(17).fill(null).map(() => ({ x: 0.5, y: 0.5, score: 0.1 }));
    start.forEach((s: any) => {
      const e = end.find((x: any) => x.i === s.i) || s;
      kps[s.i] = { x: s.x + (e.x - s.x) * t, y: s.y + (e.y - s.y) * t, score: 0.95 };
    });
    kps[7] = { x: (kps[5].x + kps[9].x) / 2, y: (kps[5].y + kps[9].y) / 2, score: 0.9 };
    kps[8] = { x: (kps[6].x + kps[10].x) / 2, y: (kps[6].y + kps[10].y) / 2, score: 0.9 };
    return kps;
  };

  for (let f = 0; f < totalFrames; f++) {
    const time = f / fps;
    const progress = time / duration;
    let kps: Keypoint[];
    if (progress < 0.3) kps = interpolate(ready, turn, progress / 0.3);
    else if (progress < 0.6) kps = interpolate(turn, contact, (progress - 0.3) / 0.3);
    else kps = interpolate(contact, follow, (progress - 0.6) / 0.4);
    frames.push({ timestamp: time, keypoints: kps });
  }
  return frames;
};

export const PRO_SWING_DATA: SwingData = {
  id: 'pro-federer-01',
  userType: 'PRO',
  duration: 2.5,
  score: 98,
  feedback: "Perfect kinetic chain execution.",
  rhythmTrack: [
    { id: 'p1', timestamp: 0.5, intensity: 0.8, type: 'KICK', label: 'Leg Load' },
    { id: 'p2', timestamp: 0.9, intensity: 0.9, type: 'BASS', label: 'Hip Fire' },
    { id: 'p3', timestamp: 1.2, intensity: 0.9, type: 'SNARE', label: 'Shoulder Turn' },
    { id: 'p4', timestamp: 1.4, intensity: 1.0, type: 'CRASH', label: 'Contact' },
  ],
  velocityData: Array.from({ length: 25 }, (_, i) => ({
    time: i * 0.1,
    velocity: Math.sin(i * 0.3) * 100,
    jerk: Math.random() * 5
  })),
  poseData: generateProPoseSequence(2.5)
};

export const USER_SWING_DATA: SwingData = {
  id: 'user-swing-01',
  userType: 'USER',
  duration: 2.5,
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
  poseData: generateProPoseSequence(2.5)
};
