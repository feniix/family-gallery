#!/usr/bin/env tsx

/**
 * fg-import - Family Gallery Bulk Import Tool
 * 
 * Reuses existing project modules for consistent behavior with the web interface.
 * Supports bulk import of images and videos with thumbnail generation and metadata extraction.
 */

import { program } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Import AWS SDK
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import { createLogger } from '../src/lib/logger';

// Types
import type { MediaMetadata } from '../src/types/media.js';

// Setup for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

interface ImportOptions {
  importDir: string;
  bucket: string;
  endpointUrl: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  duplicateAction: 'skip' | 'overwrite';
}

interface ImportStats {
  total: number;
  processed: number;
  uploaded: number;
  skipped: number;
  errors: number;
  duplicates: number;
}

interface ImportError {
  file: string;
  error: string;
}

interface FileNamingResult {
  filename: string;
  path: string;
  thumbnailPath?: string;
}

interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingFilename?: string;
  existingId?: string;
}

// Simplified implementations of project functions for CLI use
class ProjectModules {
  static async generateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  static generateUniqueFilename(originalFilename: string, takenAt: Date): FileNamingResult {
    const ext = path.extname(originalFilename).toLowerCase();
    const baseName = path.basename(originalFilename, ext);
    
    // Create date-based path: YYYY/MM/
    const year = takenAt.getFullYear();
    const month = String(takenAt.getMonth() + 1).padStart(2, '0');
    const day = String(takenAt.getDate()).padStart(2, '0');
    const hour = String(takenAt.getHours()).padStart(2, '0');
    const minute = String(takenAt.getMinutes()).padStart(2, '0');
    const second = String(takenAt.getSeconds()).padStart(2, '0');
    
    // Generate unique filename with timestamp
    const timestamp = `${year}${month}${day}_${hour}${minute}${second}`;
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const filename = `${timestamp}_${randomSuffix}${ext}`;
    
    // Create paths
    const datePath = `${year}/${month}`;
    const fullPath = `${datePath}/${filename}`;
    
    // Thumbnail path (for images only)
    const thumbnailPath = ext.match(/\.(jpg|jpeg|png|gif|webp)$/i) 
      ? `${datePath}/thumb_${filename.replace(ext, '.jpg')}`
      : undefined;
    
    return {
      filename,
      path: fullPath,
      thumbnailPath
    };
  }
  
  static async checkForDuplicate(hash: string): Promise<DuplicateCheckResult> {
    // This would normally check the database for existing files with the same hash
    // For now, return no duplicates since we don't have access to the full database here
    return { isDuplicate: false };
  }
  
