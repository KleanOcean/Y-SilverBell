# SwingSymphony Backend API

FastAPI backend for tennis swing video analysis with YOC44 3D skeleton detection.

## Features

- **Video Upload**: Accept tennis swing videos via multipart/form-data
- **Async Processing**: Background job queue for processing videos
- **3D Skeleton Detection**: YOC44 model returns 44 joints in 3D
- **Rhythm Analysis**: Kinetic chain sequence mapped to musical elements
- **Job Polling**: Real-time status updates via polling or long-polling
- **Pro Data**: Pre-computed 3D data for professional players

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. Run the Server

```bash
# Development with auto-reload
uvicorn main:app --reload

# Or using Python
python main.py
```

The API will be available at `http://localhost:8000`

### 4. View API Documentation

Open your browser to:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### Submit Video for Analysis

```bash
POST /api/v1/analyze
Content-Type: multipart/form-data

curl -X POST "http://localhost:8000/api/v1/analyze" \
  -F "video=@swing.mp4"
```

Response:
```json
{
  "job_id": "uuid-string",
  "status": "pending",
  "message": "Video uploaded for analysis"
}
```

### Get Job Status

```bash
GET /api/v1/jobs/{job_id}
```

Response:
```json
{
  "job_id": "uuid-string",
  "status": "completed",
  "progress": 100,
  "message": "Analysis complete",
  "result": {
    "id": "swing-abc123",
    "userType": "USER",
    "duration": 2.5,
    "poseData": [...],
    "poseData3D": [...],
    "frames": 75,
    "fps": 30.0,
    "impact_frame": 42,
    "score": 78,
    "feedback": "Hips fired too early...",
    "rhythmTrack": [...],
    "velocityData": [...]
  }
}
```

### Wait for Job (Long Polling)

```bash
GET /api/v1/jobs/{job_id}/wait?timeout=30
```

Waits up to 30 seconds for job completion before returning.

## Architecture

```
backend/
├── main.py                 # FastAPI app entry point
├── requirements.txt        # Python dependencies
├── .env.example            # Environment variables template
├── api/
│   ├── routes/
│   │   ├── analyze.py     # Video upload endpoint
│   │   └── jobs.py        # Job status endpoints
│   └── models/
│       ├── requests.py    # Request schemas
│       └── responses.py   # Response schemas
├── services/
│   ├── job_queue.py       # Async job queue
│   ├── yoc44_service.py   # YOC44 inference service
│   └── video_processor.py # Video preprocessing (future)
└── storage/
    ├── uploaded/          # Temporary video storage
    └── results/           # Analysis results
```

## Data Format

### SwingData Response

```typescript
interface SwingData {
  id: string;
  userType: 'USER' | 'PRO';
  videoUrl: string | null;
  duration: number;

  // 2D COCO format (17 joints)
  poseData: PoseFrame2D[];

  // 3D YOC44 format (44 joints)
  poseData3D: PoseFrame3D[];

  // Metadata
  frames: number;
  fps: number;
  impact_frame: number;

  // Analysis results
  score: number;        // 0-100
  feedback: string;
  rhythmTrack: RhythmNode[];
  velocityData: KineticDataPoint[];
}
```

### 3D Keypoint Format

```typescript
interface Keypoint3D {
  x: number;  // -1 to 1 (normalized)
  y: number;  // -1 to 1
  z: number;  // -1 to 1
  score: number;
  name?: string;
}
```

## Replacing Mock with Real YOC44

The current implementation uses a mock service. To use real YOC44 inference:

1. Update `services/yoc44_service.py`:
   ```python
   async def analyze_video(self, video_path: str, swing_id: str, user_type: str):
       # Replace mock with real inference
       pose_3d = await run_yoc44_inference(video_path)
       return SwingDataResponse(...)
   ```

2. Add your YOC44 model dependencies to `requirements.txt`

3. Configure model path in `.env`

## Deployment

### Production Settings

```bash
# Use production ASGI server
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker

# Or with uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Environment Variables

- `API_HOST`: Server host (default: 0.0.0.0)
- `API_PORT`: Server port (default: 8000)
- `FRONTEND_ORIGIN`: Frontend URL for CORS
- `MAX_CONCURRENT_JOBS`: Max parallel jobs (default: 3)

## Development

### Running Tests

```bash
pytest
```

### Code Style

```bash
black .
isort .
```
