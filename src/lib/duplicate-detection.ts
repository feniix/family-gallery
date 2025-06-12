import { MediaMetadata, DuplicateCheckResult } from '@/types/media';
import { readJsonFile } from './json-db';
import { getMetadataJsonPath } from './file-naming';
import { dbLogger, duplicateLogger } from './logger';
import { maskHash } from './utils/hash-generation';

/**
 * Check if a file is a duplicate based on its hash
 */
export async function checkForDuplicate(
  hash: string,
  uploadDate: Date,
  excludeYears: number[] = []
): Promise<DuplicateCheckResult> {
  try {
    dbLogger.debug('Checking for duplicate hash', { 
      hashPrefix: maskHash(hash),
      uploadDate: uploadDate.toISOString()
    });
    
    // Check current year first
    const currentYear = uploadDate.getFullYear();
    dbLogger.debug('Checking current year for duplicates', { currentYear });
    
    const currentYearResult = await checkYearForDuplicate(hash, currentYear);
    
    if (currentYearResult.isDuplicate) {
      dbLogger.info('Duplicate found in current year', { 
        currentYear,
        hashPrefix: maskHash(hash)
      });
      return currentYearResult;
    }
    
    // Check previous and next years for potential duplicates
    const yearsToCheck = [currentYear - 1, currentYear + 1].filter(
      year => !excludeYears.includes(year) && year >= 2000 && year <= new Date().getFullYear() + 1
    );
    
    dbLogger.debug('Checking adjacent years for duplicates', { yearsToCheck });
    
    for (const year of yearsToCheck) {
      dbLogger.trace('Checking specific year', { year });
      const yearResult = await checkYearForDuplicate(hash, year);
      if (yearResult.isDuplicate) {
        dbLogger.info('Duplicate found in adjacent year', { 
          year,
          hashPrefix: maskHash(hash)
        });
        return yearResult;
      }
    }
    
    dbLogger.debug('No duplicates found', { hashPrefix: maskHash(hash) });
    return { isDuplicate: false, hash };
    
  } catch (error) {
    dbLogger.error('Error checking for duplicates', { 
      error: error instanceof Error ? error.message : error,
      hashPrefix: maskHash(hash)
    });
    // In case of error, assume not duplicate to allow upload
    return { isDuplicate: false, hash };
  }
}

/**
 * Check for duplicates within a specific year
 */
