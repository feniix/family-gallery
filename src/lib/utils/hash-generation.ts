/**
 * Shared hash generation utilities
 * Consolidates hash generation logic used across the application
 */

import CryptoJS from 'crypto-js';
import { uploadLogger } from '../logger';
import { randomUUID } from 'crypto';

/**
 * Generate SHA-256 hash of file content for duplicate detection
 */
export async function generateFileHash(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
    const hash = CryptoJS.SHA256(wordArray).toString();
    
    uploadLogger.debug('Generated file hash', { 
      filename: file.name, 
      hashPrefix: hash.substring(0, 16) + '...' 
    });
    return hash;
  } catch (error) {
    uploadLogger.error('Error generating file hash', { 
      filename: file.name, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    // Fallback: use file properties
    return CryptoJS.SHA256(`${file.name}_${file.size}_${file.lastModified}`).toString();
  }
}

/**
 * Generate SHA-256 hash using Web Crypto API (more efficient for server-side)
 */
export async function generateFileHashWebCrypto(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    uploadLogger.debug('Generated file hash (WebCrypto)', { 
      filename: file.name, 
      hashPrefix: hash.substring(0, 16) + '...' 
    });
    return hash;
  } catch (error) {
    uploadLogger.error('Error generating file hash with WebCrypto', { 
      filename: file.name, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    // Fallback to CryptoJS
    return generateFileHash(file);
  }
}

/**
 * Generate SHA-256 hash from ArrayBuffer
 */
export async function generateHashFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    uploadLogger.error('Error generating hash from ArrayBuffer', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    // Fallback to CryptoJS
    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
    return CryptoJS.SHA256(wordArray).toString();
  }
}

/**
 * Generate a unique ID for media items
 */
export function generateMediaId(): string {
  try {
    return `media_${Date.now()}_${randomUUID().replace(/-/g, '')}`;
  } catch {
    // Fallback if randomUUID is not available
    return `media_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }
}

/**
 * Generate a unique transaction ID
 */
export function generateTransactionId(): string {
  try {
    return `tx_${Date.now()}_${randomUUID().replace(/-/g, '')}`;
  } catch {
    // Fallback if randomUUID is not available
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }
}

/**
 * Mask hash for logging (security)
 */
export function maskHash(hash: string, visibleChars: number = 16): string {
  if (!hash || hash.length <= visibleChars) return hash;
  return hash.substring(0, visibleChars) + '...';
}

/**
 * Validate hash format
 */
export function isValidHash(hash: string): boolean {
  // SHA-256 hashes are 64 characters long and contain only hex characters
  return /^[a-f0-9]{64}$/i.test(hash);
}

/**
 * Compare two hashes safely
 */
export function compareHashes(hash1: string, hash2: string): boolean {
  return hash1 === hash2;
} 