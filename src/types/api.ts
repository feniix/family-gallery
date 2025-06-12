/**
 * API Response Types
 * Standardized types for API responses across the application
 */

import { MediaMetadata } from './media';

/**
 * Base API response structure
 */
export interface BaseApiResponse {
  success: boolean;
  timestamp: string;
}

/**
 * Success response
 */
export interface ApiSuccessResponse<T = unknown> extends BaseApiResponse {
  success: true;
  data: T;
}

/**
 * Error response
 */
export interface ApiErrorResponse extends BaseApiResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Combined response type
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Upload related API responses
 */
export interface UploadPresignedResponse {
  presignedUrl: string;
  filePath: string;
  uploadId: string;
}

export interface DuplicateCheckResponse {
  isDuplicate: boolean;
  existingMedia?: MediaMetadata;
  hash: string;
}

export interface UploadCompleteResponse {
  mediaId: string;
  path: string;
  thumbnailPath?: string;
  metadata: MediaMetadata;
}

/**
 * Media related API responses
 */
export interface MediaListResponse {
  media: MediaMetadata[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

export interface MediaStatsResponse {
  totalMedia: number;
  totalPhotos: number;
  totalVideos: number;
  totalSize: number;
  mediaByYear: Record<string, number>;
  recentUploads: number;
}

/**
 * User related API responses
 */
export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'guest';
  status: 'approved' | 'pending' | 'denied';
  created: string;
  approvedBy?: string;
}

export interface UsersListResponse {
  users: UserInfo[];
  totalCount: number;
}

/**
 * Admin related API responses
 */
export interface AdminStatsResponse {
  users: {
    total: number;
    admins: number;
    approved: number;
    pending: number;
  };
  storage: {
    totalSize: number;
    totalFiles: number;
    averageFileSize: number;
  };
  activity: {
    uploadsToday: number;
    uploadsThisWeek: number;
    uploadsThisMonth: number;
  };
}

/**
 * Access control related responses
 */
export interface AccessControlResponse {
  hasAccess: boolean;
  permissions: string[];
  restrictions?: Record<string, unknown>;
}

/**
 * Branded types for better type safety
 */
export type MediaId = string & { readonly __brand: 'MediaId' };
export type UserId = string & { readonly __brand: 'UserId' };
export type TransactionId = string & { readonly __brand: 'TransactionId' };
export type HashString = string & { readonly __brand: 'HashString' };

/**
 * Type guards for branded types
 */
export function isMediaId(value: string): value is MediaId {
  return value.startsWith('media_');
}

export function isUserId(value: string): value is UserId {
  return value.startsWith('user_');
}

export function isTransactionId(value: string): value is TransactionId {
  return value.startsWith('tx_');
}

export function isHashString(value: string): value is HashString {
  return /^[a-f0-9]{64}$/i.test(value);
}

/**
 * Helper functions for creating typed responses
 */
export function createSuccessResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
}

export function createErrorResponse(
  error: string, 
  code?: string, 
  details?: Record<string, unknown>
): ApiErrorResponse {
  return {
    success: false,
    error,
    code,
    details,
    timestamp: new Date().toISOString()
  };
} 