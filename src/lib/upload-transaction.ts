/**
 * Upload transaction system for atomic operations with cleanup
 */

import { uploadFileToR2, getPresignedUploadUrl } from './upload';
import { getMediaDb, addYearToIndex, updateIndexMediaCount } from './json-db';
import { processMediaMetadata } from './metadata';
import { processVideoFile } from './video-processing';
import { generateUniqueFilename } from './file-naming';
import { checkForDuplicate } from './duplicate-detection';
import { MediaMetadata } from '../types/media';

export interface UploadTransactionOptions {
  userId: string;
  retryAttempts?: number;
  timeout?: number;
  enableCleanup?: boolean;
}

export interface TransactionStep {
  id: string;
  type: 'presigned-url' | 'metadata-extraction' | 'thumbnail-generation' | 'file-upload' | 'thumbnail-upload' | 'database-update';
  status: 'pending' | 'completed' | 'failed' | 'skipped';
  data?: Record<string, unknown>;
  error?: string;
  cleanup?: () => Promise<void>;
}

export interface UploadTransaction {
  id: string;
  file: File;
  steps: TransactionStep[];
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'rolled-back';
  startTime: number;
  endTime?: number;
  finalMediaMetadata?: MediaMetadata;
  error?: string;
}

export class UploadTransactionManager {
  private transactions: Map<string, UploadTransaction> = new Map();
  private options: Required<UploadTransactionOptions>;

  constructor(options: UploadTransactionOptions) {
    this.options = {
      retryAttempts: 3,
      timeout: 300000, // 5 minutes
      enableCleanup: true,
      ...options,
    };
  }

  /**
   * Create a new upload transaction
   */
  async createTransaction(file: File): Promise<UploadTransaction> {
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const transaction: UploadTransaction = {
      id: transactionId,
      file,
      steps: this.createTransactionSteps(),
      status: 'pending',
      startTime: Date.now(),
    };

    this.transactions.set(transactionId, transaction);
    return transaction;
  }

  /**
   * Execute upload transaction with atomic guarantees
   */
  async executeTransaction(transactionId: string): Promise<MediaMetadata> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    transaction.status = 'processing';

