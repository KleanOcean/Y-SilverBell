"""
Response schemas for the SwingSymphony API.
Matches the frontend TypeScript types in swingsymphony/types.ts.
"""
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


# ============== Basic Keypoint Types ==============

class Keypoint2D(BaseModel):
    """2D keypoint in COCO format (normalized 0-1)."""
    x: float = Field(..., ge=0, le=1, description="Normalized X coordinate")
    y: float = Field(..., ge=0, le=1, description="Normalized Y coordinate")
    score: float = Field(..., ge=0, le=1, description="Confidence score")
    name: Optional[str] = Field(None, description="Joint name")


class Keypoint3D(BaseModel):
    """3D keypoint in YOC44 format (normalized -1 to 1)."""
    x: float = Field(..., ge=-1, le=1, description="Normalized X coordinate")
    y: float = Field(..., ge=-1, le=1, description="Normalized Y coordinate")
    z: float = Field(..., ge=-1, le=1, description="Normalized Z coordinate")
    score: float = Field(..., ge=0, le=1, description="Confidence score")
    name: Optional[str] = Field(None, description="Joint name")


class PoseFrame2D(BaseModel):
    """A single frame of 2D pose data (17 COCO joints)."""
    timestamp: float = Field(..., description="Timestamp in seconds")
    keypoints: List[Keypoint2D] = Field(..., min_length=17, max_length=17)


class PoseFrame3D(BaseModel):
    """A single frame of 3D pose data (44 YOC44 joints)."""
    timestamp: float = Field(..., description="Timestamp in seconds")
    keypoints: List[Keypoint3D] = Field(..., min_length=44, max_length=44)


# ============== Rhythm and Kinetic Data ==============

class RhythmNode(BaseModel):
    """Rhythm event mapped to kinetic chain."""
    id: str = Field(..., description="Unique node ID")
    timestamp: float = Field(..., ge=0, description="Timestamp in seconds")
    intensity: float = Field(..., ge=0, le=1, description="Intensity 0-1")
    type: Literal["KICK", "BASS", "SNARE", "CRASH"] = Field(
        ..., description="Mapped to: Legs, Hips, Shoulders, Arms"
    )
    label: str = Field(..., description="Human-readable label")


class KineticDataPoint(BaseModel):
    """Kinetic analysis data point."""
    time: float = Field(..., ge=0, description="Time in seconds")
    velocity: float = Field(..., description="Velocity magnitude")
    jerk: float = Field(..., description="Smoothness metric (lower is smoother)")


# ============== Main Response Types ==============

class JobSubmitResponse(BaseModel):
    """Response when submitting a video for analysis."""
    job_id: str = Field(..., description="Unique job identifier")
    status: Literal["pending", "processing", "completed", "failed"] = Field(
        ..., description="Current job status"
    )
    message: str = Field(..., description="Status message")


class JobStatusResponse(BaseModel):
    """Response for job status queries."""
    job_id: str = Field(..., description="Unique job identifier")
    status: Literal["pending", "processing", "completed", "failed"] = Field(
        ..., description="Current job status"
    )
    progress: int = Field(..., ge=0, le=100, description="Progress percentage")
    message: str = Field(..., description="Status message")
    result: Optional["SwingDataResponse"] = Field(None, description="Analysis result when completed")
    error: Optional[str] = Field(None, description="Error message if failed")


class SwingDataResponse(BaseModel):
    """Complete swing analysis result matching frontend SwingData type."""
    id: str = Field(..., description="Swing ID")
    userType: Literal["USER", "PRO"] = Field(..., description="User or Pro data")
    videoUrl: Optional[str] = Field(None, description="URL to uploaded video")
    duration: float = Field(..., gt=0, description="Duration in seconds")

    # 2D COCO format (17 joints) - for backward compatibility
    poseData: List[PoseFrame2D] = Field(
        ..., description="Sequence of 2D pose frames"
    )

    # 3D YOC44 format (44 joints)
    poseData3D: List[PoseFrame3D] = Field(
        ..., description="Sequence of 3D pose frames"
    )

    # Metadata
    frames: int = Field(..., gt=0, description="Total number of frames")
    fps: float = Field(..., gt=0, description="Frames per second")
    impact_frame: int = Field(..., ge=0, description="Frame index of ball impact")

    # Analysis results
    score: int = Field(..., ge=0, le=100, description="Overall harmony score 0-100")
    feedback: str = Field(..., description="AI coach feedback")
    rhythmTrack: List[RhythmNode] = Field(..., description="Kinetic chain sequence")
    velocityData: List[KineticDataPoint] = Field(..., description="Motion smoothness data")


class ProDataResponse(BaseModel):
    """Response for pro/reference data."""
    video_id: str = Field(..., description="Pro video ID")
    level: str = Field(..., description="Skill level (beginner, intermediate, advanced, elite)")
    identity: str = Field(..., description="Player description")
    frames: int = Field(..., gt=0, description="Total number of frames")
    fps: float = Field(..., gt=0, description="Frames per second")
    impact_frame: int = Field(..., ge=0, description="Frame index of ball impact")
    pose_3d: List[List[List[float]]] = Field(
        ..., description="3D pose data as (N, 44, 3) array"
    )


# Forward reference resolution
JobStatusResponse.model_rebuild()
