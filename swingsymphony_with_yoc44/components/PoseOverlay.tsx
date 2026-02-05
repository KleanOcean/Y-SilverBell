import React, { useEffect, useRef } from 'react';
import { PoseFrame } from '../types';

interface Props {
  poseData: PoseFrame[];
  currentTime: number;
  width?: number;
  height?: number;
}

// Standard COCO Keypoint Index Mapping for YOLO
// 0: Nose, 1: Left Eye, 2: Right Eye, 3: Left Ear, 4: Right Ear
// 5: Left Shoulder, 6: Right Shoulder, 7: Left Elbow, 8: Right Elbow
// 9: Left Wrist, 10: Right Wrist, 11: Left Hip, 12: Right Hip
// 13: Left Knee, 14: Right Knee, 15: Left Ankle, 16: Right Ankle

const SKELETON_CONNECTIONS = [
  [1, 3], [1, 0], [2, 4], [2, 0], [0, 5], [0, 6], // Head
  [5, 7], [7, 9], // Left Arm
  [6, 8], [8, 10], // Right Arm
  [5, 6], [5, 11], [6, 12], [11, 12], // Torso
  [11, 13], [13, 15], // Left Leg
  [12, 14], [14, 16]  // Right Leg
];

export const PoseOverlay: React.FC<Props> = ({ poseData, currentTime, width = 640, height = 480 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find closest frame
    const frame = poseData.reduce((prev, curr) => 
      Math.abs(curr.timestamp - currentTime) < Math.abs(prev.timestamp - currentTime) ? curr : prev
    );

    if (!frame || Math.abs(frame.timestamp - currentTime) > 0.2) return; // Don't draw if too far off

    // Drawing Settings
    const keypointRadius = 4;
    const lineWidth = 3;
    
    // Helper to get coords
    const getCoord = (idx: number) => {
      const kp = frame.keypoints[idx];
      return kp ? { x: kp.x * width, y: kp.y * height, score: kp.score } : null;
    };

    // Draw Connections (Skeleton)
    SKELETON_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const start = getCoord(startIdx);
      const end = getCoord(endIdx);

      if (start && end && start.score > 0.5 && end.score > 0.5) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        
        // Dynamic Coloring: Right side (Even indices usually) vs Left side (Odd indices)
        // Simple logic: if start index is even, it's likely right side -> Purple
        const isRight = startIdx % 2 === 0;
        ctx.strokeStyle = isRight ? '#bc13fe' : '#0aff60'; // Neon Purple vs Neon Green
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    });

    // Draw Keypoints
    frame.keypoints.forEach((kp, idx) => {
      if (kp.score > 0.5) {
        const x = kp.x * width;
        const y = kp.y * height;
        
        ctx.beginPath();
        ctx.arc(x, y, keypointRadius, 0, 2 * Math.PI);
        ctx.fillStyle = idx % 2 === 0 ? '#00f3ff' : '#ffffff'; // Blue vs White dots
        ctx.fill();
        
        // Glow
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    });

  }, [currentTime, poseData, width, height]);

  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height} 
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};
