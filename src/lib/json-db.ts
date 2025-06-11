import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, r2Config, generateFilePath } from './r2';
import { withLock } from './json-locking';
import { dbLogger, indexLogger } from './logger';

/**
 * Ensure we're on server-side and r2Client is available
 */
function ensureR2Client() {
  if (typeof window !== 'undefined') {
    throw new Error('JSON database operations can only be performed on the server-side');
  }
  if (!r2Client) {
    throw new Error('R2 client not initialized');
  }
  return r2Client;
}

/**
 * Interface for JSON database operations
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface JsonDbOperation<T = any> {
  read(): Promise<T>;
  write(data: T): Promise<void>;
  update(updater: (current: T) => T): Promise<T>;
}

/**
 * Read a JSON file from R2
 * @param filename - The JSON filename (e.g., 'users.json', 'media/2024.json')
 * @returns Parsed JSON object or null if file doesn't exist
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readJsonFile<T = any>(filename: string): Promise<T | null> {
  try {
    dbLogger.debug(`Attempting to read file: ${filename}`);
    const client = ensureR2Client();
    const key = generateFilePath.jsonData(filename);
    dbLogger.debug(`Generated R2 key: ${key}`);
    
    const command = new GetObjectCommand({
      Bucket: r2Config.bucketName,
      Key: key,
    });

    const response = await client.send(command);
    dbLogger.debug(`GetObject response`, { filename, status: response.$metadata.httpStatusCode });
    
    if (!response.Body) {
      dbLogger.warn(`No body in response for file: ${filename}`);
      return null;
    }

    const bodyString = await response.Body.transformToString();
    dbLogger.debug(`Successfully read file`, { filename, contentLength: bodyString.length });
    
    const parsed = JSON.parse(bodyString) as T;
    if (parsed && typeof parsed === 'object' && 'media' in parsed) {
      const media = (parsed as Record<string, unknown>).media;
      const mediaCount = Array.isArray(media) ? media.length : 0;
      dbLogger.info(`Loaded media file`, { filename, mediaCount });
    }
    
    return parsed;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    dbLogger.error(`Error reading file: ${filename}`, {
      name: error.name,
      code: error.code,
      httpStatusCode: error.$metadata?.httpStatusCode,
      message: error.message
    });
    
    // If file doesn't exist, return null
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      dbLogger.debug(`File does not exist: ${filename}`);
      return null;
    }
    throw error;
  }
}

/**
 * Write a JSON file to R2
 * @param filename - The JSON filename
 * @param data - Data to write
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function writeJsonFile<T = any>(filename: string, data: T): Promise<void> {
  const client = ensureR2Client();
  const key = generateFilePath.jsonData(filename);
  const jsonString = JSON.stringify(data, null, 2);

  const command = new PutObjectCommand({
    Bucket: r2Config.bucketName,
    Key: key,
    Body: jsonString,
    ContentType: 'application/json',
  });

  await client.send(command);
}

/**
 * Atomically update a JSON file with file locking
 * @param filename - The JSON filename
 * @param updater - Function that takes current data and returns updated data
 * @param defaultValue - Default value if file doesn't exist
 * @returns Updated data
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateJsonFile<T = any>(
  filename: string,
  updater: (current: T) => T,
  defaultValue: T
): Promise<T> {
  const lockId = `json_${filename}`;
  
  return await withLock(lockId, async () => {
    // Read current data
    const currentData = await readJsonFile<T>(filename) ?? defaultValue;
    
    // Apply update
    const updatedData = updater(currentData);
    
    // Write back to R2
    await writeJsonFile(filename, updatedData);
    
    return updatedData;
  });
}

/**
 * Create a JSON database interface for a specific file
 * @param filename - The JSON filename
 * @param defaultValue - Default value if file doesn't exist
 * @returns Object with read, write, and update methods
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createJsonDb<T = any>(filename: string, defaultValue: T): JsonDbOperation<T> {
  return {
    async read(): Promise<T> {
      const data = await readJsonFile<T>(filename);
      return data ?? defaultValue;
    },

    async write(data: T): Promise<void> {
      await writeJsonFile(filename, data);
    },

    async update(updater: (current: T) => T): Promise<T> {
      return await updateJsonFile(filename, updater, defaultValue);
    },
  };
}

/**
 * Retry wrapper for JSON operations with exponential backoff
 * @param operation - The operation to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param baseDelayMs - Base delay in milliseconds (default: 1000)
 * @returns Promise that resolves with the operation result
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        break; // Don't delay on the last attempt
      }

      // Exponential backoff with jitter
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Operation failed after ${maxRetries + 1} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Specific database instances for the application
 */
