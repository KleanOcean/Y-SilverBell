/**
 * API Service for SwingSymphony Backend
 *
 * Handles communication with the FastAPI backend for video analysis.
 * Replaces the mock service with real API calls.
 */

import { SwingData, JobResponse, JobStatus } from '../types';

// Use nullish coalescing to allow empty string (for proxy mode)
// Empty string means use relative URLs (proxied by Vite)
// undefined/null means fallback to direct connection
const API_BASE_URL = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:8000';

/**
 * Test connection to the backend
 */
export async function testConnection(): Promise<boolean> {
  try {
    console.log('Testing connection to:', API_BASE_URL);
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    console.log('Health check response:', data);
    return true;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

/**
 * Submit a video for swing analysis
 *
 * @param file - Video file to analyze
 * @returns Promise with job ID and initial status
 */
export async function submitVideoAnalysis(file: File): Promise<JobResponse> {
  const formData = new FormData();
  formData.append('video', file);

  const url = `${API_BASE_URL}/api/v1/analyze`;
  console.log('Submitting to:', url);
  console.log('API_BASE_URL:', API_BASE_URL);
  console.log('File:', file.name, file.type, file.size);

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    console.log('Response status:', response.status, response.ok);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Failed to submit video for analysis');
    }

    return response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    console.error('Error type:', error instanceof TypeError ? 'TypeError' : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    // Check if it's a network error
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error(
        `Cannot connect to backend at ${API_BASE_URL}. ` +
        'Make sure the backend server is running on port 8000. ' +
        'Check browser console for CORS errors.'
      );
    }

    throw error;
  }
}

/**
 * Get job status by ID
 *
 * @param jobId - Job identifier from submitVideoAnalysis
 * @returns Promise with current job status and result if completed
 */
export async function getJobStatus(jobId: string): Promise<JobResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}`);

  if (!response.ok) {
    throw new Error('Failed to get job status');
  }

  return response.json();
}

/**
 * Wait for job completion (long polling)
 *
 * @param jobId - Job identifier
 * @param timeout - Maximum wait time in seconds (default: 30)
 * @returns Promise with completed job status and result
 */
export async function waitForJobCompletion(
  jobId: string,
  timeout: number = 30
): Promise<JobResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/jobs/${jobId}/wait?timeout=${timeout}`
  );

  if (!response.ok) {
    throw new Error('Failed to wait for job completion');
  }

  return response.json();
}

/**
 * Poll job status with callback for progress updates
 *
 * @param jobId - Job identifier
 * @param onProgress - Callback function called with each status update
 * @param interval - Polling interval in milliseconds (default: 1000)
 * @returns Promise that resolves when job is complete or failed
 */
export async function pollJobStatus(
  jobId: string,
  onProgress: (status: JobResponse) => void,
  interval: number = 1000
): Promise<SwingData> {
  let attempts = 0;
  const maxAttempts = 120; // 2 minutes at 1 second intervals

  while (attempts < maxAttempts) {
    const status = await getJobStatus(jobId);
    onProgress(status);

    if (status.status === 'completed' && status.result) {
      return status.result;
    }

    if (status.status === 'failed') {
      throw new Error(status.error || 'Analysis failed');
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, interval));
    attempts++;
  }

  throw new Error('Job timed out');
}

/**
 * Analyze swing video with automatic polling
 *
 * This is the main function to use for video analysis.
 * It handles the complete flow: upload -> poll -> return result
 *
 * @param file - Video file to analyze
 * @param onProgress - Optional callback for progress updates
 * @returns Promise with complete SwingData when analysis is complete
 */
export async function analyzeSwingVideo(
  file: File,
  onProgress?: (status: JobResponse) => void
): Promise<SwingData> {
  // Submit video
  const job = await submitVideoAnalysis(file);

  if (onProgress) {
    onProgress(job);
  }

  // Poll for completion
  const result = await pollJobStatus(job.job_id, (status) => {
    if (onProgress) {
      onProgress(status);
    }
  });

  return result;
}

/**
 * Get pro/reference data
 *
 * @param videoId - Pro video ID (e.g., "T01", "T06")
 * @returns Promise with pro skeleton data
 */
export async function getProData(videoId: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/pro-data/${videoId}`);

  if (!response.ok) {
    throw new Error('Failed to get pro data');
  }

  return response.json();
}

/**
 * Get queue statistics
 *
 * @returns Promise with queue stats
 */
export async function getQueueStats() {
  const response = await fetch(`${API_BASE_URL}/api/v1/stats`);

  if (!response.ok) {
    throw new Error('Failed to get queue stats');
  }

  return response.json();
}

/**
 * Get list of available models
 *
 * @returns Promise with list of model codes
 */
export async function listModels(): Promise<{ models: string[]; count: number }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/models`);

  if (!response.ok) {
    throw new Error('Failed to list models');
  }

  return response.json();
}

/**
 * Get swing data for a specific model
 *
 * @param modelCode - Model code (T01, T02, etc.)
 * @returns Promise with complete swing data
 */
export async function getModelData(modelCode: string): Promise<SwingData> {
  const response = await fetch(`${API_BASE_URL}/api/v1/models/${modelCode}`);

  if (!response.ok) {
    throw new Error(`Failed to get model data for ${modelCode}`);
  }

  return response.json();
}