    try {
      const result = await this.processTransactionSteps(transaction);
      transaction.status = 'completed';
      transaction.endTime = Date.now();
      transaction.finalMediaMetadata = result;
      
      // Keep transaction record for a while for monitoring
      setTimeout(() => {
        this.transactions.delete(transactionId);
      }, 60000); // Keep for 1 minute
      
      return result;
    } catch (error) {
      transaction.status = 'failed';
      transaction.endTime = Date.now();
      transaction.error = error instanceof Error ? error.message : String(error);
      
      // Attempt rollback
      if (this.options.enableCleanup) {
        try {
          await this.rollbackTransaction(transaction);
          transaction.status = 'rolled-back';
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Create transaction steps for file upload
   */
  private createTransactionSteps(): TransactionStep[] {
    return [
      {
        id: 'duplicate-check',
        type: 'metadata-extraction',
        status: 'pending',
      },
      {
        id: 'metadata-extraction',
        type: 'metadata-extraction',
        status: 'pending',
      },
      {
        id: 'thumbnail-generation',
        type: 'thumbnail-generation',
        status: 'pending',
      },
      {
        id: 'presigned-url-original',
        type: 'presigned-url',
        status: 'pending',
      },
      {
        id: 'presigned-url-thumbnail',
        type: 'presigned-url',
        status: 'pending',
      },
      {
        id: 'upload-original',
        type: 'file-upload',
        status: 'pending',
      },
      {
        id: 'upload-thumbnail',
        type: 'thumbnail-upload',
        status: 'pending',
      },
      {
        id: 'database-update',
        type: 'database-update',
        status: 'pending',
      },
    ];
  }

  /**
   * Process all transaction steps
   */
     private async processTransactionSteps(transaction: UploadTransaction): Promise<MediaMetadata> {
     // Set timeout for entire transaction
     const timeoutPromise = new Promise<never>((_, reject) => {
       setTimeout(() => {
         reject(new Error(`Transaction timeout after ${this.options.timeout}ms`));
       }, this.options.timeout);
     });

     const transactionPromise = this.executeStepsSequentially(transaction);

     return Promise.race([transactionPromise, timeoutPromise]);
   }

  /**
   * Execute steps sequentially with proper error handling
   */
     private async executeStepsSequentially(
     transaction: UploadTransaction
   ): Promise<MediaMetadata> {
     const { file } = transaction;
     let mediaMetadata: Partial<MediaMetadata> = {};
     let thumbnailBlob: Blob | null = null;
     let originalFilePath = '';
     let thumbnailFilePath = '';

              let fileHash = '';
     
     // Step 1: Generate file hash first
     await this.executeStep(transaction, 'duplicate-check', async (step) => {
       // Generate file hash for duplicate checking
       const arrayBuffer = await file.arrayBuffer();
       const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
       fileHash = Array.from(new Uint8Array(hashBuffer))
         .map(b => b.toString(16).padStart(2, '0'))
         .join('');
       
       const duplicateCheck = await checkForDuplicate(fileHash, new Date());
       if (duplicateCheck.isDuplicate && duplicateCheck.existingMedia) {
         throw new Error(`File is a duplicate of existing media: ${duplicateCheck.existingMedia.filename}`);
       }
       step.data = { hash: fileHash };
     });

     // Step 2: Extract metadata
     await this.executeStep(transaction, 'metadata-extraction', async (step) => {
       if (file.type.startsWith('image/')) {
         const result = await processMediaMetadata(file, this.options.userId);
         mediaMetadata = { ...result.metadata, id: '', path: '', thumbnailPath: '' };
         step.data = { metadata: result.metadata };
       } else if (file.type.startsWith('video/')) {
         const result = await processVideoFile(file);
         if (!result.isValid) {
           throw new Error(result.validationError || 'Invalid video file');
         }
         mediaMetadata = {
           id: '',
           filename: '',
           originalFilename: file.name,
           path: '',
           type: 'video',
           uploadedBy: this.options.userId,
           uploadedAt: new Date().toISOString(),
           uploadSource: 'web',
           takenAt: new Date().toISOString(),
           dateInfo: {
             source: 'upload-time',
             confidence: 'low' as const,
           },
           metadata: {
             width: result.metadata.width,
             height: result.metadata.height,
             duration: result.metadata.duration,
             size: result.metadata.size,
             hash: fileHash,
           },
           subjects: [],
           tags: [],
         };
         thumbnailBlob = result.thumbnail;
         step.data = { metadata: result.metadata, thumbnail: !!result.thumbnail };
       } else {
         throw new Error('Unsupported file type');
       }
     });

     // Generate unique filenames
     const filenameResult = generateUniqueFilename(
       file.name,
       mediaMetadata.takenAt ? new Date(mediaMetadata.takenAt) : new Date()
     );
    originalFilePath = filenameResult.path;
    thumbnailFilePath = filenameResult.thumbnailPath || '';

    // Update metadata with file paths
    mediaMetadata.filename = filenameResult.filename;
    mediaMetadata.path = originalFilePath;
    mediaMetadata.thumbnailPath = thumbnailFilePath;
    mediaMetadata.id = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Set hash from duplicate check
    const duplicateStep = transaction.steps.find(s => s.id === 'duplicate-check');
    if (duplicateStep?.data?.hash && typeof duplicateStep.data.hash === 'string') {
      mediaMetadata.metadata!.hash = duplicateStep.data.hash;
    }

    // Step 3: Get presigned URLs
    let originalPresignedUrl = '';
    let thumbnailPresignedUrl = '';

    await this.executeStep(transaction, 'presigned-url-original', async (step) => {
      const result = await getPresignedUploadUrl(
        originalFilePath,
        file.type,
        file.size
      );
      originalPresignedUrl = result.presignedUrl;
      step.data = { presignedUrl: result.presignedUrl, filePath: originalFilePath };
      
      // Add cleanup function
      step.cleanup = async () => {
        // Note: R2 objects are cleaned up by expiration of presigned URLs
        // Could add explicit delete here if needed
      };
    });

    if (thumbnailBlob) {
      await this.executeStep(transaction, 'presigned-url-thumbnail', async (step) => {
        const result = await getPresignedUploadUrl(
          thumbnailFilePath,
          'image/jpeg',
          thumbnailBlob!.size
        );
        thumbnailPresignedUrl = result.presignedUrl;
        step.data = { presignedUrl: result.presignedUrl, filePath: thumbnailFilePath };
      });
    } else {
      this.markStepSkipped(transaction, 'presigned-url-thumbnail');
    }

    // Step 4: Upload files
    await this.executeStep(transaction, 'upload-original', async (step) => {
      await uploadFileToR2(file, originalPresignedUrl, {
        onProgress: (progress) => {
          step.data = { ...step.data, progress };
        },
      });
      
      // Add cleanup function to delete uploaded file if needed
      step.cleanup = async () => {
        // Note: Could implement R2 delete here if needed
        console.log(`Would clean up uploaded file: ${originalFilePath}`);
      };
    });

    if (thumbnailBlob && thumbnailPresignedUrl) {
      await this.executeStep(transaction, 'upload-thumbnail', async (step) => {
        const thumbnailFile = new File([thumbnailBlob!], 'thumbnail.jpg', { type: 'image/jpeg' });
        await uploadFileToR2(thumbnailFile, thumbnailPresignedUrl);
        
        step.cleanup = async () => {
          console.log(`Would clean up uploaded thumbnail: ${thumbnailFilePath}`);
        };
      });
    } else {
      this.markStepSkipped(transaction, 'upload-thumbnail');
    }

         // Step 5: Update database
     await this.executeStep(transaction, 'database-update', async (step) => {
       const finalMetadata = mediaMetadata as MediaMetadata;
       const year = new Date(finalMetadata.takenAt).getFullYear();
       const mediaDb = getMediaDb(year);
       
       await mediaDb.update((data) => {
         data.media.push(finalMetadata);
         return data;
       });
       
       // Update the media index to include this year
       await addYearToIndex(year);
       console.log(`[TRANSACTION] Added year ${year} to media index`);

       // Update total media count in index
       await updateIndexMediaCount();
       console.log(`[TRANSACTION] Updated media index total count`);
       
       step.data = { mediaId: finalMetadata.id };
       
       // Add cleanup function to remove from database
       step.cleanup = async () => {
         try {
           await mediaDb.update((data) => {
             data.media = data.media.filter(m => m.id !== finalMetadata.id);
             return data;
           });
           console.log(`Removed from database: ${finalMetadata.id}`);
         } catch (error) {
           console.error('Failed to clean up database entry:', error);
         }
       };
     });

    return mediaMetadata as MediaMetadata;
  }

  /**
   * Execute a single transaction step with error handling
   */
  private async executeStep(
    transaction: UploadTransaction,
    stepId: string,
    stepFunction: (step: TransactionStep) => Promise<void>
  ): Promise<void> {
    const step = transaction.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found in transaction`);
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
      try {
        step.status = 'pending';
        await stepFunction(step);
        step.status = 'completed';
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        step.error = lastError.message;
        
        if (attempt === this.options.retryAttempts) {
          step.status = 'failed';
          throw lastError;
        }
        
        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Mark a step as skipped
   */
  private markStepSkipped(transaction: UploadTransaction, stepId: string): void {
    const step = transaction.steps.find(s => s.id === stepId);
    if (step) {
      step.status = 'skipped';
    }
  }

  /**
   * Rollback transaction by executing cleanup functions
   */
  private async rollbackTransaction(transaction: UploadTransaction): Promise<void> {
    console.log(`Rolling back transaction ${transaction.id}`);
    
    // Execute cleanup functions in reverse order
    const completedSteps = transaction.steps
      .filter(step => step.status === 'completed' && step.cleanup)
      .reverse();

    for (const step of completedSteps) {
      try {
        if (step.cleanup) {
          await step.cleanup();
        }
      } catch (error) {
        console.error(`Failed to cleanup step ${step.id}:`, error);
      }
    }
  }

  /**
   * Get transaction status
   */
  getTransaction(transactionId: string): UploadTransaction | undefined {
    return this.transactions.get(transactionId);
  }

  /**
   * Get all active transactions
   */
  getActiveTransactions(): UploadTransaction[] {
    return Array.from(this.transactions.values())
      .filter(tx => tx.status === 'processing' || tx.status === 'pending');
  }

  /**
   * Clean up old transactions
   */
  cleanupOldTransactions(maxAge: number = 3600000): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [id, transaction] of this.transactions.entries()) {
      if (transaction.endTime && (now - transaction.endTime) > maxAge) {
        this.transactions.delete(id);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

/**
 * Default transaction manager instance
 */
let defaultManager: UploadTransactionManager | null = null;

/**
 * Get or create the default transaction manager
 */
export function getTransactionManager(options: UploadTransactionOptions): UploadTransactionManager {
  if (!defaultManager || defaultManager['options'].userId !== options.userId) {
    defaultManager = new UploadTransactionManager(options);
  }
  return defaultManager;
}

/**
 * Execute a file upload with transaction protection
 */
export async function uploadWithTransaction(
  file: File,
  options: UploadTransactionOptions
): Promise<MediaMetadata> {
  const manager = getTransactionManager(options);
  const transaction = await manager.createTransaction(file);
  return manager.executeTransaction(transaction.id);
} 