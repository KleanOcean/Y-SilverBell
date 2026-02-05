"""
Request schemas for the SwingSymphony API.
"""
from pydantic import BaseModel, Field


class VideoUploadRequest(BaseModel):
    """Request model for video upload (metadata only, actual file is multipart)."""
    pass  # The actual file is uploaded via multipart/form-data


class ProDataRequest(BaseModel):
    """Request model for pro/reference data."""
    video_id: str = Field(..., description="Pro video ID (e.g., T01, T06)")
