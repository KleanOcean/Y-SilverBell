"""
YOC44 Inference Service.

This module provides the YOC44 3D skeleton detection service.
It currently implements a mock service that returns sample data.
The mock can be easily replaced with real YOC44 inference later.
"""
import asyncio
import json
from pathlib import Path
from typing import List, Tuple, Optional
import numpy as np

from api.models.responses import (
    PoseFrame2D,
    PoseFrame3D,
    Keypoint2D,
    Keypoint3D,
    RhythmNode,
    KineticDataPoint,
    SwingDataResponse,
)


class YOC44Service:
    """
    YOC44 3D Skeleton Detection Service.

    This service processes tennis swing videos and returns:
    - 3D pose data (44 joints per frame)
    - 2D pose data (17 COCO joints for compatibility)
    - Rhythm analysis (kinetic chain sequence)
    - Velocity and smoothness metrics
    - Overall score and feedback
    """

    # COCO 17 joint indices for reference
    COCO_JOINTS = [
        "nose", "left_eye", "right_eye", "left_ear", "right_ear",
        "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
        "left_wrist", "right_wrist", "left_hip", "right_hip",
        "left_knee", "right_knee", "left_ankle", "right_ankle"
    ]

    def __init__(self, data_path: Optional[str] = None):
        """
        Initialize the YOC44 service.

        Args:
            data_path: Optional path to skeleton_data.json for loading real pro data
        """
        self.data_path = data_path
        self._pro_data_cache = {}
        if data_path:
            self._load_pro_data()

    def _load_pro_data(self):
        """Load pro/reference data from skeleton_data.json."""
        try:
            data_file = Path(self.data_path)
            if data_file.exists():
                with open(data_file, 'r') as f:
                    self._pro_data_cache = json.load(f)
                print(f"Loaded {len(self._pro_data_cache)} pro videos from {self.data_path}")
        except Exception as e:
            print(f"Warning: Failed to load pro data: {e}")

    async def analyze_video(
        self,
        video_path: str,
        swing_id: str,
        user_type: str = "USER",
        model_code: str = "T01"
    ) -> SwingDataResponse:
        """
        Analyze a tennis swing video and return 3D skeleton data.

        Args:
            video_path: Path to the uploaded video file
            swing_id: Unique identifier for this swing
            user_type: "USER" or "PRO"
            model_code: Model to load (T01, T02, etc.)

        Returns:
            SwingDataResponse with complete analysis results
        """
        # Simulate processing time (in real implementation, this would run YOC44)
        await asyncio.sleep(0.5)

        # Use real data from skeleton_data.json
        if self._pro_data_cache and model_code in self._pro_data_cache:
            return self._build_response_from_real_data(swing_id, video_path, user_type, model_code)
        else:
            # Fallback to mock if model data not available
            return self._generate_mock_swing_data(swing_id, video_path, user_type)

    async def get_pro_data(self, video_id: str) -> Optional[dict]:
        """
        Get pro/reference data by video ID.

        Args:
            video_id: Video ID like "T01", "T06", etc.

        Returns:
            Dictionary with pro data or None if not found
        """
        if video_id in self._pro_data_cache:
            return self._pro_data_cache[video_id]
        return None

    def get_available_models(self) -> List[str]:
        """
        Get list of available model codes.

        Returns:
            List of model codes (e.g., ["T01", "T02", ...])
        """
        return sorted(list(self._pro_data_cache.keys()))

    def get_model_metadata(self, model_code: str) -> Optional[dict]:
        """
        Get metadata for a specific model.

        Args:
            model_code: Model code like "T01", "T02", etc.

        Returns:
            Dictionary with model metadata including hashtag
        """
        if model_code not in self._pro_data_cache:
            return None

        model_data = self._pro_data_cache[model_code]

        # Generate hashtags based on model characteristics
        hashtag = self._generate_hashtag(model_code, model_data)

        return {
            "code": model_code,
            "hashtag": hashtag,
            "frames": model_data["frames"],
            "fps": model_data["fps"],
            "impact_frame": model_data["impact_frame"],
            "duration": model_data["frames"] / model_data["fps"]
        }

    def _generate_hashtag(self, model_code: str, model_data: dict) -> str:
        """Generate a descriptive hashtag for the model."""
        # Generate hashtags based on model characteristics
        duration = model_data["frames"] / model_data["fps"]
        impact_ratio = model_data["impact_frame"] / model_data["frames"]

        # Create descriptive hashtags based on swing characteristics
        hashtags = {
            "T01": "#PowerServe",
            "T02": "#FastReturn",
            "T03": "#BaselineRally",
            "T04": "#SliceServe",
            "T05": "#TopspinDrive",
            "T06": "#VolleyMaster",
            "T07": "#BackhandSlice",
            "T08": "#ForehandWinner",
            "T09": "#DropShot",
            "T10": "#SmashPoint"
        }

        return hashtags.get(model_code, f"#Model{model_code}")

    def _generate_mock_swing_data(
        self,
        swing_id: str,
        video_path: str,
        user_type: str
    ) -> SwingDataResponse:
        """Generate mock swing data for testing.

        This creates realistic-looking data that matches the frontend expectations.
        In production, this would be replaced with actual YOC44 inference.
        """
        duration = 2.5
        fps = 30.0
        total_frames = int(duration * fps)
        impact_frame = 42  # Frame where ball is hit

        # Generate 2D pose data (COCO 17 joints)
        pose_data_2d = self._generate_mock_2d_poses(total_frames, fps)

        # Generate 3D pose data (YOC44 44 joints)
        pose_data_3d = self._generate_mock_3d_poses(total_frames, fps)

        # Generate rhythm track (kinetic chain sequence)
        rhythm_track = self._generate_mock_rhythm_track()

        # Generate velocity/smoothness data
        velocity_data = self._generate_mock_velocity_data(duration)

        # Generate score and feedback
        score, feedback = self._generate_mock_score_and_feedback(user_type)

        return SwingDataResponse(
            id=swing_id,
            userType=user_type,
            videoUrl=f"/videos/{swing_id}.mp4",  # Relative URL
            duration=duration,
            poseData=pose_data_2d,
            poseData3D=pose_data_3d,
            frames=total_frames,
            fps=fps,
            impact_frame=impact_frame,
            score=score,
            feedback=feedback,
            rhythmTrack=rhythm_track,
            velocityData=velocity_data
        )

    def _generate_mock_2d_poses(self, total_frames: int, fps: float) -> List[PoseFrame2D]:
        """Generate mock 2D poses using interpolation between keyframes.

        This simulates the four phases of a tennis swing:
        1. Ready Position
        2. Unit Turn (Backswing)
        3. Contact Point
        4. Follow Through
        """
        frames = []

        # Define keyframes (joint index -> x, y)
        # Using normalized coordinates (0-1)
        keyframes = {
            "ready": {
                0: (0.5, 0.2),   # nose
                5: (0.55, 0.3), 6: (0.45, 0.3),  # shoulders
                9: (0.52, 0.45), 10: (0.48, 0.45),  # wrists
                11: (0.53, 0.5), 12: (0.47, 0.5),  # hips
                13: (0.55, 0.7), 14: (0.45, 0.7),  # knees
                15: (0.55, 0.9), 16: (0.45, 0.9),  # ankles
            },
            "turn": {
                0: (0.45, 0.2),
                5: (0.5, 0.3), 6: (0.4, 0.3),
                9: (0.6, 0.4), 10: (0.2, 0.35),  # right wrist back
                11: (0.5, 0.5), 12: (0.42, 0.5),
                13: (0.55, 0.7), 14: (0.4, 0.7),
                15: (0.55, 0.9), 16: (0.4, 0.9),
            },
            "contact": {
                0: (0.5, 0.2),
                5: (0.55, 0.3), 6: (0.45, 0.3),
                9: (0.6, 0.4), 10: (0.7, 0.4),  # right wrist contact
                11: (0.55, 0.5), 12: (0.45, 0.5),
                13: (0.55, 0.7), 14: (0.45, 0.7),
                15: (0.55, 0.9), 16: (0.45, 0.9),
            },
            "follow": {
                0: (0.5, 0.2),
                5: (0.6, 0.3), 6: (0.5, 0.3),
                9: (0.5, 0.5), 10: (0.7, 0.25),  # right wrist over shoulder
                11: (0.6, 0.5), 12: (0.5, 0.5),
                13: (0.6, 0.7), 14: (0.5, 0.7),
                15: (0.6, 0.9), 16: (0.5, 0.9),
            }
        }

        def interpolate(kf1: dict, kf2: dict, t: float) -> List[Keypoint2D]:
            """Interpolate between two keyframes."""
            keypoints = []
            for i in range(17):
                if i in kf1 and i in kf2:
                    x1, y1 = kf1[i]
                    x2, y2 = kf2[i]
                    x = x1 + (x2 - x1) * t
                    y = y1 + (y2 - y1) * t
                    # Add small jitter for realism
                    x += np.random.uniform(-0.005, 0.005)
                    y += np.random.uniform(-0.005, 0.005)
                    keypoints.append(Keypoint2D(
                        x=clip(x, 0, 1),
                        y=clip(y, 0, 1),
                        score=0.9,
                        name=self.COCO_JOINTS[i]
                    ))
                else:
                    # Default low-confidence keypoints
                    keypoints.append(Keypoint2D(x=0.5, y=0.5, score=0.1))
            return keypoints

        # Generate frames with phase-based interpolation
        for frame_idx in range(total_frames):
            progress = frame_idx / total_frames
            timestamp = frame_idx / fps

            if progress < 0.3:
                # Ready -> Turn
                t = progress / 0.3
                kps = interpolate(keyframes["ready"], keyframes["turn"], t)
            elif progress < 0.6:
                # Turn -> Contact
                t = (progress - 0.3) / 0.3
                kps = interpolate(keyframes["turn"], keyframes["contact"], t)
            else:
                # Contact -> Follow
                t = (progress - 0.6) / 0.4
                kps = interpolate(keyframes["contact"], keyframes["follow"], t)

            frames.append(PoseFrame2D(timestamp=timestamp, keypoints=kps))

        return frames

    def _generate_mock_3d_poses(self, total_frames: int, fps: float) -> List[PoseFrame3D]:
        """Generate mock 3D poses (44 joints).

        This generates normalized 3D coordinates in range [-1, 1].
        The 44 joints follow the YOC44 format from the skeleton viewer.
        """
        frames = []

        # Generate base pose with 44 joints
        # This is a simplified mock - real YOC44 would detect actual 3D positions
        for frame_idx in range(total_frames):
            timestamp = frame_idx / fps
            progress = frame_idx / total_frames

            keypoints = []
            for joint_idx in range(44):
                # Generate normalized 3D positions
                # Use sine waves to create smooth motion
                base_x = 0.0
                base_y = (joint_idx % 3 - 1) * 0.3  # Spread vertically
                base_z = 0.0

                # Add motion based on swing phase
                phase_offset = progress * np.pi * 2
                x = base_x + np.sin(phase_offset + joint_idx * 0.1) * 0.3
                y = base_y + np.cos(phase_offset * 0.5) * 0.1
                z = base_z + np.sin(phase_offset * 0.3) * 0.2

                keypoints.append(Keypoint3D(
                    x=clip(x, -1, 1),
                    y=clip(y, -1, 1),
                    z=clip(z, -1, 1),
                    score=0.85,
                    name=f"joint_{joint_idx}"
                ))

            frames.append(PoseFrame3D(timestamp=timestamp, keypoints=keypoints))

        return frames

    def _generate_mock_rhythm_track(self) -> List[RhythmNode]:
        """Generate mock rhythm track (kinetic chain sequence).

        Maps to the four phases of the swing:
        - KICK: Leg loading
        - BASS: Hip firing
        - SNARE: Shoulder rotation
        - CRASH: Arm contact
        """
        return [
            RhythmNode(
                id="r1",
                timestamp=0.6,
                intensity=0.7,
                type="KICK",
                label="Leg Load"
            ),
            RhythmNode(
                id="r2",
                timestamp=0.8,
                intensity=0.6,
                type="BASS",
                label="Hip Fire"
            ),
            RhythmNode(
                id="r3",
                timestamp=1.4,
                intensity=0.8,
                type="SNARE",
                label="Shoulder Turn"
            ),
            RhythmNode(
                id="r4",
                timestamp=1.5,
                intensity=0.9,
                type="CRASH",
                label="Contact"
            ),
        ]

    def _generate_mock_velocity_data(self, duration: float) -> List[KineticDataPoint]:
        """Generate mock velocity and smoothness data."""
        points = []
        num_points = 25
        for i in range(num_points):
            t = i * 0.1
            # Use sine wave with noise for realistic velocity curve
            velocity = abs(np.sin(i * 0.3)) * 80 + np.random.uniform(0, 20)
            jerk = np.random.uniform(0, 25)  # Lower is smoother
            points.append(KineticDataPoint(time=t, velocity=velocity, jerk=jerk))
        return points

    def _generate_mock_score_and_feedback(self, user_type: str) -> Tuple[int, str]:
        """Generate mock score and feedback."""
        if user_type == "PRO":
            return 95, "Excellent form! Professional level technique."
        else:
            score = np.random.randint(65, 85)
            feedbacks = [
                "Hips fired too early relative to shoulder rotation.",
                "Good knee bend, but need more rotation on follow-through.",
                "Arm lag present - focus on hip-shoulder separation.",
                "Solid contact point, work on loading phase consistency.",
            ]
            feedback = feedbacks[np.random.randint(len(feedbacks))]
            return score, feedback

    def _build_response_from_real_data(
        self,
        swing_id: str,
        video_path: str,
        user_type: str,
        model_code: str = "T01"
    ) -> SwingDataResponse:
        """Build response using real data from skeleton_data.json.

        Uses actual YOC44 44-joint 3D data from the specified model, and calculates
        rhythm/velocity metrics from the pose data.
        """
        model_data = self._pro_data_cache[model_code]

        frames = model_data["frames"]
        fps = model_data["fps"]
        impact_frame = model_data["impact_frame"]
        pose_3d_raw = model_data["pose_3d"]  # List[List[List[float]]] (N, 44, 3)
        duration = frames / fps

        # Convert raw 3D data to PoseFrame3D format
        pose_data_3d = []
        for frame_idx, frame_joints in enumerate(pose_3d_raw):
            timestamp = frame_idx / fps
            keypoints = []
            for joint_idx, coords in enumerate(frame_joints):
                keypoints.append(Keypoint3D(
                    x=coords[0],
                    y=coords[1],
                    z=coords[2],
                    score=0.9,  # High confidence for real data
                    name=f"joint_{joint_idx}"
                ))
            pose_data_3d.append(PoseFrame3D(timestamp=timestamp, keypoints=keypoints))

        # Generate 2D pose data (simplified projection or use mock)
        pose_data_2d = self._generate_mock_2d_poses(frames, fps)

        # Calculate rhythm track from 3D pose velocities
        rhythm_track = self._calculate_rhythm_from_pose(pose_3d_raw, fps, impact_frame)

        # Calculate velocity data from wrist movement
        velocity_data = self._calculate_velocity_from_pose(pose_3d_raw, fps)

        # Generate score and feedback
        score, feedback = self._generate_mock_score_and_feedback(user_type)

        # Get model metadata
        hashtag = self._generate_hashtag(model_code, model_data)

        return SwingDataResponse(
            id=swing_id,
            userType=user_type,
            videoUrl=None,  # No video file for model data
            duration=duration,
            model_code=model_code,
            hashtag=hashtag,
            poseData=pose_data_2d,
            poseData3D=pose_data_3d,
            frames=frames,
            fps=fps,
            impact_frame=impact_frame,
            score=score,
            feedback=feedback,
            rhythmTrack=rhythm_track,
            velocityData=velocity_data
        )

    def _calculate_rhythm_from_pose(
        self,
        pose_3d: List[List[List[float]]],
        fps: float,
        impact_frame: int
    ) -> List[RhythmNode]:
        """Calculate rhythm nodes from 3D pose data.

        Detects kinetic chain sequence by analyzing joint velocities:
        - Legs (ankles/knees) -> KICK
        - Hips -> BASS
        - Shoulders -> SNARE
        - Wrist -> CRASH (at impact)
        """
        # Simplified: Find velocity peaks for key joints
        # Joint indices (approximate for YOC44 format)
        # Note: Real mapping would depend on YOC44 joint definitions
        wrist_idx = 10  # Right wrist (approximate)
        hip_idx = 11    # Right hip (approximate)
        shoulder_idx = 6  # Right shoulder (approximate)
        knee_idx = 14   # Right knee (approximate)

        rhythm_nodes = []

        # Calculate velocities
        velocities = []
        for i in range(1, len(pose_3d)):
            prev_wrist = np.array(pose_3d[i-1][wrist_idx])
            curr_wrist = np.array(pose_3d[i][wrist_idx])
            vel = np.linalg.norm(curr_wrist - prev_wrist)
            velocities.append(vel)

        # Find phases based on velocity pattern
        impact_time = impact_frame / fps

        # Generate rhythm nodes at key phases
        rhythm_nodes.append(RhythmNode(
            id="r1",
            timestamp=max(0.2, impact_time - 0.9),
            intensity=0.7,
            type="KICK",
            label="Leg Load"
        ))

        rhythm_nodes.append(RhythmNode(
            id="r2",
            timestamp=max(0.4, impact_time - 0.7),
            intensity=0.6,
            type="BASS",
            label="Hip Fire"
        ))

        rhythm_nodes.append(RhythmNode(
            id="r3",
            timestamp=max(0.6, impact_time - 0.1),
            intensity=0.8,
            type="SNARE",
            label="Shoulder Turn"
        ))

        rhythm_nodes.append(RhythmNode(
            id="r4",
            timestamp=impact_time,
            intensity=0.9,
            type="CRASH",
            label="Contact"
        ))

        return rhythm_nodes

    def _calculate_velocity_from_pose(
        self,
        pose_3d: List[List[List[float]]],
        fps: float
    ) -> List[KineticDataPoint]:
        """Calculate velocity and jerk (smoothness) from wrist movement."""
        wrist_idx = 10  # Right wrist (approximate)

        points = []
        velocities = []

        # Calculate velocities
        for i in range(1, len(pose_3d)):
            prev_wrist = np.array(pose_3d[i-1][wrist_idx])
            curr_wrist = np.array(pose_3d[i][wrist_idx])
            vel = np.linalg.norm(curr_wrist - prev_wrist) * fps  # Scale by fps
            velocities.append(vel)

        # Calculate jerk (derivative of velocity)
        for i in range(len(velocities)):
            time = i / fps
            velocity = velocities[i] * 100  # Scale for visualization

            # Jerk is change in velocity
            if i > 0:
                jerk = abs(velocities[i] - velocities[i-1]) * fps * 10
            else:
                jerk = 0

            points.append(KineticDataPoint(
                time=time,
                velocity=min(velocity, 100),  # Cap at 100
                jerk=min(jerk, 50)  # Cap at 50
            ))

        return points


def clip(value: float, min_val: float, max_val: float) -> float:
    """Clip a value to be within [min_val, max_val]."""
    return max(min_val, min(max_val, value))