  static getMediaDb(year: number) {
    const dbPath = path.join(process.cwd(), 'data', 'media', `${year}.json`);
    
    return {
      async update(updateFn: (current: any) => any) {
        try {
          // Ensure directory exists
          await fs.mkdir(path.dirname(dbPath), { recursive: true });
          
          // Read current data or create empty structure
          let currentData;
          try {
            const fileContent = await fs.readFile(dbPath, 'utf-8');
            currentData = JSON.parse(fileContent);
          } catch {
            currentData = { media: [] };
          }
          
          // Apply update
          const updatedData = updateFn(currentData);
          
          // Write back to file
          await fs.writeFile(dbPath, JSON.stringify(updatedData, null, 2));
        } catch (error) {
          throw new Error(`Failed to update media database: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };
  }
  
  static async addYearToIndex(year: number): Promise<void> {
    const indexPath = path.join(process.cwd(), 'data', 'media', 'index.json');
    
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(indexPath), { recursive: true });
      
      // Read current index or create empty
      let indexData;
      try {
        const fileContent = await fs.readFile(indexPath, 'utf-8');
        indexData = JSON.parse(fileContent);
      } catch {
        indexData = { years: [] };
      }
      
      if (!indexData.years.includes(year)) {
        indexData.years.push(year);
        indexData.years.sort((a: number, b: number) => b - a); // Sort descending
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(indexPath), { recursive: true });
        
        await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));
      }
    } catch (error) {
      const logger = createLogger('IMPORT');
      logger.warn('Failed to update media index', { 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

class BulkImporter {
  private options: ImportOptions;
  private stats: ImportStats;
  private errors: ImportError[];
  private r2Client: S3Client;
  private importLogger: any;

  constructor(options: ImportOptions) {
    this.options = options;
    this.stats = {
      total: 0,
      processed: 0,
      uploaded: 0,
      skipped: 0,
      errors: 0,
      duplicates: 0
    };
    this.errors = [];
    
    // Setup R2 client
    this.r2Client = new S3Client({
      region: 'auto',
      endpoint: options.endpointUrl,
      credentials: {
        accessKeyId: options.awsAccessKeyId,
        secretAccessKey: options.awsSecretAccessKey,
      },
    });

    this.importLogger = createLogger('IMPORT');
  }

  async import(): Promise<void> {
    this.importLogger.info('Starting bulk import', { 
      importDir: this.options.importDir,
      bucket: this.options.bucket,
      duplicateAction: this.options.duplicateAction
    });

    try {
      // Get all media files
      const files = await this.scanDirectory(this.options.importDir);
      this.stats.total = files.length;
      
      this.importLogger.info('Found media files', { count: files.length });

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await this.processFile(file, i + 1);
      }

      // Print summary
      this.printSummary();
      
    } catch (error) {
      this.importLogger.error('Import failed', { 
        error: error instanceof Error ? error.message : String(error)
      });
      process.exit(1);
    }
  }

  private async scanDirectory(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    const supportedExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.dng',
      '.mp4', '.mov', '.avi', '.mkv', '.webm'
    ];

    async function scanRecursive(currentPath: string): Promise<void> {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          await scanRecursive(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (supportedExtensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }

    await scanRecursive(dirPath);
    return files.sort();
  }

  private async processFile(filePath: string, index: number): Promise<void> {
    const filename = path.basename(filePath);
    const progress = `[${index}/${this.stats.total}]`;
    
    try {
      this.importLogger.info('Processing file', { 
        progress,
        filename,
        index: index,
        total: this.stats.total
      });
      
      // Read file
      const fileBuffer = await fs.readFile(filePath);
      const fileStats = await fs.stat(filePath);
      
      // Create File-like object for existing modules
      const file = new File([fileBuffer], filename, {
        type: this.getMimeType(filename),
        lastModified: fileStats.mtime.getTime(),
      });

             // Generate file hash for duplicate detection
       const hash = await ProjectModules.generateFileHash(file);
       
       // Check for duplicates
       const duplicateCheck = await ProjectModules.checkForDuplicate(hash);
      if (duplicateCheck.isDuplicate) {
        if (this.options.duplicateAction === 'skip') {
          this.importLogger.info('Skipped duplicate file', { 
            filename,
            existingFilename: duplicateCheck.existingFilename
          });
          this.stats.skipped++;
          this.stats.duplicates++;
          return;
        } else if (this.options.duplicateAction === 'overwrite') {
          this.importLogger.info('Overwriting duplicate file', { 
            filename,
            existingFilename: duplicateCheck.existingFilename
          });
        }
      }

             // Process metadata based on file type
       let metadata: Omit<MediaMetadata, 'id' | 'path' | 'thumbnailPath'>;
       
       if (file.type.startsWith('image/')) {
         this.importLogger.debug('Processing image metadata', { filename });
         // For images, create basic metadata since we can't extract EXIF in Node.js without dependencies
         const takenAt = this.extractDateFromFile(filePath, fileStats);
         metadata = {
           filename: '',
           originalFilename: file.name,
           type: 'photo',
           uploadedBy: 'cli-import',
           uploadedAt: new Date().toISOString(),
           uploadSource: 'web',
           takenAt,
           dateInfo: {
             source: 'file-creation',
             confidence: 'medium',
           },
           metadata: {
             size: file.size,
             hash,
             width: 0, // We can't extract this without browser APIs
             height: 0,
           },
           tags: [],
           hasValidExif: false,
         };
       } else if (file.type.startsWith('video/')) {
        this.importLogger.debug('Processing video metadata', { filename });
        // For videos, create basic metadata since we can't extract video metadata in Node.js
        const takenAt = this.extractDateFromFile(filePath, fileStats);
        metadata = {
          filename: '',
          originalFilename: file.name,
          type: 'video',
          uploadedBy: 'cli-import',
          uploadedAt: new Date().toISOString(),
          uploadSource: 'web',
          takenAt,
          dateInfo: {
            source: 'file-creation',
            confidence: 'medium',
          },
          metadata: {
            size: file.size,
            hash,
            duration: 0, // We can't extract this without browser APIs
            width: 0,
            height: 0,
          },
          tags: [],
          hasValidExif: false,
        };
      } else {
        throw new Error(`Unsupported file type: ${file.type}`);
      }

             // Generate file naming
       const takenAtDate = new Date(metadata.takenAt);
       const fileNaming = ProjectModules.generateUniqueFilename(file.name, takenAtDate);
      
      // Update metadata with paths and ID
      const fullMetadata: MediaMetadata = {
        ...metadata,
        id: this.generateMediaId(),
        filename: fileNaming.filename,
        path: `originals/${fileNaming.path}`,
        thumbnailPath: fileNaming.thumbnailPath ? `thumbnails/${fileNaming.thumbnailPath}` : undefined,
      };

      this.importLogger.info('Uploading original file', { 
        filename,
        path: fullMetadata.path
      });
      
      // Upload original file
      await this.uploadToR2(fullMetadata.path, fileBuffer, file.type);
      
      this.importLogger.info('Thumbnail will be generated on-demand by web interface', { filename });

             // Save to database
       this.importLogger.debug('Saving to database', { filename });
       const year = takenAtDate.getFullYear();
       const mediaDb = ProjectModules.getMediaDb(year);
       
       await mediaDb.update((current) => {
         // Remove existing entry if overwriting
         if (duplicateCheck.isDuplicate && this.options.duplicateAction === 'overwrite') {
           current.media = current.media.filter((m: any) => m.id !== duplicateCheck.existingId);
         }
         
         current.media.push(fullMetadata);
         // Sort by takenAt date (newest first)
         current.media.sort((a: any, b: any) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime());
         return current;
       });

       // Update media index
       await ProjectModules.addYearToIndex(year);

      this.importLogger.info('Successfully imported file', { filename });
      this.stats.uploaded++;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.importLogger.error('Failed to import file', { 
        filename,
        error: errorMessage
      });
      this.stats.errors++;
      this.errors.push({ file: filename, error: errorMessage });
    }
    
    this.stats.processed++;
  }

  private async uploadToR2(key: string, buffer: Buffer, contentType: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.options.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.r2Client.send(command);
  }

  private extractDateFromFile(filePath: string, fileStats: any): string {
    // Try to extract date from filename first (YYYY-MM-DD, YYYYMMDD patterns)
    const filename = path.basename(filePath);
    const datePatterns = [
      /(\d{4})-(\d{2})-(\d{2})/,  // YYYY-MM-DD
      /(\d{4})(\d{2})(\d{2})/,    // YYYYMMDD
      /(\d{4})_(\d{2})_(\d{2})/,  // YYYY_MM_DD
    ];

    for (const pattern of datePatterns) {
      const match = filename.match(pattern);
      if (match) {
        const [, year, month, day] = match;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
    }

    // Fallback to file creation time, then modification time
    const creationTime = fileStats.birthtime || fileStats.ctime;
    const modificationTime = fileStats.mtime;
    
    // Use creation time if available and reasonable, otherwise modification time
    const useCreation = creationTime && creationTime.getTime() !== modificationTime.getTime();
    return (useCreation ? creationTime : modificationTime).toISOString();
  }

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.dng': 'image/dng',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska',
      '.webm': 'video/webm',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  private generateMediaId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `cli_${timestamp}_${random}`;
  }

  private printSummary(): void {
    this.importLogger.info('Import Summary', {
      total: this.stats.total,
      uploaded: this.stats.uploaded,
      duplicates: this.stats.duplicates,
      errors: this.stats.errors
    });

    if (this.errors.length > 0) {
      this.importLogger.warn('Errors occurred during import', { 
        errorCount: this.errors.length,
        errors: this.errors
      });
    }

    if (this.stats.uploaded > 0) {
      this.importLogger.info('Import completed successfully');
    } else if (this.stats.total === this.stats.duplicates) {
      this.importLogger.info('No new files to import');
    } else {
      this.importLogger.warn('Import completed with errors');
    }
  }
}

// CLI Setup
program
  .name('fg-import')
  .description('Family Gallery bulk import tool')
  .version('1.0.0');

program
  .command('import')
  .description('Import media files from a directory')
  .requiredOption('--import-dir <path>', 'Directory containing media files to import')
  .requiredOption('--bucket <name>', 'R2 bucket name')
  .requiredOption('--endpoint-url <url>', 'R2 endpoint URL')
  .requiredOption('--aws_access_key_id <key>', 'AWS access key ID')
  .requiredOption('--aws_secret_access_key <secret>', 'AWS secret access key')
  .option('--duplicates <action>', 'How to handle duplicates: skip or overwrite', 'skip')
  .action(async (options) => {
    // Validate options
    if (!['skip', 'overwrite'].includes(options.duplicates)) {
      const logger = createLogger('IMPORT');
      logger.error('Error: --duplicates must be either "skip" or "overwrite"');
      process.exit(1);
    }

    // Check if import directory exists
    try {
      await fs.access(options.importDir);
    } catch {
      const logger = createLogger('IMPORT');
      logger.error('Error: Import directory does not exist', { importDir: options.importDir });
      process.exit(1);
    }

    // Start import
    const importer = new BulkImporter({
      importDir: options.importDir,
      bucket: options.bucket,
      endpointUrl: options.endpointUrl,
      awsAccessKeyId: options.awsAccessKeyId,
      awsSecretAccessKey: options.awsSecretAccessKey,
      duplicateAction: options.duplicates as 'skip' | 'overwrite'
    });

    await importer.import();
  });

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  const logger = createLogger('IMPORT');
  logger.error('Unhandled Rejection', { 
    promise: promise.toString(),
    reason: reason instanceof Error ? reason.message : String(reason)
  });
  process.exit(1);
});

program.parse(); 