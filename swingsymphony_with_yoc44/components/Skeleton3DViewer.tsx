/**
 * 3D Skeleton Viewer Component
 *
 * Renders YOC44 3D skeleton data using Three.js.
 * Ported from the standalone skeleton viewer.
 */

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { PoseFrame3D } from '../types';
import {
  CONNECTIONS,
  COLORS,
  getJointColor,
  normalizePoseData,
  CAMERA_PRESETS,
  calculateWristTrail,
  createTrailCurve,
} from '../services/yoc44Service';

interface Props {
  poseData3D: PoseFrame3D[];
  currentTime: number;
  duration: number;
  impactFrame?: number;
  width?: number;
  height?: number;
  className?: string;
}

export const Skeleton3DViewer: React.FC<Props> = ({
  poseData3D,
  currentTime,
  duration,
  impactFrame,
  width = 600,
  height = 600,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    joints: THREE.Mesh[];
    bones: Array<{ j1: number; j2: number; material: THREE.Material; mesh: THREE.Mesh | null }>;
    wristTrailMesh?: THREE.Mesh;
    wristTrailGlow?: THREE.Mesh;
    gridGroup?: THREE.Group;
    axesGroup?: THREE.Group;
  } | null>(null);

  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cameraView, setCameraView] = useState<keyof typeof CAMERA_PRESETS>('default');
  const [floorY, setFloorY] = useState(-1);

  // Calculate current frame index
  useEffect(() => {
    if (poseData3D.length > 0) {
      const frameIndex = Math.min(
        Math.floor((currentTime / duration) * poseData3D.length),
        poseData3D.length - 1
      );
      setCurrentFrame(frameIndex);
    }
  }, [currentTime, duration, poseData3D.length]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || poseData3D.length === 0) return;

    const container = containerRef.current;
    const { normalizedFrames, floorY: calculatedFloorY } = normalizePoseData(poseData3D, false);
    setFloorY(calculatedFloorY);

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    const preset = CAMERA_PRESETS[cameraView];
    camera.position.set(...preset.position);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.5;
    controls.maxDistance = 8;
    controls.target.set(...preset.target);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xccddff, 0x1a1a2e, 0.4);
    scene.add(hemi);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(2, 6, 2);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 15;
    dirLight.shadow.camera.left = -3;
    dirLight.shadow.camera.right = 3;
    dirLight.shadow.camera.top = 3;
    dirLight.shadow.camera.bottom = -3;
    scene.add(dirLight);

    const spotLight = new THREE.SpotLight(0xffeedd, 1.2, 10, Math.PI / 5, 0.5, 1.5);
    spotLight.position.set(0, 5, 0);
    spotLight.castShadow = true;
    scene.add(spotLight);

    const fillLight = new THREE.DirectionalLight(0x6688cc, 0.25);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    // Floor grid
    const gridGroup = new THREE.Group();
    const gridSize = 2.4;
    const gridHelper = new THREE.GridHelper(gridSize, 24, 0x2a3a5e, 0x1e2538);
    gridHelper.material.opacity = 0.5;
    gridHelper.material.transparent = true;
    gridGroup.add(gridHelper);

    const groundGeo = new THREE.PlaneGeometry(gridSize, gridSize);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.3 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    gridGroup.add(ground);
    gridGroup.position.y = calculatedFloorY;
    scene.add(gridGroup);

    // 3D Axes
    const axesGroup = new THREE.Group();
    const axisLen = 0.45;

    const xAxis = createAxis('x', 0xcc4444, axisLen);
    const yAxis = createAxis('y', 0x44cc44, axisLen);
    const zAxis = createAxis('z', 0x4444cc, axisLen);

    axesGroup.add(xAxis, yAxis, zAxis);
    axesGroup.add(createAxisLabel('X', new THREE.Vector3(axisLen + 0.08, 0, 0), '#cc4444'));
    axesGroup.add(createAxisLabel('Y', new THREE.Vector3(0, axisLen + 0.08, 0), '#44cc44'));
    axesGroup.add(createAxisLabel('Z', new THREE.Vector3(0, 0, axisLen + 0.08), '#4444cc'));
    axesGroup.position.set(-1.05, calculatedFloorY, -1.05);
    scene.add(axesGroup);

    // Create joints
    const joints: THREE.Mesh[] = [];
    const jointGeom = new THREE.SphereGeometry(0.045, 16, 16);

    for (let i = 0; i < 44; i++) {
      const color = getJointColor(i);
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.2,
        roughness: 0.4,
        metalness: 0.1,
      });
      const sphere = new THREE.Mesh(jointGeom, mat);
      sphere.castShadow = true;

      // Scale certain joints
      if ([0, 38, 43].includes(i)) sphere.scale.setScalar(1.5);
      if ([4, 7].includes(i)) sphere.scale.setScalar(1.2);

      joints.push(sphere);
      scene.add(sphere);
    }

    // Create bones
    const bones: Array<{ j1: number; j2: number; material: THREE.Material; mesh: THREE.Mesh | null }> = [];

    for (const [j1, j2] of CONNECTIONS) {
      const color = getJointColor(j2);
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.15,
        roughness: 0.4,
        metalness: 0.1,
      });
      bones.push({ j1, j2, material: mat, mesh: null });
    }

    // Store references
    sceneRef.current = {
      scene,
      camera,
      renderer,
      controls,
      joints,
      bones,
      gridGroup,
      axesGroup,
    };

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      container.removeChild(renderer.domElement);
      renderer.dispose();
      joints.forEach(j => j.geometry.dispose());
      bones.forEach(b => {
        if (b.mesh) {
          b.mesh.geometry.dispose();
        }
      });
    };
  }, [poseData3D, width, height, cameraView]); // Reinitialize if these change

  // Update frame when currentFrame changes
  useEffect(() => {
    if (!sceneRef.current || poseData3D.length === 0) return;

    const { normalizedFrames, floorY: calculatedFloorY } = normalizePoseData(poseData3D, false);
    const scene = sceneRef.current;
    const frame = normalizedFrames[Math.min(currentFrame, normalizedFrames.length - 1)];

    // Update joints
    for (let i = 0; i < 44; i++) {
      scene.joints[i].position.set(frame[i][0], frame[i][1], frame[i][2]);
    }

    // Update bones
    for (const bone of scene.bones) {
      if (bone.mesh) {
        scene.scene.remove(bone.mesh);
        bone.mesh.geometry.dispose();
      }

      const p1 = new THREE.Vector3(...frame[bone.j1]);
      const p2 = new THREE.Vector3(...frame[bone.j2]);
      const curve = new THREE.LineCurve3(p1, p2);

      bone.mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 1, 0.03, 8, false),
        bone.material as THREE.Material
      );
      bone.mesh.castShadow = true;
      scene.scene.add(bone.mesh);
    }

    // Update wrist trail
    const effectiveImpactFrame = impactFrame ?? Math.floor(poseData3D.length * 0.4);
    const trailPoints = calculateWristTrail(normalizedFrames, effectiveImpactFrame, currentFrame);

    // Remove old trail
    if (scene.wristTrailMesh) {
      scene.scene.remove(scene.wristTrailMesh);
      scene.wristTrailMesh.geometry.dispose();
      scene.wristTrailMesh = undefined;
    }
    if (scene.wristTrailGlow) {
      scene.scene.remove(scene.wristTrailGlow);
      scene.wristTrailGlow.geometry.dispose();
      scene.wristTrailGlow = undefined;
    }

    // Create new trail
    if (trailPoints.length >= 2) {
      const curve = createTrailCurve(trailPoints);
      if (curve) {
        const segments = Math.max(trailPoints.length * 3, 12);

        const trailGeo = new THREE.TubeGeometry(curve, segments, 0.025, 8, false);
        const trailMat = new THREE.MeshBasicMaterial({ color: COLORS.wristTrail });
        scene.wristTrailMesh = new THREE.Mesh(trailGeo, trailMat);
        scene.scene.add(scene.wristTrailMesh);

        const glowGeo = new THREE.TubeGeometry(curve, segments, 0.04, 8, false);
        const glowMat = new THREE.MeshBasicMaterial({
          color: COLORS.wristTrail,
          transparent: true,
          opacity: 0.25,
        });
        scene.wristTrailGlow = new THREE.Mesh(glowGeo, glowMat);
        scene.scene.add(scene.wristTrailGlow);
      }
    }
  }, [currentFrame, poseData3D, impactFrame]);

  // Handle camera view change
  useEffect(() => {
    if (!sceneRef.current) return;

    const preset = CAMERA_PRESETS[cameraView];
    const { camera, controls } = sceneRef.current;

    // Animate camera transition
    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(...preset.position);
    const startTarget = controls.target.clone();
    const endTarget = new THREE.Vector3(...preset.target);
    const duration = 600;
    const startTime = performance.now();

    const animateTransition = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t * t * (3 - 2 * t); // smoothstep

      camera.position.lerpVectors(startPos, endPos, ease);
      controls.target.lerpVectors(startTarget, endTarget, ease);
      controls.update();

      if (t < 1) {
        requestAnimationFrame(animateTransition);
      }
    };
    animateTransition();
  }, [cameraView]);

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} style={{ width, height }} />

      {/* Frame info overlay */}
      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded font-mono text-xs text-slate-400">
        Frame: {currentFrame} / {poseData3D.length - 1}
        {impactFrame !== undefined && Math.abs(currentFrame - impactFrame) <= 20 && (
          <span className="ml-2 text-yellow-400">[Impact: {impactFrame}]</span>
        )}
      </div>

      {/* Camera view buttons */}
      <div className="absolute top-2 right-2 flex gap-1">
        {Object.entries(CAMERA_PRESETS).map(([key, { name }]) => (
          <button
            key={key}
            onClick={() => setCameraView(key as keyof typeof CAMERA_PRESETS)}
            className={`px-2 py-1 text-xs rounded transition ${
              cameraView === key
                ? 'bg-neon-purple text-white'
                : 'bg-black/60 text-slate-400 hover:bg-black/80'
            }`}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
};

// Helper functions
function createAxis(dir: 'x' | 'y' | 'z', color: number, length: number): THREE.Group {
  const axisLen = length;
  const axisRadius = 0.005;
  const coneLen = 0.055;
  const coneRad = 0.018;

  const shaftGeo = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLen, 8);
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.5,
  });
  const shaft = new THREE.Mesh(shaftGeo, mat);

  const coneGeo = new THREE.ConeGeometry(coneRad, coneLen, 8);
  const cone = new THREE.Mesh(coneGeo, mat);

  const group = new THREE.Group();
  shaft.position.y = axisLen / 2;
  cone.position.y = axisLen + coneLen / 2;
  group.add(shaft, cone);

  if (dir === 'x') group.rotation.z = -Math.PI / 2;
  else if (dir === 'z') group.rotation.x = Math.PI / 2;

  return group;
}

function createAxisLabel(text: string, position: THREE.Vector3, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 32);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.copy(position);
  sprite.scale.set(0.1, 0.1, 0.1);
  return sprite;
}
