/**
 * YOC44 Service for 3D Skeleton Visualization
 *
 * Handles conversion of YOC44 3D pose data to Three.js renderable format.
 * Based on the standalone skeleton viewer implementation.
 */

import * as THREE from 'three';
import { Keypoint3D, PoseFrame3D } from '../types';

// YOC44 bone connections (44 joints)
export const CONNECTIONS: [number, number][] = [
  [0, 1], [0, 15], [0, 16], [15, 17], [16, 18],
  [1, 8], [1, 2], [1, 5], [2, 3], [3, 4], [5, 6], [6, 7],
  [8, 9], [9, 10], [10, 11], [11, 22], [11, 23], [11, 24],
  [8, 12], [12, 13], [13, 14], [14, 19], [14, 20], [14, 21],
  [37, 1], [38, 0], [40, 1], [41, 8], [39, 8],
  [33, 2], [32, 3], [31, 4], [34, 5], [35, 6], [36, 7],
  [27, 9], [26, 10], [25, 11], [28, 12], [29, 13], [30, 14],
];

// Color scheme for body parts (matching the viewer)
export const COLORS = {
  head: 0x7AB8D9,
  rightArm: 0xD94A4A,
  leftArm: 0x4AD94A,
  rightLeg: 0x4A90D9,
  leftLeg: 0x4A90D9,
  rightFoot: 0xD9D94A,
  leftFoot: 0xD9D94A,
  spine: 0x9EADB8,
  wristTrail: 0xFFD700,
} as const;

/**
 * Get the color for a joint based on its index
 */
export function getJointColor(idx: number): number {
  if ([0, 15, 16, 17, 18, 37, 38, 42, 43].includes(idx)) return COLORS.head;
  if ([2, 3, 4, 31, 32, 33].includes(idx)) return COLORS.rightArm;
  if ([5, 6, 7, 34, 35, 36].includes(idx)) return COLORS.leftArm;
  if ([9, 10, 11, 25, 26, 27].includes(idx)) return COLORS.rightLeg;
  if ([12, 13, 14, 28, 29, 30].includes(idx)) return COLORS.leftLeg;
  if ([22, 23, 24].includes(idx)) return COLORS.rightFoot;
  if ([19, 20, 21].includes(idx)) return COLORS.leftFoot;
  return COLORS.spine;
}

/**
 * Normalize 3D pose data to world coordinates
 *
 * Converts normalized coordinates [-1, 1] to world coordinates
 * for Three.js rendering. Handles coordinate system conversion
 * and centers the skeleton.
 */
export function normalizePoseData(
  frames: PoseFrame3D[],
  yUp: boolean = true
): {
  normalizedFrames: number[][][];  // (N, 44, 3)
  floorY: number;
} {
  // Find bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const frame of frames) {
    for (const kp of frame.keypoints) {
      minX = Math.min(minX, kp.x);
      maxX = Math.max(maxX, kp.x);
      minY = Math.min(minY, kp.y);
      maxY = Math.max(maxY, kp.y);
      minZ = Math.min(minZ, kp.z);
      maxZ = Math.max(maxZ, kp.z);
    }
  }

  const maxRange = Math.max(maxX - minX, maxY - minY, maxZ - minZ);

  // Normalize each frame
  const normalizedFrames = frames.map(frame =>
    frame.keypoints.map(kp => {
      const nx = ((kp.x - minX) / maxRange - 0.5) * 2;
      const ny = ((kp.y - minY) / maxRange - 0.5) * 2 * (yUp ? 1 : -1);
      const nz = ((kp.z - minZ) / maxRange - 0.5) * 2;
      return [nx, ny, nz];
    })
  );

  // Find floor Y position
  let floorY = Infinity;
  for (const frame of normalizedFrames) {
    for (const [, y] of frame) {
      if (y < floorY) floorY = y;
    }
  }

  return { normalizedFrames, floorY };
}

/**
 * Convert normalized 3D pose data to Three.js Vector3 array
 *
 * @param frame - Single frame of 3D pose data
 * @returns Array of Three.js Vector3 positions
 */
export function frameToVector3Array(frame: PoseFrame3D): THREE.Vector3[] {
  return frame.keypoints.map(kp => new THREE.Vector3(kp.x, kp.y, kp.z));
}

/**
 * Get camera preset positions
 */
export const CAMERA_PRESETS = {
  default: {
    position: [0.18, 1.47, 3.72] as [number, number, number],
    target: [0, 0.2, 0] as [number, number, number],
    name: 'Right-Front 45°',
  },
  top: {
    position: [0, 4.5, 0.01] as [number, number, number],
    target: [0, 0, 0] as [number, number, number],
    name: 'Top View',
  },
  front: {
    position: [2.75, 1.47, 2.50] as [number, number, number],
    target: [0, 0.2, 0] as [number, number, number],
    name: 'Front View',
  },
  side: {
    position: [2.50, 1.47, -2.75] as [number, number, number],
    target: [0, 0.2, 0] as [number, number, number],
    name: 'Side View',
  },
};

/**
 * Calculate wrist trail points for visualization
 *
 * @param frames - Normalized 3D pose frames (N, 44, 3)
 * @param impactFrame - Frame index of ball impact
 * @param currentFrame - Current frame index
 * @returns Array of wrist positions for trail rendering
 */
export function calculateWristTrail(
  frames: number[][][],
  impactFrame: number,
  currentFrame: number
): THREE.Vector3[] {
  const trailStart = impactFrame - 20;
  const trailEnd = impactFrame + 20;
  const points: THREE.Vector3[] = [];

  // Right wrist is at index 4
  for (let i = Math.max(0, trailStart); i <= Math.min(frames.length - 1, trailEnd); i++) {
    if (i <= currentFrame) {
      const [x, y, z] = frames[i][4];
      points.push(new THREE.Vector3(x, y, z));
    }
  }

  return points;
}

/**
 * Detect impact frame from pose data
 *
 * Heuristic: find frame with maximum right hand velocity
 * when it's extended forward
 */
export function detectImpactFrame(frames: PoseFrame3D[]): number {
  if (frames.length === 0) return 0;

  let maxVelocity = 0;
  let impactFrame = 0;

  for (let i = 1; i < frames.length; i++) {
    const prevKp = frames[i - 1].keypoints[4]; // Right wrist
    const currKp = frames[i].keypoints[4];

    const dx = currKp.x - prevKp.x;
    const dy = currKp.y - prevKp.y;
    const dz = currKp.z - prevKp.z;

    const velocity = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (velocity > maxVelocity && currKp.x > 0.3) { // Extended forward
      maxVelocity = velocity;
      impactFrame = i;
    }
  }

  return impactFrame;
}

/**
 * Create a smooth curve from points for trail rendering
 */
export function createTrailCurve(points: THREE.Vector3[]): THREE.CatmullRomCurve3 | null {
  if (points.length < 2) return null;
  return new THREE.CatmullRomCurve3(points);
}
