"""
Video analysis API routes.

Handles video upload and swing analysis.
"""
import os
import shutil
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, status
from fastapi.responses import FileResponse

from api.models.requests import VideoUploadRequest
from api.models.responses import JobSubmitResponse
from services.job_queue import get_job_queue


router = APIRouter(prefix="/api/v1", tags=["analyze"])

# Storage paths
UPLOAD_DIR = Path(__file__).parent.parent.parent / "storage" / "uploaded"
RESULTS_DIR = Path(__file__).parent.parent.parent / "storage" / "results"

# Ensure directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/analyze", response_model=JobSubmitResponse, status_code=status.HTTP_202_ACCEPTED)
async def submit_analysis(
    video: UploadFile = File(..., description="Video file to analyze")
) -> JobSubmitResponse:
    """
    Submit a video for swing analysis.

    Uploads a tennis swing video and queues it for processing.
    Returns a job ID that can be used to poll for results.

    Accepted formats: mp4, mov, avi, webm
    Max file size: 100MB
    """
    # Validate file type
    allowed_extensions = {".mp4", ".mov", ".avi", ".webm"}
    file_ext = Path(video.filename).suffix.lower() if video.filename else ""

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )

    # Validate file size (approximate check before reading)
    # Note: FastAPI handles this via content-length header

    # Generate unique swing ID
    import uuid
    swing_id = f"swing-{uuid.uuid4().hex[:8]}"

    # Save uploaded file
    video_path = UPLOAD_DIR / f"{swing_id}{file_ext}"

    try:
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save video: {str(e)}"
        )

    # Submit job to queue
    queue = get_job_queue()
    job = await queue.submit_job(
        video_path=str(video_path),
        swing_id=swing_id,
        user_type="USER"
    )

    return JobSubmitResponse(
        job_id=job.job_id,
        status=job.status.value,
        message=f"Video uploaded for analysis (Job ID: {job.job_id})"
    )


@router.get("/videos/{swing_id}")
async def get_video(swing_id: str) -> FileResponse:
    """
    Get an uploaded video file by swing ID.

    Returns the video file for playback in the frontend.
    """
    # Find the video file (try common extensions)
    for ext in [".mp4", ".mov", ".avi", ".webm"]:
        video_path = UPLOAD_DIR / f"{swing_id}{ext}"
        if video_path.exists():
            return FileResponse(
                path=video_path,
                media_type="video/mp4",
                filename=f"{swing_id}{ext}"
            )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Video not found: {swing_id}"
    )
