"""
SwingSymphony Backend API

FastAPI backend for tennis swing video analysis with YOC44 3D skeleton detection.
"""
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.routes import analyze, jobs
from services.job_queue import start_job_queue, stop_job_queue, get_job_queue
from services.yoc44_service import YOC44Service


# Configuration
API_VERSION = "v1"
API_TITLE = "SwingSymphony API"
API_DESCRIPTION = """
Tennis swing video analysis with YOC44 3D skeleton detection.

## Features
- Upload tennis swing videos for analysis
- Get 3D skeleton data (44 joints per frame)
- Rhythm and kinetic chain analysis
- Compare with pro reference swings
- Real-time job status updates

## YOC44 Format
Returns 3D pose data with 44 joints per frame in normalized coordinates [-1, 1].

## Job Flow
1. POST /api/v1/analyze - Upload video, get job_id
2. GET /api/v1/jobs/{job_id} - Poll for status
3. When complete, response contains full SwingData with 3D poses
"""

# Path to skeleton data (optional, for pro/reference data)
SKELETON_DATA_PATH = Path(__file__).parent.parent / "skeleton_viewer_standalone" / "skeleton_data.json"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    print("Starting SwingSymphony API...")

    # Initialize YOC44 service
    data_path = str(SKELETON_DATA_PATH) if SKELETON_DATA_PATH.exists() else None
    yoc44_service = YOC44Service(data_path=data_path)
    app.state.yoc44_service = yoc44_service

    # Configure job queue processor
    queue = get_job_queue()

    async def process_job(job):
        return await yoc44_service.analyze_video(
            video_path=job.video_path,
            swing_id=job.swing_id,
            user_type=job.user_type
        )

    queue.set_processor(process_job)
    await start_job_queue()

    print("SwingSymphony API ready!")

    yield

    # Shutdown
    print("Shutting down SwingSymphony API...")
    await stop_job_queue()
    print("Shutdown complete.")


# Create FastAPI app
app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS - allow all localhost ports
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:3004",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003",
    "http://127.0.0.1:3004",
]

# Allow frontend origin from environment if set
if frontend_origin := os.getenv("FRONTEND_ORIGIN"):
    origins.append(frontend_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(analyze.router)
app.include_router(jobs.router)

# Mount static files for uploaded videos
storage_dir = Path(__file__).parent / "storage"
(storage_dir / "uploaded").mkdir(parents=True, exist_ok=True)
app.mount("/videos", StaticFiles(directory=str(storage_dir / "uploaded")), name="videos")


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": API_TITLE,
        "version": API_VERSION,
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "submit": "POST /api/v1/analyze",
            "status": "GET /api/v1/jobs/{job_id}",
            "wait": "GET /api/v1/jobs/{job_id}/wait",
            "stats": "GET /api/v1/stats",
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    queue = get_job_queue()
    stats = queue.get_stats()
    return {
        "status": "healthy",
        "queue": stats
    }


if __name__ == "__main__":
    import uvicorn

    # Run with auto-reload for development
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
