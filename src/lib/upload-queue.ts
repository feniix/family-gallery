import { withLock } from './json-locking';

/**
 * Upload job interface
 */
export interface UploadJob {
  id: string;
  filename: string;
  type: 'image' | 'video';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: {
    size: number;
    originalName: string;
    uploadedBy: string;
  };
}

/**
 * Upload queue manager
 */
class UploadQueueManager {
  private jobs: Map<string, UploadJob> = new Map();
  private processing: Set<string> = new Set();
  private maxConcurrent: number = 3;

  /**
   * Add a new upload job to the queue
   * @param job - Upload job to add
   */
  async addJob(job: UploadJob): Promise<void> {
    this.jobs.set(job.id, { ...job, status: 'pending', progress: 0 });
    await this.processNext();
  }

  /**
   * Get job status
   * @param jobId - Job ID
   * @returns Job status or null if not found
   */
  getJob(jobId: string): UploadJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs for a user
   * @param userId - User ID
   * @returns Array of user's jobs
   */
  getUserJobs(userId: string): UploadJob[] {
    return Array.from(this.jobs.values())
      .filter(job => job.metadata?.uploadedBy === userId)
      .sort((a, b) => (b.startedAt?.getTime() || 0) - (a.startedAt?.getTime() || 0));
  }

  /**
   * Update job progress
   * @param jobId - Job ID
   * @param progress - Progress percentage (0-100)
   */
  updateProgress(jobId: string, progress: number): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = Math.min(100, Math.max(0, progress));
      this.jobs.set(jobId, job);
    }
  }

  /**
   * Mark job as completed
   * @param jobId - Job ID
   */
  completeJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      this.jobs.set(jobId, job);
      this.processing.delete(jobId);
    }
    this.processNext();
  }

  /**
   * Mark job as failed
   * @param jobId - Job ID
   * @param error - Error message
   */
  failJob(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = error;
      job.completedAt = new Date();
      this.jobs.set(jobId, job);
      this.processing.delete(jobId);
    }
    this.processNext();
  }

  /**
   * Remove old completed/failed jobs (keep last 24 hours)
   */
  cleanup(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.completedAt &&
        job.completedAt < cutoff
      ) {
        this.jobs.delete(jobId);
      }
    }
  }

  /**
   * Process next job in queue if capacity available
   */
  private async processNext(): Promise<void> {
    if (this.processing.size >= this.maxConcurrent) {
      return; // At capacity
    }

    // Find next pending job
    const pendingJob = Array.from(this.jobs.values())
      .find(job => job.status === 'pending');

    if (!pendingJob) {
      return; // No pending jobs
    }

    // Start processing
    pendingJob.status = 'processing';
    pendingJob.startedAt = new Date();
    this.processing.add(pendingJob.id);
    this.jobs.set(pendingJob.id, pendingJob);

    // In a real implementation, this would trigger the actual upload process
    // For now, we just mark the job structure as ready
  }

  /**
   * Cancel a job (if still pending)
   * @param jobId - Job ID to cancel
   * @returns true if cancelled, false if already processing/completed
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'pending') {
      this.jobs.delete(jobId);
      return true;
    }
    return false;
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  } {
    const jobs = Array.from(this.jobs.values());
    return {
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      total: jobs.length,
    };
  }
}

// Global upload queue instance
export const uploadQueue = new UploadQueueManager();

/**
 * Create a unique job ID
 */
export function createJobId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substring(2)}`;
}

/**
 * Execute an upload operation with queue management
 * @param jobId - Upload job ID
 * @param operation - Upload operation to execute
 * @returns Promise that resolves when upload completes
 */
export async function executeUpload<T>(
  jobId: string,
  operation: (progressCallback: (progress: number) => void) => Promise<T>
): Promise<T> {
  try {
    const result = await operation((progress) => {
      uploadQueue.updateProgress(jobId, progress);
    });
    
    uploadQueue.completeJob(jobId);
    return result;
  } catch (error) {
    uploadQueue.failJob(jobId, error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Utility to wait for all uploads to complete
 * @param timeoutMs - Maximum time to wait in milliseconds
 * @returns Promise that resolves when all uploads complete or timeout
 */
export async function waitForUploadsComplete(timeoutMs: number = 30000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const stats = uploadQueue.getStats();
    if (stats.pending === 0 && stats.processing === 0) {
      return; // All done
    }
    
    // Wait a bit before checking again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Upload timeout: ${uploadQueue.getStats().processing} uploads still processing`);
} 