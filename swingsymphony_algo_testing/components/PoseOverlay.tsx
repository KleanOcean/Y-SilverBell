import React, { useEffect, useRef } from 'react';
import { PoseFrame } from '../types';

interface Props {
  poseData: PoseFrame[];
  currentTime: number;
  width?: number;
  height?: number;
}

const SKELETON_CONNECTIONS = [
  [1, 3], [1, 0], [2, 4], [2, 0], [0, 5], [0, 6],
  [5, 7], [7, 9],
  [6, 8], [8, 10],
  [5, 6], [5, 11], [6, 12], [11, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16]
];

export const PoseOverlay: React.FC<Props> = ({ poseData, currentTime, width = 380, height = 380 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (poseData.length === 0) return;

    const frame = poseData.reduce((prev, curr) =>
      Math.abs(curr.timestamp - currentTime) < Math.abs(prev.timestamp - currentTime) ? curr : prev
    );

    if (!frame || Math.abs(frame.timestamp - currentTime) > 0.2) return;

    const getCoord = (idx: number) => {
      const kp = frame.keypoints[idx];
      return kp ? { x: kp.x * width, y: kp.y * height, score: kp.score } : null;
    };

    SKELETON_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const start = getCoord(startIdx);
      const end = getCoord(endIdx);
      if (start && end && start.score > 0.5 && end.score > 0.5) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = startIdx % 2 === 0 ? '#bc13fe' : '#0aff60';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    });

    frame.keypoints.forEach((kp, idx) => {
      if (kp.score > 0.5) {
        const x = kp.x * width;
        const y = kp.y * height;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = idx % 2 === 0 ? '#00f3ff' : '#ffffff';
        ctx.fill();
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
      className="w-full h-full"
    />
  );
};
