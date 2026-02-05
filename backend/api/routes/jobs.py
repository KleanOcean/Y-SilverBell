"""
Job status API routes.

Handles job status queries and pro data retrieval.
"""
from typing import Optional

from fastapi import APIRouter, HTTPException, status, Query, Request

from api.models.requests import ProDataRequest
from api.models.responses import JobStatusResponse, ProDataResponse
from services.job_queue import get_job_queue


router = APIRouter(prefix="/api/v1", tags=["jobs"])


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str) -> JobStatusResponse:
    """
    Get the status of an analysis job.

    Poll this endpoint to check job progress and retrieve results when complete.
    """
    queue = get_job_queue()
    job = await queue.get_job(job_id)

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job not found: {job_id}"
        )

    return job.to_response()


@router.get("/jobs/{job_id}/wait", response_model=JobStatusResponse)
async def wait_for_job(
    job_id: str,
    timeout: Optional[float] = Query(30.0, description="Max wait time in seconds")
) -> JobStatusResponse:
    """
    Wait for a job to complete (long polling).

    This endpoint will wait up to `timeout` seconds for the job to complete
    before returning. Useful for reducing polling overhead.

    Returns as soon as the job completes or times out.
    """
    import asyncio

    queue = get_job_queue()
    job = await queue.get_job(job_id)

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job not found: {job_id}"
        )

    # Wait for completion or timeout
    start_time = asyncio.get_event_loop().time()
    check_interval = 0.5  # Check every 500ms

    while job.status.value in ["pending", "processing"]:
        elapsed = asyncio.get_event_loop().time() - start_time
        if elapsed >= timeout:
            break

        await asyncio.sleep(check_interval)
        # Refresh job from queue
        job = await queue.get_job(job_id)
        if job is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job not found: {job_id}"
            )

    return job.to_response()


@router.get("/models")
async def list_models(request: Request):
    """
    List available model codes.

    Returns list of available 3D skeleton models (T01, T02, etc.)
    """
    yoc44_service = request.app.state.yoc44_service
    models = yoc44_service.get_available_models()
    return {"models": models, "count": len(models)}


@router.get("/models/{model_code}")
async def get_model_data(model_code: str, request: Request):
    """
    Get full swing data for a specific model.

    Returns complete analysis data including 3D pose, rhythm, and metrics.
    """
    import uuid

    yoc44_service = request.app.state.yoc44_service

    # Check if model exists
    metadata = yoc44_service.get_model_metadata(model_code)
    if metadata is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model not found: {model_code}"
        )

    # Generate swing data for this model
    swing_id = f"model-{model_code.lower()}-{uuid.uuid4().hex[:6]}"
    result = await yoc44_service.analyze_video(
        video_path="",
        swing_id=swing_id,
        user_type="PRO",
        model_code=model_code
    )

    return result


@router.get("/pro-data/{video_id}", response_model=ProDataResponse)
async def get_pro_data(video_id: str) -> ProDataResponse:
    """
    Get pro/reference 3D skeleton data.

    Returns pre-computed 3D skeleton data for professional players
    and reference swings. Used for comparison and battle mode.
    """
    from services.yoc44_service import YOC44Service

    # For now, return mock data or error
    # In production, this would load from skeleton_data.json
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Pro data endpoint not yet implemented. Use mock data for now."
    )


@router.get("/stats")
async def get_queue_stats():
    """
    Get job queue statistics.

    Returns information about the current state of the job queue.
    """
    queue = get_job_queue()
    return queue.get_stats()