async function checkYearForDuplicate(hash: string, year: number): Promise<DuplicateCheckResult> {
  duplicateLogger.debug('Checking year for duplicates', { year, hash: maskHash(hash), uploadDate: new Date(year, 0, 1).toISOString() });
  
  try {
    const jsonPath = getMetadataJsonPath(new Date(year, 0, 1));
    duplicateLogger.debug('Looking for metadata file', { year, jsonPath });
    
    const yearData = await readJsonFile(jsonPath);
    if (!yearData || !yearData.media || yearData.media.length === 0) {
      duplicateLogger.debug('No data found for year', { year, reason: 'file_not_exist_or_empty' });
      return { isDuplicate: false, hash };
    }

    duplicateLogger.info('Found media items in year database', { year, mediaCount: yearData.media.length });
    
    duplicateLogger.debug('Files in year database', { 
      year, 
      files: yearData.media.map((media: MediaMetadata, index: number) => ({
        index: index + 1,
        filename: media.originalFilename,
        hashPrefix: media.metadata?.hash ? maskHash(media.metadata.hash) : 'no-hash',
        takenAt: media.takenAt
      }))
    });

    for (const media of yearData.media) {
      const mediaHash = media.metadata?.hash;
      if (mediaHash) {
        duplicateLogger.debug('Comparing hashes', {
          targetHash: maskHash(hash),
          mediaHash: maskHash(mediaHash),
          filename: media.originalFilename
        });
        
        if (mediaHash === hash) {
          const existingMedia = { ...media };
          duplicateLogger.info('Duplicate found', {
            filename: existingMedia.originalFilename,
            id: existingMedia.id,
            year
          });
          return {
            isDuplicate: true,
            existingMedia,
            hash,
          };
        }
      }
    }

    duplicateLogger.debug('No matching hash found in year database', { year });
    return { isDuplicate: false, hash };
  } catch (error) {
    duplicateLogger.error('Error reading year database', { 
      year, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return { isDuplicate: false, hash };
  }
}

/**
 * Find potential duplicates based on similar characteristics
 */
export async function findSimilarMedia(
  metadata: Partial<MediaMetadata>,
  searchYears: number[] = []
): Promise<MediaMetadata[]> {
  const similarMedia: MediaMetadata[] = [];
  
      try {
      duplicateLogger.debug('Finding similar media', { 
        filename: metadata.originalFilename,
        searchYears: searchYears.length > 0 ? searchYears : 'all_years'
      });

      const years = searchYears.length > 0 ? searchYears : 
        [new Date().getFullYear(), new Date().getFullYear() - 1];
    
    for (const year of years) {
      const yearSimilar = await findSimilarInYear(metadata, year);
      similarMedia.push(...yearSimilar);
    }
    
    return similarMedia;
    
      } catch (error) {
      duplicateLogger.error('Error finding similar media', { error: error instanceof Error ? error.message : 'Unknown error' });
      return [];
    }
}

/**
 * Find similar media within a specific year
 */
async function findSimilarInYear(
  metadata: Partial<MediaMetadata>,
  year: number
): Promise<MediaMetadata[]> {
  try {
    const jsonPath = getMetadataJsonPath(new Date(year, 0, 1));
    const yearData = await readJsonFile(jsonPath);
    
    if (!yearData || !yearData.media || !Array.isArray(yearData.media)) {
      return [];
    }
    
    const similar: MediaMetadata[] = [];
    
    for (const existingMedia of yearData.media) {
      const similarity = calculateSimilarity(metadata, existingMedia);
      
      // Consider similar if similarity score is above threshold
      if (similarity > 0.7) {
        similar.push(existingMedia);
      }
    }
    
    return similar;
    
      } catch (error) {
      duplicateLogger.warn(`No metadata file for year ${year} or error reading`, { 
        year, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return [];
    }
}

/**
 * Calculate similarity score between two media items
 */
function calculateSimilarity(
  media1: Partial<MediaMetadata>,
  media2: MediaMetadata
): number {
  let score = 0;
  let totalChecks = 0;
  
  // Check filename similarity
  if (media1.originalFilename && media2.originalFilename) {
    const name1 = media1.originalFilename.toLowerCase();
    const name2 = media2.originalFilename.toLowerCase();
    
    if (name1 === name2) {
      score += 0.3;
    } else if (name1.includes(name2.substring(0, Math.min(10, name2.length))) ||
               name2.includes(name1.substring(0, Math.min(10, name1.length)))) {
      score += 0.1;
    }
    totalChecks += 0.3;
  }
  
  // Check file size similarity (within 5% difference)
  if (media1.metadata?.size && media2.metadata?.size) {
    const sizeDiff = Math.abs(media1.metadata.size - media2.metadata.size);
    const avgSize = (media1.metadata.size + media2.metadata.size) / 2;
    const sizeRatio = sizeDiff / avgSize;
    
    if (sizeRatio < 0.05) {
      score += 0.2;
    } else if (sizeRatio < 0.1) {
      score += 0.1;
    }
    totalChecks += 0.2;
  }
  
  // Check dimensions similarity
  if (media1.metadata?.width && media1.metadata?.height &&
      media2.metadata?.width && media2.metadata?.height) {
    
    const width1 = media1.metadata.width;
    const height1 = media1.metadata.height;
    const width2 = media2.metadata.width;
    const height2 = media2.metadata.height;
    
    if (width1 === width2 && height1 === height2) {
      score += 0.2;
    } else {
      const aspectRatio1 = width1 / height1;
      const aspectRatio2 = width2 / height2;
      
      if (Math.abs(aspectRatio1 - aspectRatio2) < 0.1) {
        score += 0.1;
      }
    }
    totalChecks += 0.2;
  }
  
  // Check date similarity (within 1 day)
  if (media1.takenAt && media2.takenAt) {
    const date1 = new Date(media1.takenAt);
    const date2 = new Date(media2.takenAt);
    const timeDiff = Math.abs(date1.getTime() - date2.getTime());
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    if (timeDiff < oneDayMs) {
      score += 0.2;
    } else if (timeDiff < oneDayMs * 7) {
      score += 0.1;
    }
    totalChecks += 0.2;
  }
  
  // Check camera similarity
  if (media1.metadata?.camera && media2.metadata?.camera) {
    if (media1.metadata.camera === media2.metadata.camera) {
      score += 0.1;
    }
    totalChecks += 0.1;
  }
  
  // Return normalized score
  return totalChecks > 0 ? score / totalChecks : 0;
}

/**
 * Remove a duplicate from the database
 */
export async function removeDuplicate(mediaId: string, year: number): Promise<boolean> {
  try {
    const jsonPath = getMetadataJsonPath(new Date(year, 0, 1));
    const yearData = await readJsonFile(jsonPath);
    
    if (!yearData || !yearData.media || !Array.isArray(yearData.media)) {
      return false;
    }
    
    // Find and remove the duplicate
    const initialLength = yearData.media.length;
    yearData.media = yearData.media.filter((media: MediaMetadata) => media.id !== mediaId);
    
    // Save updated data if something was removed
    if (yearData.media.length < initialLength) {
      // This would need to use writeJsonFile, but we'll implement that later
      duplicateLogger.info(`Would remove duplicate media (dry run)`, { mediaId, year });
      return true;
    }
    
    return false;
    
  } catch (error) {
    duplicateLogger.error('Error removing duplicate', { 
      mediaId, 
      year, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return false;
  }
}

/**
 * Get statistics about duplicates in the database
 */
export async function getDuplicateStats(years: number[] = []): Promise<{
  totalDuplicates: number;
  duplicatesByYear: Record<number, number>;
  duplicateGroups: Array<{
    hash: string;
    count: number;
    media: MediaMetadata[];
  }>;
}> {
  const stats = {
    totalDuplicates: 0,
    duplicatesByYear: {} as Record<number, number>,
    duplicateGroups: [] as Array<{
      hash: string;
      count: number;
      media: MediaMetadata[];
    }>,
  };
  
  try {
    const yearsToCheck = years.length > 0 ? years : 
      Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
    
    const hashGroups = new Map<string, MediaMetadata[]>();
    
    for (const year of yearsToCheck) {
      const jsonPath = getMetadataJsonPath(new Date(year, 0, 1));
      const yearData = await readJsonFile(jsonPath);
      
      if (!yearData || !yearData.media || !Array.isArray(yearData.media)) {
        continue;
      }
      
      for (const media of yearData.media) {
        if (media.metadata?.hash) {
          const hash = media.metadata.hash;
          
          if (!hashGroups.has(hash)) {
            hashGroups.set(hash, []);
          }
          
          hashGroups.get(hash)!.push(media);
        }
      }
    }
    
    // Find actual duplicate groups
    for (const [hash, mediaList] of hashGroups) {
      if (mediaList.length > 1) {
        stats.duplicateGroups.push({
          hash,
          count: mediaList.length,
          media: mediaList,
        });
        
        stats.totalDuplicates += mediaList.length - 1; // Count extras as duplicates
      }
    }
    
    return stats;
    
  } catch (error) {
    duplicateLogger.error('Error calculating duplicate stats', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return stats;
  }
}

/**
 * Batch check for duplicates across multiple files
 */
export async function batchCheckDuplicates(
  files: { hash: string; filename: string }[]
): Promise<Map<string, DuplicateCheckResult>> {
  const results = new Map<string, DuplicateCheckResult>();
  
  try {
    // Check each file for duplicates
    
    for (const file of files) {
      const result = await checkForDuplicate(file.hash, new Date());
      results.set(file.filename, result);
    }
    
    return results;
    
  } catch (error) {
    duplicateLogger.error('Error in batch duplicate check', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    // Return empty results for all files in case of error
    for (const file of files) {
      results.set(file.filename, { isDuplicate: false, hash: file.hash });
    }
    
    return results;
  }
} 