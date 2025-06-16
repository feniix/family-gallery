/**
 * Standardized error handling utilities
 * Provides consistent error handling patterns across the application
 */

import { uploadLogger } from '../logger';

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Authentication related errors
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context?: Record<string, unknown>) {
    super(message, 'AUTH_REQUIRED', 401, context);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization related errors
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', context?: Record<string, unknown>) {
    super(message, 'INSUFFICIENT_PERMISSIONS', 403, context);
    this.name = 'AuthorizationError';
  }
}

/**
 * File validation errors
 */
export class FileValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'FILE_VALIDATION_ERROR', 400, context);
    this.name = 'FileValidationError';
  }
}

/**
 * Duplicate detection errors
 */
export class DuplicateError extends AppError {
  constructor(message: string, public existingMedia?: unknown, context?: Record<string, unknown>) {
    super(message, 'DUPLICATE_DETECTED', 409, context);
    this.name = 'DuplicateError';
  }
}

/**
 * Upload related errors
 */
export class UploadError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'UPLOAD_ERROR', 500, context);
    this.name = 'UploadError';
  }
}

/**
 * Database related errors
 */
export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'DATABASE_ERROR', 500, context);
    this.name = 'DatabaseError';
  }
}

/**
 * External service errors (R2, Clerk, etc.)
 */
export class ExternalServiceError extends AppError {
  constructor(
    message: string, 
    public service: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, context);
    this.name = 'ExternalServiceError';
  }
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = AppError> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Create a success result
 */
export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Create an error result
 */
export function failure<E extends AppError>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Safely execute an async operation and return a Result
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  errorHandler?: (error: unknown) => AppError
): Promise<Result<T>> {
  try {
    const data = await operation();
    return success(data);
  } catch (error) {
    const appError = errorHandler ? errorHandler(error) : createAppErrorFromUnknown(error);
    return failure(appError);
  }
}

/**
 * Safely execute a sync operation and return a Result
 */
export function safeSync<T>(
  operation: () => T,
  errorHandler?: (error: unknown) => AppError
): Result<T> {
  try {
    const data = operation();
    return success(data);
  } catch (error) {
    const appError = errorHandler ? errorHandler(error) : createAppErrorFromUnknown(error);
    return failure(appError);
  }
}

/**
 * Convert unknown error to AppError
 */
export function createAppErrorFromUnknown(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR', 500, {
      originalName: error.name,
      stack: error.stack
    });
  }
  
  return new AppError(
    typeof error === 'string' ? error : 'An unknown error occurred',
    'UNKNOWN_ERROR',
    500,
    { originalError: error }
  );
}

/**
 * Log error with appropriate level based on error type
 */
export function logError(error: AppError, context?: Record<string, unknown>): void {
  const logContext = {
    code: error.code,
    statusCode: error.statusCode,
    context: error.context,
    ...context
  };

  if (error.statusCode >= 500) {
    uploadLogger.error(error.message, logContext);
  } else if (error.statusCode >= 400) {
    uploadLogger.warn(error.message, logContext);
  } else {
    uploadLogger.info(error.message, logContext);
  }
}

/**
 * Handle errors consistently in API routes
 */
export function handleApiError(error: unknown): { error: string; statusCode: number } {
  const appError = createAppErrorFromUnknown(error);
  logError(appError);
  
  return {
    error: appError.message,
    statusCode: appError.statusCode
  };
}

/**
 * Configuration errors
 */
class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Validate required environment variables
 */
export function validateRequiredEnvVars(vars: string[]): void {
  const missing = vars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new ConfigurationError(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

/**
 * Retry an operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      uploadLogger.debug('Retrying operation', { 
        attempt, 
        maxAttempts, 
        delay,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw createAppErrorFromUnknown(lastError);
} 