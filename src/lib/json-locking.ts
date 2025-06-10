import NodeCache from 'node-cache';

// Cache instance for storing locks
// TTL of 60 seconds to prevent deadlocks if something goes wrong
const lockCache = new NodeCache({ stdTTL: 60, checkperiod: 10 });

/**
 * Acquire a lock for a specific resource
 * @param resourceId - Unique identifier for the resource to lock
 * @param timeoutMs - Maximum time to wait for lock acquisition (default: 10 seconds)
 * @returns Promise that resolves when lock is acquired
 */
export async function acquireLock(resourceId: string, timeoutMs: number = 10000): Promise<void> {
  const lockKey = `lock_${resourceId}`;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    // Try to acquire the lock
    const acquired = lockCache.set(lockKey, true, 60); // 60 second TTL
    
    if (acquired) {
      return; // Lock acquired successfully
    }

    // Wait a bit before trying again
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
  }

  throw new Error(`Failed to acquire lock for resource: ${resourceId} after ${timeoutMs}ms`);
}

/**
 * Release a lock for a specific resource
 * @param resourceId - Unique identifier for the resource to unlock
 */
export function releaseLock(resourceId: string): void {
  const lockKey = `lock_${resourceId}`;
  lockCache.del(lockKey);
}

/**
 * Execute a function with exclusive access to a resource
 * @param resourceId - Unique identifier for the resource
 * @param fn - Function to execute while holding the lock
 * @param timeoutMs - Maximum time to wait for lock acquisition
 * @returns Promise that resolves with the function's return value
 */
export async function withLock<T>(
  resourceId: string,
  fn: () => Promise<T>,
  timeoutMs: number = 10000
): Promise<T> {
  await acquireLock(resourceId, timeoutMs);
  
  try {
    return await fn();
  } finally {
    releaseLock(resourceId);
  }
}

/**
 * Check if a resource is currently locked
 * @param resourceId - Unique identifier for the resource
 * @returns boolean indicating if the resource is locked
 */
export function isLocked(resourceId: string): boolean {
  const lockKey = `lock_${resourceId}`;
  return lockCache.has(lockKey);
}

/**
 * Clear all locks (use with caution, mainly for testing)
 */
export function clearAllLocks(): void {
  lockCache.flushAll();
} 