import type { UsersData, ConfigData, MediaYearData, MediaIndex } from '@/types/media';

export const usersDb = createJsonDb<UsersData>('users.json', { users: {} });
export const configDb = createJsonDb<ConfigData>('config.json', { subjects: ['rufina', 'bernabe'], tags: [] });

/**
 * Media index to track which years have data
 */
export const mediaIndexDb = createJsonDb<MediaIndex>('media/index.json', { 
  years: [], 
  lastUpdated: new Date().toISOString(),
  totalMedia: 0 
});

/**
 * Get media database for a specific year
 * @param year - The year (e.g., 2024)
 * @returns JsonDbOperation for the year's media data
 */
export function getMediaDb(year: number) {
  return createJsonDb<MediaYearData>(`media/${year}.json`, { media: [] });
}

/**
 * Add a year to the media index if not already present
 */
export async function addYearToIndex(year: number): Promise<void> {
  await withRetry(() =>
    mediaIndexDb.update((current) => {
      if (!current.years.includes(year)) {
        current.years.push(year);
        current.years.sort((a, b) => b - a); // Sort descending (newest first)
      }
      current.lastUpdated = new Date().toISOString();
      return current;
    })
  );
}

/**
 * Remove a year from the media index if it has no media
 */
export async function removeYearFromIndex(year: number): Promise<void> {
  await withRetry(() =>
    mediaIndexDb.update((current) => {
      current.years = current.years.filter(y => y !== year);
      current.lastUpdated = new Date().toISOString();
      return current;
    })
  );
}

/**
 * Update total media count in index
 */
export async function updateIndexMediaCount(): Promise<void> {
  const index = await withRetry(() => mediaIndexDb.read());
  let totalMedia = 0;
  
  // Count media across all indexed years
  for (const year of index.years) {
    try {
      const yearDb = getMediaDb(year);
      const yearData = await withRetry(() => yearDb.read());
      totalMedia += yearData.media.length;
    } catch {
      // Skip years that no longer exist
    }
  }
  
  await withRetry(() =>
    mediaIndexDb.update((current) => {
      current.totalMedia = totalMedia;
      current.lastUpdated = new Date().toISOString();
      return current;
    })
  );
}

/**
 * Build media index from existing data - run once to migrate
 * This scans all possible years and builds the index
 */
export async function buildMediaIndexFromExistingData(): Promise<{ yearsFound: number[], totalMedia: number }> {
  indexLogger.info('Starting media index migration');
  
  const yearsWithData: number[] = [];
  let totalMedia = 0;
  
  // Check a reasonable range of years for existing data
  const currentYear = new Date().getFullYear();
  const startYear = 1970; // Before digital cameras, but covers scanned photos
  const endYear = currentYear + 10; // Handle future dates or timezone issues
  
  indexLogger.info(`Scanning years ${startYear} to ${endYear}`);
  
  // Check all years in parallel to find which ones have data
  const yearPromises = [];
  for (let year = startYear; year <= endYear; year++) {
    yearPromises.push(
      (async (checkYear: number) => {
        try {
          const mediaDb = getMediaDb(checkYear);
          const mediaData = await withRetry(() => mediaDb.read());
          if (mediaData.media && mediaData.media.length > 0) {
            indexLogger.debug(`Found media in year ${checkYear}`, { count: mediaData.media.length });
            return { year: checkYear, count: mediaData.media.length };
          }
        } catch {
          // Year has no data or doesn't exist
          indexLogger.trace(`No data for year ${checkYear}`);
        }
        return null;
      })(year)
    );
  }
  
  const results = await Promise.allSettled(yearPromises);
  
  // Collect years with data
  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value) {
      yearsWithData.push(result.value.year);
      totalMedia += result.value.count;
    }
  });
  
  // Sort years descending (newest first)
  yearsWithData.sort((a, b) => b - a);
  
  indexLogger.info('Migration scan complete', { 
    yearsFound: yearsWithData.length, 
    years: yearsWithData, 
    totalMedia 
  });
  
  // Update the index
  await withRetry(() =>
    mediaIndexDb.update((current) => {
      current.years = yearsWithData;
      current.totalMedia = totalMedia;
      current.lastUpdated = new Date().toISOString();
      return current;
    })
  );
  
  indexLogger.info('Media index migration completed');
  
  return { yearsFound: yearsWithData, totalMedia };
}

/**
 * Utility to ensure data directory structure exists
 * This is mainly for documentation - R2 doesn't require directory creation
 */
export const DATA_STRUCTURE = {
  users: 'users.json',
  config: 'config.json',
  media: (year: number) => `media/${year}.json`,
} as const;

 