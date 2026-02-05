"""
Async Job Queue Service.

This module provides an in-memory job queue for processing video analysis tasks.
It can be upgraded to use Redis for distributed processing.
"""
import asyncio
import uuid
from datetime import datetime
from typing import Dict, Optional, Callable, Awaitable
from enum import Enum

from api.models.responses import JobStatusResponse, SwingDataResponse


class JobStatus(str, Enum):
    """Job status enumeration."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Job:
    """Represents a single analysis job."""

    def __init__(
        self,
        job_id: str,
        video_path: str,
        swing_id: str,
        user_type: str = "USER"
    ):
        self.job_id = job_id
        self.video_path = video_path
        self.swing_id = swing_id
        self.user_type = user_type
        self.status = JobStatus.PENDING
        self.progress = 0
        self.message = "Job queued"
        self.result: Optional[SwingDataResponse] = None
        self.error: Optional[str] = None
        self.created_at = datetime.now()
        self.updated_at = datetime.now()

    def to_response(self) -> JobStatusResponse:
        """Convert job to API response."""
        return JobStatusResponse(
            job_id=self.job_id,
            status=self.status.value,
            progress=self.progress,
            message=self.message,
            result=self.result,
            error=self.error
        )


class JobQueue:
    """
    In-memory async job queue for video analysis.

    This is a simple implementation that stores jobs in memory.
    For production, upgrade to Redis or another distributed queue.
    """

    def __init__(self, max_concurrent_jobs: int = 3):
        """
        Initialize the job queue.

        Args:
            max_concurrent_jobs: Maximum number of jobs to process concurrently
        """
        self.jobs: Dict[str, Job] = {}
        self.max_concurrent_jobs = max_concurrent_jobs
        self._processing_tasks: set = set()
        self._processor: Optional[Callable[[Job], Awaitable[SwingDataResponse]]] = None
        self._worker_task: Optional[asyncio.Task] = None
        self._pending_queue: Optional[asyncio.Queue] = None

    def set_processor(
        self,
        processor: Callable[[Job], Awaitable[SwingDataResponse]]
    ):
        """
        Set the processor function for jobs.

        Args:
            processor: Async function that takes a Job and returns SwingDataResponse
        """
        self._processor = processor

    async def start(self):
        """Start the background worker for processing jobs."""
        if self._worker_task is None:
            self._pending_queue = asyncio.Queue()
            self._worker_task = asyncio.create_task(self._worker())
            print("Job queue worker started")

    async def stop(self):
        """Stop the background worker."""
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass
            self._worker_task = None
            print("Job queue worker stopped")

    async def submit_job(
        self,
        video_path: str,
        swing_id: str,
        user_type: str = "USER"
    ) -> Job:
        """
        Submit a new job to the queue.

        Args:
            video_path: Path to the uploaded video
            swing_id: Unique identifier for the swing
            user_type: "USER" or "PRO"

        Returns:
            The created Job object
        """
        job_id = str(uuid.uuid4())
        job = Job(
            job_id=job_id,
            video_path=video_path,
            swing_id=swing_id,
            user_type=user_type
        )
        self.jobs[job_id] = job
        await self._pending_queue.put(job)
        print(f"Job submitted: {job_id} ({swing_id})")
        return job

    async def get_job(self, job_id: str) -> Optional[Job]:
        """
        Get a job by ID.

        Args:
            job_id: Job identifier

        Returns:
            Job object or None if not found
        """
        return self.jobs.get(job_id)

    async def _worker(self):
        """Background worker that processes jobs from the queue."""
        while True:
            try:
                # Wait for a job
                job = await self._pending_queue.get()

                # Wait if we're at max concurrency
                while len(self._processing_tasks) >= self.max_concurrent_jobs:
                    await asyncio.sleep(0.1)

                # Process the job
                task = asyncio.create_task(self._process_job(job))
                self._processing_tasks.add(task)
                task.add_done_callback(self._processing_tasks.discard)

            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Worker error: {e}")

    async def _process_job(self, job: Job):
        """Process a single job."""
        try:
            job.status = JobStatus.PROCESSING
            job.progress = 10
            job.message = "Processing video..."
            job.updated_at = datetime.now()

            if self._processor is None:
                raise RuntimeError("No processor configured")

            # Run the actual analysis
            result = await self._processor(job)

            job.result = result
            job.status = JobStatus.COMPLETED
            job.progress = 100
            job.message = "Analysis complete"
            job.updated_at = datetime.now()

            print(f"Job completed: {job.job_id}")

        except Exception as e:
            job.status = JobStatus.FAILED
            job.progress = 0
            job.message = "Analysis failed"
            job.error = str(e)
            job.updated_at = datetime.now()
            print(f"Job failed: {job.job_id} - {e}")

    def get_stats(self) -> dict:
        """Get queue statistics."""
        pending = sum(1 for j in self.jobs.values() if j.status == JobStatus.PENDING)
        processing = sum(1 for j in self.jobs.values() if j.status == JobStatus.PROCESSING)
        completed = sum(1 for j in self.jobs.values() if j.status == JobStatus.COMPLETED)
        failed = sum(1 for j in self.jobs.values() if j.status == JobStatus.FAILED)

        return {
            "total": len(self.jobs),
            "pending": pending,
            "processing": processing,
            "completed": completed,
            "failed": failed,
            "queue_size": self._pending_queue.qsize() if self._pending_queue else 0
        }


# Global job queue instance
_job_queue: Optional[JobQueue] = None


def get_job_queue() -> JobQueue:
    """Get the global job queue instance."""
    global _job_queue
    if _job_queue is None:
        _job_queue = JobQueue()
    return _job_queue


async def start_job_queue():
    """Start the global job queue."""
    queue = get_job_queue()
    await queue.start()


async def stop_job_queue():
    """Stop the global job queue."""
    global _job_queue
    if _job_queue:
        await _job_queue.stop()
